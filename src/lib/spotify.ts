const API = "https://api.spotify.com/v1";

export type TimeRange = "short_term" | "medium_term" | "long_term";

/** Spotify rejected the token (401) — the caller should force re-auth. */
export class SpotifyAuthError extends Error {
  constructor(message = "Spotify token rejected") {
    super(message);
    this.name = "SpotifyAuthError";
  }
}

export class SpotifyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SpotifyError";
    this.status = status;
  }
}

async function spotifyFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });

    if (res.ok) {
      if (res.status === 204) return undefined as T;
      const text = await res.text();
      return (text ? JSON.parse(text) : undefined) as T;
    }
    if (res.status === 401) throw new SpotifyAuthError();
    if (res.status === 429) {
      const wait = Math.min(Number(res.headers.get("retry-after") ?? "1") || 1, 8);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    const body = await res.text().catch(() => "");
    throw new SpotifyError(
      `Spotify ${res.status} on ${path}${body ? ` — ${body.slice(0, 300)}` : ""}`,
      res.status,
    );
  }
  throw new SpotifyError(`Spotify rate limit not clearing on ${path}`, 429);
}

// --- Minimal shapes of what we actually read -------------------------------

export type RawTrack = {
  id: string;
  name: string;
  popularity: number;
  artists: { id: string; name: string }[];
  album?: {
    release_date?: string;
    release_date_precision?: string;
    images?: { url: string; width: number; height: number }[];
  };
  external_urls?: { spotify?: string };
};

export type RawArtist = {
  id: string;
  name: string;
  genres?: string[];
  popularity: number;
  external_urls?: { spotify?: string };
};

type Paged<T> = { items: T[] };

export function fetchTopTracks(token: string, timeRange: TimeRange) {
  return spotifyFetch<Paged<RawTrack>>(
    token,
    `/me/top/tracks?time_range=${timeRange}&limit=50`,
  );
}

export function fetchTopArtists(token: string, timeRange: TimeRange) {
  return spotifyFetch<Paged<RawArtist>>(
    token,
    `/me/top/artists?time_range=${timeRange}&limit=50`,
  );
}

// --- Playlist writes (item 6) --------------------------------------------

export function fetchMe(token: string) {
  return spotifyFetch<{ id: string; display_name?: string }>(token, "/me");
}

export async function createPlaylist(
  token: string,
  name: string,
  description: string,
): Promise<{ id: string; url: string }> {
  // Current endpoint is POST /me/playlists. The older
  // POST /users/{user_id}/playlists returns a bare 403 for apps created
  // after Spotify's 2024 API changes.
  const pl = await spotifyFetch<{
    id: string;
    external_urls?: { spotify?: string };
  }>(token, "/me/playlists", {
    method: "POST",
    body: JSON.stringify({ name, description, public: false }),
  });
  return {
    id: pl.id,
    url: pl.external_urls?.spotify ?? `https://open.spotify.com/playlist/${pl.id}`,
  };
}

export async function addPlaylistTracks(
  token: string,
  playlistId: string,
  uris: string[],
): Promise<void> {
  // Current sub-resource is `items` (the playlist object exposes
  // `items.href = /playlists/{id}/items`). The older `/tracks` path 403s
  // for post-2024 apps — same clampdown as /me/playlists above.
  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100);
    try {
      await spotifyFetch(token, `/playlists/${playlistId}/items`, {
        method: "POST",
        body: JSON.stringify({ uris: chunk }),
      });
    } catch (err) {
      if (err instanceof SpotifyError && err.status === 404) {
        // Fall back to the legacy path if `items` isn't recognised.
        await spotifyFetch(token, `/playlists/${playlistId}/tracks`, {
          method: "POST",
          body: JSON.stringify({ uris: chunk }),
        });
      } else {
        throw err;
      }
    }
  }
}

/** Toggle playlist collaboration. Collaborative playlists must be private. */
export function setPlaylistDetails(
  token: string,
  playlistId: string,
  details: { collaborative?: boolean; name?: string; description?: string },
): Promise<void> {
  const body: Record<string, unknown> = { ...details };
  if (details.collaborative) body.public = false;
  return spotifyFetch(token, `/playlists/${playlistId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** Upload custom playlist artwork. `jpegBase64` is raw base64 (no data: prefix),
 *  ≤256 KB. Endpoint wants the base64 string as the body with an image/jpeg
 *  content type — not JSON. */
export function setPlaylistImage(
  token: string,
  playlistId: string,
  jpegBase64: string,
): Promise<void> {
  return spotifyFetch(token, `/playlists/${playlistId}/images`, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: jpegBase64,
  });
}
