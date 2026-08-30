import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enrichArtists, type ArtistEnrichment } from "@/lib/lastfm";
import {
  fetchTopArtists,
  fetchTopTracks,
  SpotifyAuthError,
  type RawArtist,
  type RawTrack,
  type TimeRange,
} from "@/lib/spotify";

export type { TimeRange };
export const DEFAULT_TIME_RANGE: TimeRange = "medium_term";

/** How long a cached snapshot is considered fresh. */
const TTL_MS = 24 * 60 * 60 * 1000;

export type TasteTrack = {
  id: string;
  name: string;
  artists: string[];
  artistIds: string[];
  popularity: number;
  year: number; // 0 = unknown
  decade: number; // 0 = unknown
  url: string;
  albumArt: string; // Spotify cover url (~300px), "" if none
};

export type TasteArtist = {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  url: string;
};

export type TasteSnapshot = {
  timeRange: TimeRange;
  topTracks: TasteTrack[];
  topArtists: TasteArtist[];
  genres: { name: string; weight: number }[];
  eras: { decade: number; weight: number }[];
  /** mean & spread of top-track popularity (0-100) — the mainstream↔obscure axis */
  popularity: { mean: number; stdev: number };
  fetchedAt: string; // ISO
  /** true when we served an old snapshot because a refresh failed */
  stale: boolean;
};

type BuiltFields = Pick<
  TasteSnapshot,
  "topTracks" | "topArtists" | "genres" | "eras"
>;

function parseYear(releaseDate?: string): number {
  const m = /^(\d{4})/.exec(releaseDate ?? "");
  return m ? Number(m[1]) : 0;
}

function normalize<T extends { weight: number }>(rows: T[]): T[] {
  const sum = rows.reduce((s, r) => s + r.weight, 0);
  if (sum <= 0) return rows;
  return rows.map((r) => ({ ...r, weight: r.weight / sum }));
}

export function buildTasteFields(
  tracks: RawTrack[],
  artists: RawArtist[],
  /** Last.fm backfill for genres + popularity (Spotify no longer returns them). */
  enrichment: Map<string, ArtistEnrichment> = new Map(),
): BuiltFields {
  const artistPop = new Map<string, number>();
  for (const a of artists) {
    const e = enrichment.get(a.id);
    artistPop.set(a.id, e?.popularity ?? a.popularity ?? 0);
  }

  const topTracks: TasteTrack[] = tracks.map((t) => {
    const year = parseYear(t.album?.release_date);
    const ids = (t.artists ?? []).map((a) => a.id);
    const pops = ids.map((id) => artistPop.get(id)).filter((n): n is number => !!n);
    const pop =
      t.popularity ??
      (pops.length ? Math.round(pops.reduce((s, v) => s + v, 0) / pops.length) : 0);
    const imgs = t.album?.images ?? [];
    const albumArt =
      imgs.find((i) => i.width >= 240 && i.width <= 400)?.url ??
      imgs[imgs.length - 1]?.url ??
      imgs[0]?.url ??
      "";
    return {
      id: t.id,
      name: t.name,
      artists: (t.artists ?? []).map((a) => a.name),
      artistIds: ids,
      popularity: pop,
      year,
      decade: year ? Math.floor(year / 10) * 10 : 0,
      url: t.external_urls?.spotify ?? "",
      albumArt,
    };
  });

  const topArtists: TasteArtist[] = artists.map((a) => {
    const e = enrichment.get(a.id);
    return {
      id: a.id,
      name: a.name,
      genres: e?.genres ?? a.genres ?? [],
      popularity: e?.popularity ?? a.popularity ?? 0,
      url: a.external_urls?.spotify ?? "",
    };
  });

  // Genre weights: each artist contributes 1/(rank+1) to each of its genres.
  const gm = new Map<string, number>();
  topArtists.forEach((a, i) => {
    const w = 1 / (i + 1);
    for (const g of a.genres) gm.set(g, (gm.get(g) ?? 0) + w);
  });
  const genres = normalize(
    [...gm.entries()].map(([name, weight]) => ({ name, weight })),
  ).sort((a, b) => b.weight - a.weight);

  // Era histogram: each track contributes 1/(rank+1) to its release decade.
  const em = new Map<number, number>();
  topTracks.forEach((t, i) => {
    if (!t.decade) return;
    em.set(t.decade, (em.get(t.decade) ?? 0) + 1 / (i + 1));
  });
  const eras = normalize(
    [...em.entries()].map(([decade, weight]) => ({ decade, weight })),
  ).sort((a, b) => a.decade - b.decade);

  return { topTracks, topArtists, genres, eras };
}

