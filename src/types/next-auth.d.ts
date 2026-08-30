import type { DefaultSession } from "next-auth";

type SpotifyAuthError = "NoRefreshToken" | "RefreshFailed";

declare module "next-auth" {
  interface Session {
    /** Spotify user id (stable account identifier). */
    user: { id?: string } & DefaultSession["user"];
    /** Our `User.id` (cuid) — the FK blends reference. Named `dbUserId` to
     *  avoid colliding with `AdapterSession.userId` (typed non-optional). */
    dbUserId?: string;
    /** Current Spotify access token, refreshed on demand. */
    accessToken?: string;
    /** Space-separated OAuth scopes actually granted at sign-in. */
    scope?: string;
    /** Set when the access token could not be refreshed; force re-auth. */
    error?: SpotifyAuthError;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    spotifyId?: string;
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
    scope?: string;
    /** Unix seconds. */
    expiresAt?: number;
    error?: SpotifyAuthError;
  }
}
