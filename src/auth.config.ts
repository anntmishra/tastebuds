import type { NextAuthConfig } from "next-auth";
import Spotify from "next-auth/providers/spotify";
import { prisma } from "@/lib/prisma";

/**
 * Scopes from taste-buds/03-Architecture.md:
 * - user-top-read           -> GET /v1/me/top/{tracks,artists}
 * - user-read-email         -> account identity (Spotify login == signup)
 * - playlist-modify-public  -> create/populate the pushed playlist
 * - playlist-modify-private -> same, for private playlists
 * - ugc-image-upload        -> PUT /v1/playlists/{id}/images (designed cover art)
 */
export const SPOTIFY_SCOPES = [
  "user-top-read",
  "user-read-email",
  "playlist-modify-public",
  "playlist-modify-private",
  "ugc-image-upload",
].join(" ");

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

/**
 * Exchange the stored refresh token for a fresh access token.
 * Spotify may or may not return a new refresh token; keep the old one if not.
 */
async function refreshSpotifyToken(refreshToken: string) {
  const basic = Buffer.from(
    `${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}`,
  ).toString("base64");

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error ?? `Spotify token refresh failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  };
}

export const authConfig: NextAuthConfig = {
  providers: [
    Spotify({
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        // show_dialog forces Spotify to re-prompt so newly-added scopes
        // (e.g. playlist-modify-*) are actually granted on re-login instead
        // of silently reusing an older, narrower authorization.
        params: { scope: SPOTIFY_SCOPES, show_dialog: "true" },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { error: "/login-problem" },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Initial sign-in: persist Spotify identity + tokens onto the JWT,
      // and upsert a User row so blends can reference this person.
      if (account) {
        const spotifyId =
          (profile as { id?: string } | undefined)?.id ??
          account.providerAccountId;
        token.spotifyId = spotifyId;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.scope = typeof account.scope === "string" ? account.scope : undefined;
        token.expiresAt =
          account.expires_at ??
          Math.floor(Date.now() / 1000) +
            (typeof account.expires_in === "number" ? account.expires_in : 3600);
        delete token.error;

        try {
          const dbUser = await prisma.user.upsert({
            where: { spotifyId },
            create: {
              spotifyId,
              name: user?.name ?? null,
              email: user?.email ?? null,
              image: user?.image ?? null,
            },
            update: {
              name: user?.name ?? undefined,
              email: user?.email ?? undefined,
              image: user?.image ?? undefined,
            },
          });
          token.userId = dbUser.id;
        } catch (err) {
          // Don't block login on a DB hiccup — blends will just 401 until
          // the next sign-in refreshes the row.
          console.error("[auth] user upsert failed:", err);
        }
        return token;
      }

      // Still valid (60s safety margin): use as-is.
      if (
        typeof token.expiresAt === "number" &&
        Date.now() < token.expiresAt * 1000 - 60_000
      ) {
        return token;
      }

      // Expired: try to refresh.
      if (!token.refreshToken) {
        token.error = "NoRefreshToken";
        return token;
      }
      try {
        const refreshed = await refreshSpotifyToken(token.refreshToken);
        token.accessToken = refreshed.accessToken;
        token.refreshToken = refreshed.refreshToken;
        token.expiresAt = refreshed.expiresAt;
        delete token.error;
      } catch (err) {
        console.error("[auth] Spotify token refresh failed:", err);
        token.error = "RefreshFailed";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.spotifyId) session.user.id = token.spotifyId;
      session.dbUserId = token.userId;
      session.accessToken = token.accessToken;
      session.scope = typeof token.scope === "string" ? token.scope : undefined;
      session.error = token.error;
      return session;
    },
  },
};
