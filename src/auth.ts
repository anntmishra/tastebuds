import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * `auth()` (server components), `signIn()` / `signOut()` (server actions).
 *
 * We do NOT use the `handlers` from here for the /api/auth/* routes — see
 * src/app/api/auth/[...nextauth]/route.ts for why (Next 16 rewrites the
 * loopback IP to `localhost`, which breaks the Spotify redirect_uri).
 */
export const { auth, signIn, signOut } = NextAuth(authConfig);
