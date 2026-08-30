"use server";

import { BlendStatus, BlendType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import {
  generateInviteCode,
  getBlendByCode,
  isParticipant,
  PAIR_CAPACITY,
} from "@/lib/blend";
import { computeBlendAnalysis } from "@/lib/blend-algo";
import { randomBlendName } from "@/lib/blend-name";
import {
  coverStyleOrDefault,
  isCoverStyle,
  nextCoverStyle,
} from "@/lib/cover-styles";
import { isPackId, nextPack, resolvePack } from "@/lib/packs";
import {
  addPlaylistTracks,
  createPlaylist,
  setPlaylistDetails,
  setPlaylistImage,
  SpotifyAuthError,
} from "@/lib/spotify";
import type { StoredBlendAnalysis } from "@/lib/blend-algo";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTasteSnapshot, readStoredSnapshot } from "@/lib/taste";
import { ensureUser } from "@/lib/user";

export async function connectSpotify() {
  await signIn("spotify", { redirectTo: "/start" });
}

export async function disconnect() {
  await signOut({ redirectTo: "/" });
}

export async function refreshTaste() {
  const session = await auth();
  if (!session?.user || session.error || !session.accessToken) return;

  const userId = await ensureUser(session);
  if (!userId) return;

  try {
    await getTasteSnapshot({
      userId,
      accessToken: session.accessToken,
      force: true,
    });
  } catch {
    // leave the last good snapshot in place
  }
  revalidatePath("/start");
}

/** Origin for internal self-calls (the /api/cover route). Prefers AUTH_URL,
 *  falls back to Vercel's per-deploy URL, then localhost for dev. */
function selfOrigin(): string {
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://127.0.0.1:3000";
}

/** Rasterise the designed cover via the /api/cover route (kept out of the
 *  "use server" import graph because it pulls in react-dom/server). Returns
 *  base64 JPEG or null. */
