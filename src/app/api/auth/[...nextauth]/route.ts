import { Auth, setEnvDefaults } from "@auth/core";
import type { AuthConfig } from "@auth/core";
import { authConfig } from "@/auth.config";

/**
 * Why this isn't just `export const { GET, POST } = handlers`:
 *
 * Next 16's `NextURL` (used by `NextRequest`, which next-auth's `handlers`
 * route every request through) force-normalizes the loopback IP `127.0.0.1`
 * to `localhost` — see node_modules/next/dist/server/web/next-url.js
 * (`REGEX_LOCALHOST_HOSTNAME`). Auth.js then derives the OAuth `redirect_uri`
 * from that host, sending `http://localhost:3000/api/auth/callback/spotify`.
 * Spotify rejects it: new apps must register the `127.0.0.1` literal, not
 * `localhost`.
 *
 * Fix: hand `@auth/core`'s `Auth()` a plain WHATWG `Request` whose origin we
 * pin to `AUTH_URL`. Plain `URL` / `Request` don't touch loopback hosts, so
 * the redirect_uri, state, and token-exchange all use `127.0.0.1` and match
 * what's registered in the Spotify dashboard. In production (real host) this
 * wrapper is a passthrough.
 */
const config: AuthConfig = { ...authConfig, basePath: "/api/auth" };
setEnvDefaults(process.env, config, true);

const AUTH_ORIGIN = new URL(process.env.AUTH_URL ?? "http://127.0.0.1:3000");

async function handle(req: Request): Promise<Response> {
  const incoming = new URL(req.url);
  const pinned = new URL(incoming.pathname + incoming.search, AUTH_ORIGIN);

  const init: RequestInit = { method: req.method, headers: req.headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  return Auth(new Request(pinned, init), config);
}

export { handle as GET, handle as POST };
