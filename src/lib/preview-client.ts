// Client-side: ask our /api/preview route for a track's preview url. Cached
// per name|artist so re-hovering is instant.

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

export async function findPreview(
  name: string,
  artist: string,
): Promise<string | null> {
  const key = `${name}|${artist}`.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    try {
      const res = await fetch(
        `/api/preview?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist)}`,
      );
      const data = (await res.json()) as { url?: string | null };
      const url = data.url ?? null;
      cache.set(key, url);
      return url;
    } catch {
      cache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}
