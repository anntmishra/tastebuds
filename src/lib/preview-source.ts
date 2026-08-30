// Server-side preview lookup. Runs on our server so there's no CORS limit and
// we can chain sources. Spotify's own preview_url is dead for this app.

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/\s*-\s*(slowed|reverb|sped up|remix|edit|version|remaster).*$/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function overlaps(query: string, result: string) {
  const want = new Set(norm(query).split(/\s+/).filter((w) => w.length >= 3));
  if (want.size === 0) return true;
  return norm(result)
    .split(/\s+/)
    .some((w) => w.length >= 3 && want.has(w));
}

async function fromItunes(name: string, artist: string) {
  const term = encodeURIComponent(`${norm(name)} ${artist.split(",")[0]}`);
  const res = await fetch(
    `https://itunes.apple.com/search?term=${term}&entity=song&limit=1&media=music`,
    { signal: AbortSignal.timeout(4000) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: { trackName?: string; previewUrl?: string }[];
  };
  const hit = data.results?.[0];
  if (hit?.previewUrl && overlaps(name, hit.trackName ?? "")) return hit.previewUrl;
  return null;
}

async function fromDeezer(name: string, artist: string) {
  const q = encodeURIComponent(
    `track:"${norm(name)}" artist:"${artist.split(",")[0]}"`,
  );
  const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    data?: { title?: string; preview?: string }[];
  };
  const hit = data.data?.[0];
  if (hit?.preview && overlaps(name, hit.title ?? "")) return hit.preview;
  return null;
}

export async function lookupPreview(
  name: string,
  artist: string,
): Promise<string | null> {
  for (const src of [fromItunes, fromDeezer]) {
    try {
      const url = await src(name, artist);
      if (url) return url;
    } catch {
      /* try the next source */
    }
  }
  return null;
}
