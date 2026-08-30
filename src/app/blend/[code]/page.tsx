import Image from "next/image";
import Link from "next/link";
import { auth, signIn } from "@/auth";
import { generateBlend, joinPairBlend } from "@/app/actions";
import { BlendReveal } from "@/components/blend-reveal";
import { PrimaryButton } from "@/components/button";
import { CopyButton } from "@/components/copy-button";
import { PackTheme } from "@/components/pack-theme";
import { WaitingMarks } from "@/components/waiting-marks";
import { Wordmark } from "@/components/wordmark";
import type { StoredBlendAnalysis } from "@/lib/blend-algo";
import {
  blendOwner,
  getBlendByCode,
  isParticipant,
  PAIR_CAPACITY,
  type BlendWithParticipants,
} from "@/lib/blend";
import { ensureUser } from "@/lib/user";

function Shell({
  children,
  top = false,
  wide = false,
}: {
  children: React.ReactNode;
  top?: boolean;
  wide?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-1 flex-col px-6 sm:px-10">
      <header className="pt-6 sm:pt-8">
        <Wordmark />
      </header>
      <main
        className={
          "flex flex-1 py-12 sm:py-16 " + (top ? "items-start" : "items-center")
        }
      >
        <div className={wide ? "w-full" : "w-full max-w-xl"}>{children}</div>
      </main>
    </div>
  );
}

export default async function BlendRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ err?: string; who?: string; saved?: string }>;
}) {
  const { code } = await params;
  const { err, who, saved } = await searchParams;
  const blend = await getBlendByCode(code);

  if (!blend) {
    return (
      <Shell>
        <div className="reveal">
          <h1 className="tb-display text-[length:var(--text-h1)] leading-[1.03]">
            Blend not found
          </h1>
          <p className="mt-3 text-[length:var(--text-base)] text-fg-muted">
            That invite link is wrong or the blend was removed.
          </p>
          <Link
            href="/start"
            className="mt-6 inline-block text-[0.875rem] font-medium text-accent hover:underline"
          >
            Go to your blends
          </Link>
        </div>
      </Shell>
    );
  }

  const session = await auth();
  const owner = blendOwner(blend);
  const ownerName = owner?.user.name ?? "A friend";

  if (!session?.user || session.error) {
    return (
      <Shell>
        <div className="reveal">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-fg-faint">
            Blend invite
          </p>
          <h1 className="tb-display mt-3 text-[length:var(--text-h1)] leading-[1.04]">
            <span className="text-accent">{ownerName}</span> wants to blend
            taste buds with you
          </h1>
          <p className="mt-5 max-w-md text-[length:var(--text-base)] leading-relaxed text-fg-muted">
            Connect your Spotify and I&rsquo;ll merge what you both listen to
            into one playlist &mdash; with a stupid name and the receipts.
          </p>
          <form
            className="mt-9"
            action={async () => {
              "use server";
              await signIn("spotify", { redirectTo: `/blend/${code}` });
            }}
          >
            <PrimaryButton type="submit">Connect Spotify to join</PrimaryButton>
          </form>
          <p className="mt-4 text-[0.8125rem] text-fg-faint">
            No account to make &mdash; your Spotify is your login.
          </p>
        </div>
      </Shell>
    );
  }

  const userId = await ensureUser(session);
  const member = userId ? isParticipant(blend, userId) : false;
  const full = blend.participants.length >= PAIR_CAPACITY;

  if (!member && full) {
    return (
      <Shell>
        <div className="reveal">
          <h1 className="tb-display text-[length:var(--text-h1)] leading-[1.03]">
            This blend is full
          </h1>
          <p className="mt-3 text-[length:var(--text-base)] text-fg-muted">
            {ownerName}&rsquo;s blend already has two people in it.
          </p>
          <Link
            href="/start"
            className="mt-6 inline-block text-[0.875rem] font-medium text-accent hover:underline"
          >
            Start your own
          </Link>
        </div>
      </Shell>
    );
  }

  if (!member) {
    return (
      <Shell>
        <div className="reveal">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-fg-faint">
            Blend invite
          </p>
          <h1 className="tb-display mt-3 text-[length:var(--text-h1)] leading-[1.04]">
            Join <span className="text-accent">{ownerName}</span>&rsquo;s blend
          </h1>
          <p className="mt-5 max-w-md text-[length:var(--text-base)] leading-relaxed text-fg-muted">
            You&rsquo;re signed in. Hop in and I&rsquo;ll start comparing your
            taste with {ownerName}&rsquo;s.
          </p>
          <form className="mt-9" action={joinPairBlend.bind(null, code)}>
            <PrimaryButton type="submit">Join the blend</PrimaryButton>
          </form>
        </div>
      </Shell>
    );
  }

  if (full && (blend.status === "generated" || blend.status === "pushed")) {
    const pack = blend.pack ?? "studio";
    return (
      <div data-pack={pack === "studio" ? undefined : pack}>
        <PackTheme pack={pack} />
        <Shell top wide>
          <BlendReveal
            code={code}
            pack={pack}
            coverStyle={blend.coverStyle}
            initialName={blend.generatedName ?? "Untitled Blend"}
            compatibility={blend.compatibility ?? 0}
            participantNames={blend.participants.map(
              (p) => p.user.name ?? "Spotify user",
            )}
            analysis={
              (blend.analysis as unknown as StoredBlendAnalysis | null) ?? null
            }
            playlistUrl={
              blend.spotifyPlaylistId
                ? `https://open.spotify.com/playlist/${blend.spotifyPlaylistId}`
                : null
            }
            justSaved={saved === "1"}
            canUploadCover={session.scope?.includes("ugc-image-upload") ?? false}
            collaborative={blend.playlistCollaborative}
            otherName={
              blend.participants.find((p) => p.userId !== userId)?.user.name ??
              "your friend"
            }
            pushError={
              err === "push" || err === "reconnect" || err === "scope"
                ? err
                : null
            }
            tracks={blend.tracks.map((t) => ({
              id: t.spotifyTrackId,
              name: t.name,
              artists: t.artists,
              matchReason: t.matchReason,
              vibe: t.vibe,
              lean: t.lean,
              albumArt: t.albumArt,
            }))}
          />
        </Shell>
      </div>
    );
  }

  const inviteUrl = `${process.env.AUTH_URL ?? "http://127.0.0.1:3000"}/blend/${code}`;

  return (
    <Shell>
      {full ? (
        <BothIn
          blend={blend}
          code={code}
          issue={err ? { kind: err, who: who ?? "someone" } : null}
        />
      ) : (
        <Waiting inviteUrl={inviteUrl} />
      )}
    </Shell>
  );
}

