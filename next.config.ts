import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo lives under the home dir; pin the workspace root so Turbopack
  // doesn't walk up to ~ and ignore this project's package-lock.json.
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      // Spotify profile images
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "image-cdn-ak.spotifycdn.com" },
      { protocol: "https", hostname: "image-cdn-fa.spotifycdn.com" },
      // Facebook-linked Spotify accounts serve avatars from here
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
    ],
  },
};

export default nextConfig;
