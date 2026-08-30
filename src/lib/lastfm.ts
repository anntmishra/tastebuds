// Spotify stripped `genres` and `popularity` from artist/track objects for
// apps created after its 2024 API clampdown (see taste-buds/03-Architecture.md).
// We backfill both from Last.fm, keyed by artist name, cached in the snapshot.

const BASE = "https://ws.audioscrobbler.com/2.0/";

// Last.fm tags are user-generated. Drop the non-genre noise.
const JUNK_TAGS = new Set([
  "seen live",
  "want to see live",
  "spotify",
  "favorites",
  "favourites",
  "favorite",
  "favourite",
  "favourite songs",
  "favorite songs",
  "favourite artists",
  "my favorites",
  "albums i own",
  "all",
  "love",
  "loved",
  "beautiful",
  "awesome",
  "amazing",
  "best",
  "good",
  "cool",
  "sexy",
  "under 2000 listeners",
  "male vocalists",
  "female vocalists",
  "male vocalist",
  "female vocalist",
  "singer-songwriters",
  "10s",
  "00s",
  "90s",
  "80s",
  "70s",
  "60s",
  "2010s",
  "2020s",
  "check out",
]);

// Nationality / place tags that ride along with real genres.
const PLACE_TAGS = new Set([
  "american",
  "british",
  "english",
  "uk",
  "usa",
  "us",
  "australian",
  "canadian",
  "german",
  "swedish",
  "norwegian",
  "finnish",
  "danish",
  "icelandic",
  "french",
  "japanese",
  "korean",
  "spanish",
  "italian",
  "dutch",
  "belgian",
  "brazilian",
  "irish",
  "scottish",
  "welsh",
  "russian",
  "polish",
  "indian",
  "mexican",
  "chilean",
  "argentine",
  "texas",
  "california",
  "chicago",
  "detroit",
  "atlanta",
  "london",
  "seattle",
  "new york",
  "los angeles",
  "toronto",
  "melbourne",
]);

async function lfm(
  params: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const key = process.env.LASTFM_API_KEY;
  if (!key) return null;
  const url = new URL(BASE);
  url.search = new URLSearchParams({
    ...params,
    api_key: key,
    format: "json",
  }).toString();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TasteBuds/0.1 (dev)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function cleanTags(
  raw: { name?: string; count?: number | string }[],
  artistName: string,
): string[] {
  const self = artistName.toLowerCase().trim();
  return raw
    .map((t) => ({
      name: String(t?.name ?? "").toLowerCase().trim(),
      count: Number(t?.count ?? 0),
    }))
    // getTopTags counts are 0-100 relative weights; a joke tag sits near 0.
    .filter((t) => t.count >= 20)
    .map((t) => t.name)
    .filter(
      (n) =>
        n.length >= 2 &&
        n.length <= 30 &&
        n !== self &&
        !JUNK_TAGS.has(n) &&
        !PLACE_TAGS.has(n),
    )
    .slice(0, 6);
}

/** Last.fm listener count → a 0-100 mainstream↔obscure proxy.
 *  ~60k listeners → ~0, ~2M → ~68, ~8M → ~95. */
function listenersToPopularity(n: number): number {
  if (n <= 0) return 0;
  const scaled = ((Math.log10(n) - 4.8) / (7.0 - 4.8)) * 100;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

export type ArtistEnrichment = { genres: string[]; popularity: number };

/** name-keyed lookup of Last.fm genre tags + listener count for a batch of
 *  artists. Empty map if LASTFM_API_KEY is unset (graceful degrade). */
export async function enrichArtists(
  artists: { id: string; name: string }[],
): Promise<Map<string, ArtistEnrichment>> {
  const out = new Map<string, ArtistEnrichment>();
  if (!process.env.LASTFM_API_KEY || artists.length === 0) return out;

  const results = await mapLimit(artists, 6, async (a) => {
    const [tagJson, infoJson] = await Promise.all([
      lfm({ method: "artist.gettoptags", artist: a.name, autocorrect: "1" }),
      lfm({ method: "artist.getinfo", artist: a.name, autocorrect: "1" }),
    ]);

    const rawTags =
      ((tagJson?.toptags as { tag?: { name?: string; count?: number }[] })
        ?.tag ?? []) as { name?: string; count?: number }[];
    const listeners = Number(
      (infoJson?.artist as { stats?: { listeners?: string } })?.stats
        ?.listeners ?? 0,
    );

    return { id: a.id, genres: cleanTags(rawTags, a.name), listeners };
  });

  for (const r of results) {
    out.set(r.id, {
      genres: r.genres,
      popularity: listenersToPopularity(r.listeners),
    });
  }
  return out;
}