function popularityProfile(tracks: TasteTrack[]) {
  if (!tracks.length) return { mean: 0, stdev: 0 };
  const vals = tracks.map((t) => t.popularity);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance =
    vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  return { mean: Math.round(mean), stdev: Math.round(Math.sqrt(variance)) };
}

function toSnapshot(row: {
  timeRange: string;
  topTracks: Prisma.JsonValue;
  topArtists: Prisma.JsonValue;
  genres: Prisma.JsonValue;
  eras: Prisma.JsonValue;
  fetchedAt: Date;
}): TasteSnapshot {
  const topTracks = row.topTracks as unknown as TasteTrack[];
  return {
    timeRange: row.timeRange as TimeRange,
    topTracks,
    topArtists: row.topArtists as unknown as TasteArtist[],
    genres: row.genres as unknown as { name: string; weight: number }[],
    eras: row.eras as unknown as { decade: number; weight: number }[],
    popularity: popularityProfile(topTracks),
    fetchedAt: row.fetchedAt.toISOString(),
    stale: false,
  };
}

/** Read a stored snapshot without touching Spotify (e.g. for the other
 *  participant in a blend, whose token we don't hold). */
export async function readStoredSnapshot(
  userId: string,
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
): Promise<TasteSnapshot | null> {
  const row = await prisma.userTasteSnapshot.findUnique({
    where: { userId_timeRange: { userId, timeRange } },
  });
  return row ? toSnapshot(row) : null;
}

/**
 * Return the user's taste snapshot for a time range, refreshing from Spotify
 * if there's no cached copy or it's older than {@link TTL_MS}. On a refresh
 * failure with a cached copy present, the old copy is served with `stale:true`.
 * Throws {@link SpotifyAuthError} if the token is rejected and there's no cache.
 */
export async function getTasteSnapshot(opts: {
  userId: string;
  accessToken: string;
  timeRange?: TimeRange;
  force?: boolean;
}): Promise<TasteSnapshot> {
  const timeRange = opts.timeRange ?? DEFAULT_TIME_RANGE;

  const existing = await prisma.userTasteSnapshot.findUnique({
    where: { userId_timeRange: { userId: opts.userId, timeRange } },
  });

  const fresh =
    existing && Date.now() - existing.fetchedAt.getTime() < TTL_MS;
  if (existing && fresh && !opts.force) return toSnapshot(existing);

  try {
    const [tracks, artists] = await Promise.all([
      fetchTopTracks(opts.accessToken, timeRange),
      fetchTopArtists(opts.accessToken, timeRange),
    ]);
    const enrichment = await enrichArtists(
      artists.items.map((a) => ({ id: a.id, name: a.name })),
    );
    const built = buildTasteFields(tracks.items, artists.items, enrichment);

    const saved = await prisma.userTasteSnapshot.upsert({
      where: { userId_timeRange: { userId: opts.userId, timeRange } },
      create: {
        userId: opts.userId,
        timeRange,
        topTracks: built.topTracks as unknown as Prisma.InputJsonValue,
        topArtists: built.topArtists as unknown as Prisma.InputJsonValue,
        genres: built.genres as unknown as Prisma.InputJsonValue,
        eras: built.eras as unknown as Prisma.InputJsonValue,
      },
      update: {
        topTracks: built.topTracks as unknown as Prisma.InputJsonValue,
        topArtists: built.topArtists as unknown as Prisma.InputJsonValue,
        genres: built.genres as unknown as Prisma.InputJsonValue,
        eras: built.eras as unknown as Prisma.InputJsonValue,
        fetchedAt: new Date(),
      },
    });
    return toSnapshot(saved);
  } catch (err) {
    if (existing) return { ...toSnapshot(existing), stale: true };
    if (err instanceof SpotifyAuthError) throw err;
    throw err;
  }
}
