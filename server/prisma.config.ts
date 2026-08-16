import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads connection URLs from this file rather than from schema.prisma,
// and no longer loads .env on its own, hence the dotenv import above.
//
// Migrations run over DIRECT_URL. On machines that cannot reach the Supabase
// direct host (it is IPv6-only) DIRECT_URL holds the session pooler string, so
// this falls back to DATABASE_URL if DIRECT_URL is unset. See docs/decisions.md.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
