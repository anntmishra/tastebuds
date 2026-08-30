import { defineConfig } from "prisma/config";

// Prisma 7 moved the connection URL out of schema.prisma. It also only loads
// `.env` by default, not `.env.local` — so load that here explicitly.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local (e.g. CI) — fall back to the ambient environment
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Migrations need a direct (non-pooled) connection for advisory locks.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