async function renderCoverBase64(params: {
  style: string | null;
  pack: string | null;
  name: string;
  score: number;
  covers: string[];
}): Promise<string | null> {
  const base = selfOrigin();
  try {
    const res = await fetch(`${base}/api/cover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch (err) {
    console.error("[renderCoverBase64]", err);
    return null;
  }
}

/** Best-effort: make sure this user has a cached taste snapshot. */
async function warmSnapshot(userId: string, accessToken?: string) {
  if (!accessToken) return;
  try {
    await getTasteSnapshot({ userId, accessToken });
  } catch {
    // a blend can still form; the snapshot refreshes later
  }
}

export async function createPairBlend() {
  const session = await auth();
  if (!session?.user || session.error) redirect("/");
  const userId = await ensureUser(session);
  if (!userId) redirect("/start");

  await warmSnapshot(userId, session.accessToken);

  const blend = await prisma.blend.create({
    data: {
      type: BlendType.pair,
      status: BlendStatus.pending,
      inviteCode: generateInviteCode(),
      participants: { create: { userId, isOwner: true } },
    },
  });

  redirect(`/blend/${blend.inviteCode}`);
}

export async function joinPairBlend(code: string) {
  const session = await auth();
  if (!session?.user || session.error) redirect("/");
  const userId = await ensureUser(session);
  if (!userId) redirect("/start");

  const blend = await getBlendByCode(code);
  if (!blend) redirect("/start");

  if (!isParticipant(blend, userId)) {
    if (blend.participants.length >= PAIR_CAPACITY) {
      redirect(`/blend/${code}`); // full — just show the room
    }
    await warmSnapshot(userId, session.accessToken);
    try {
      await prisma.blendParticipant.create({
        data: { blendId: blend.id, userId, isOwner: false },
      });
    } catch {
      // unique [blendId, userId] — already joined in a race; fine
    }
    const count = await prisma.blendParticipant.count({
      where: { blendId: blend.id },
    });
    if (count >= PAIR_CAPACITY) {
      await prisma.blend.update({
        where: { id: blend.id },
        data: { status: BlendStatus.ready },
      });
    }
  }

  revalidatePath(`/blend/${code}`);
  redirect(`/blend/${code}`);
}

export async function generateBlend(code: string) {
  const session = await auth();
  if (!session?.user || session.error) redirect("/");
  const meId = await ensureUser(session);
  if (!meId) redirect("/start");

  const blend = await getBlendByCode(code);
  if (!blend || !isParticipant(blend, meId)) redirect("/start");
  if (blend.participants.length < PAIR_CAPACITY) {
    redirect(`/blend/${code}`); // not everyone's in yet
  }

  // Make sure my own snapshot is current; the other person's must already
  // be on file (warmed when they joined) — we don't hold their token.
  if (session.accessToken) {
    try {
      await getTasteSnapshot({ userId: meId, accessToken: session.accessToken });
    } catch {
      /* fall through to whatever's stored */
    }
  }

  const ordered = [...blend.participants].sort((a, b) =>
    a.isOwner === b.isOwner ? 0 : a.isOwner ? -1 : 1,
  );
  const [pa, pb] = ordered;
  const [snapA, snapB] = await Promise.all([
    readStoredSnapshot(pa.userId),
    readStoredSnapshot(pb.userId),
  ]);

  if (!snapA || !snapB) {
    const missing = !snapA ? pa : pb;
    const who = missing.userId === meId ? "you" : (missing.user.name ?? "your friend");
    redirect(`/blend/${code}?err=snapshot&who=${encodeURIComponent(who)}`);
  }

  const thin = [
    { p: pa, s: snapA },
    { p: pb, s: snapB },
  ].find(({ s }) => s.topTracks.length < 8 || s.topArtists.length < 3);
  if (thin) {
    const who = thin.p.userId === meId ? "you" : (thin.p.user.name ?? "your friend");
    redirect(`/blend/${code}?err=thin&who=${encodeURIComponent(who)}`);
  }

  const result = computeBlendAnalysis(
    pa.user.name ?? "Player 1",
    snapA,
    pb.user.name ?? "Player 2",
    snapB,
  );

  const { tracks, compatibility, ...stored } = result;
  const pack = blend.pack ?? resolvePack(stored, compatibility);

  await prisma.$transaction([
    prisma.blendTrack.deleteMany({ where: { blendId: blend.id } }),
    prisma.blendTrack.createMany({
      data: tracks.map((t) => ({
        blendId: blend.id,
        spotifyTrackId: t.spotifyTrackId,
        name: t.name,
        artists: t.artists,
        matchReason: t.matchReason,
        vibe: t.vibe,
        lean: t.lean,
        albumArt: t.albumArt || null,
        position: t.position,
      })),
    }),
    prisma.blend.update({
      where: { id: blend.id },
      data: {
        status: BlendStatus.generated,
        compatibility,
        generatedName: blend.generatedName ?? randomBlendName(),
        analysis: stored as unknown as Prisma.InputJsonValue,
        pack,
        coverStyle: coverStyleOrDefault(blend.coverStyle),
      },
    }),
  ]);

  revalidatePath(`/blend/${code}`);
  redirect(`/blend/${code}`);
}

async function participantBlend(code: string) {
  const session = await auth();
  if (!session?.user || session.error) return null;
  const meId = await ensureUser(session);
  if (!meId) return null;
  const blend = await getBlendByCode(code);
  if (!blend || !isParticipant(blend, meId)) return null;
  return blend;
}

/** Cycle the album-aesthetic theme (🎲 on the reveal). */
export async function rerollBlendPack(code: string) {
  const blend = await participantBlend(code);
  if (!blend) return;
  await prisma.blend.update({
    where: { id: blend.id },
    data: { pack: nextPack(blend.pack) },
  });
  revalidatePath(`/blend/${code}`);
}

/** Pick a specific theme pack from the gallery. */
export async function setBlendPack(code: string, pack: string) {
  if (!isPackId(pack)) return;
  const blend = await participantBlend(code);
  if (!blend) return;
  await prisma.blend.update({
    where: { id: blend.id },
    data: { pack },
  });
  revalidatePath(`/blend/${code}`);
}

/** Cycle the cover composition. */
export async function rerollCoverStyle(code: string) {
  const blend = await participantBlend(code);
  if (!blend) return;
  await prisma.blend.update({
    where: { id: blend.id },
    data: { coverStyle: nextCoverStyle(blend.coverStyle) },
  });
  revalidatePath(`/blend/${code}`);
}

/** Pick a specific cover composition from the gallery. */
export async function setCoverStyle(code: string, style: string) {
  if (!isCoverStyle(style)) return;
  const blend = await participantBlend(code);
  if (!blend) return;
  await prisma.blend.update({
    where: { id: blend.id },
    data: { coverStyle: style },
  });
  revalidatePath(`/blend/${code}`);
}

export async function pushBlend(code: string) {
  const session = await auth();
  if (!session?.user || session.error) redirect("/");
  if (!session.accessToken) redirect(`/blend/${code}?err=push`);
  // Spotify won't create playlists without these — and older sign-ins may
  // not have granted them. Force a reconnect instead of a 403.
  if (!session.scope?.includes("playlist-modify")) {
    redirect(`/blend/${code}?err=scope`);
  }
  const meId = await ensureUser(session);
  if (!meId) redirect("/start");

  const blend = await getBlendByCode(code);
  if (!blend || !isParticipant(blend, meId)) redirect("/start");
  if (blend.status !== "generated" && blend.status !== "pushed") {
    redirect(`/blend/${code}`);
  }
  if (blend.spotifyPlaylistId) {
    redirect(`/blend/${code}?saved=1`);
  }
  if (blend.tracks.length === 0) redirect(`/blend/${code}`);

  const names = blend.participants.map((p) => p.user.name ?? "Someone");
  const uris = blend.tracks
    .filter((t) => /^[A-Za-z0-9]{22}$/.test(t.spotifyTrackId))
    .map((t) => `spotify:track:${t.spotifyTrackId}`);

  const displayName = blend.generatedName ?? "Taste Buds Blend";
  const analysis = blend.analysis as unknown as StoredBlendAnalysis | null;

  let playlistId: string;
  try {
    const { id } = await createPlaylist(
      session.accessToken,
      displayName,
      `${names.join(" + ")} · ${blend.compatibility ?? 0}/100 match · blended on Taste Buds`,
    );
    playlistId = id;
    if (uris.length) await addPlaylistTracks(session.accessToken, id, uris);

    await prisma.blend.update({
      where: { id: blend.id },
      data: { spotifyPlaylistId: id, status: BlendStatus.pushed },
    });
  } catch (err) {
    if (err instanceof SpotifyAuthError) redirect(`/blend/${code}?err=reconnect`);
    console.error("[pushBlend]", err);
    redirect(`/blend/${code}?err=push`);
  }

  // Designed cover art — best effort, never blocks the save. Needs the
  // ugc-image-upload scope (added later; older sign-ins won't have it).
  try {
    if (!session.scope?.includes("ugc-image-upload")) throw new Error("no ugc scope");
    const jpeg = await renderCoverBase64({
      style: blend.coverStyle,
      pack: blend.pack,
      name: displayName,
      score: blend.compatibility ?? 0,
      covers: analysis?.coverArt ?? [],
    });
    if (jpeg) await setPlaylistImage(session.accessToken, playlistId, jpeg);
  } catch (err) {
    console.error("[pushBlend] cover upload failed:", err);
  }

  revalidatePath(`/blend/${code}`);
  redirect(`/blend/${code}?saved=1`);
}

/** Re-render the designed cover and push it to the Spotify playlist. Used after
 *  the cover style or theme changes on an already-saved blend. */
export async function refreshPlaylistCover(code: string) {
  const session = await auth();
  if (!session?.user || session.error || !session.accessToken) return;
  if (!session.scope?.includes("ugc-image-upload")) return;
  const blend = await participantBlend(code);
  if (!blend?.spotifyPlaylistId) return;

  const analysis = blend.analysis as unknown as StoredBlendAnalysis | null;
  try {
    const jpeg = await renderCoverBase64({
      style: blend.coverStyle,
      pack: blend.pack,
      name: blend.generatedName ?? "Taste Buds Blend",
      score: blend.compatibility ?? 0,
      covers: analysis?.coverArt ?? [],
    });
    if (jpeg)
      await setPlaylistImage(session.accessToken, blend.spotifyPlaylistId, jpeg);
  } catch (err) {
    console.error("[refreshPlaylistCover]", err);
  }
  revalidatePath(`/blend/${code}`);
}

/** Toggle whether the saved Spotify playlist is collaborative (both people can
 *  add / remove tracks). Anyone with the playlist link can then edit it. */
export async function setCollaborative(code: string, on: boolean) {
  const session = await auth();
  if (!session?.user || session.error || !session.accessToken) return;
  if (!session.scope?.includes("playlist-modify")) return;
  const blend = await participantBlend(code);
  if (!blend?.spotifyPlaylistId) return;

  try {
    await setPlaylistDetails(session.accessToken, blend.spotifyPlaylistId, {
      collaborative: on,
    });
    await prisma.blend.update({
      where: { id: blend.id },
      data: { playlistCollaborative: on },
    });
  } catch (err) {
    console.error("[setCollaborative]", err);
  }
  revalidatePath(`/blend/${code}`);
}

export async function setBlendName(code: string, name: string) {
  const session = await auth();
  if (!session?.user || session.error) return;
  const meId = await ensureUser(session);
  if (!meId) return;

  const blend = await getBlendByCode(code);
  if (!blend || !isParticipant(blend, meId)) return;

  const clean = name.trim().slice(0, 60);
  if (!clean) return;

  await prisma.blend.update({
    where: { id: blend.id },
    data: { generatedName: clean },
  });
  revalidatePath(`/blend/${code}`);
}