function Waiting({ inviteUrl }: { inviteUrl: string }) {
  return (
    <div className="reveal">
      <h1 className="tb-display text-[length:var(--text-h1)] leading-[1.03]">
        Send this to a friend
      </h1>
      <p className="mt-4 max-w-md text-[length:var(--text-base)] leading-relaxed text-fg-muted">
        When they open it and connect Spotify, the blend builds itself.
      </p>

      <div
        style={{ borderRadius: "var(--r-input)" }}
        className="mt-8 flex items-center gap-3 border border-border bg-surface p-2 pl-4 shadow-soft"
      >
        <span className="flex-1 truncate font-mono text-[0.8125rem] text-fg-muted">
          {inviteUrl}
        </span>
        <CopyButton value={inviteUrl} />
      </div>

      <div className="mt-10 flex items-center gap-3 text-[0.8125rem] text-fg-faint">
        <WaitingMarks />
        Waiting for your friend to connect&hellip;
      </div>
    </div>
  );
}

function BothIn({
  blend,
  code,
  issue,
}: {
  blend: BlendWithParticipants;
  code: string;
  issue: { kind: string; who: string } | null;
}) {
  const issueText =
    issue?.kind === "thin"
      ? `Not enough listening history from ${issue.who === "you" ? "your account" : issue.who} to blend yet — play some music on Spotify and try again in a day.`
      : issue?.kind === "snapshot"
        ? `Couldn't read ${issue.who === "you" ? "your" : `${issue.who}'s`} Spotify taste. ${issue.who === "you" ? "Open /start once so it caches" : "Ask them to reopen this link"}, then try again.`
        : null;

  return (
    <div className="reveal">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-fg-faint">
        Both in
      </p>
      <h1 className="tb-display mt-3 text-[length:var(--text-h1)] leading-[1.03]">
        Your taste buds are ready
      </h1>

      <ul className="mt-7 space-y-2.5">
        {blend.participants.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            {p.user.image ? (
              <Image
                src={p.user.image}
                alt=""
                width={32}
                height={32}
                className="rounded-full ring-1 ring-border"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-surface-2 ring-1 ring-border" />
            )}
            <span className="text-[0.875rem] text-fg">
              {p.user.name ?? "Spotify user"}
            </span>
            {p.isOwner && (
              <span className="text-[0.6875rem] uppercase tracking-wide text-fg-faint">
                host
              </span>
            )}
          </li>
        ))}
      </ul>

      {issueText && (
        <p
          style={{ borderRadius: "var(--r-input)" }}
          className="mt-6 border border-border bg-surface-2 p-3 text-[0.8125rem] text-fg-muted"
        >
          {issueText}
        </p>
      )}

      <form className="mt-9" action={generateBlend.bind(null, code)}>
        <PrimaryButton type="submit">Generate the blend</PrimaryButton>
      </form>
    </div>
  );
}
