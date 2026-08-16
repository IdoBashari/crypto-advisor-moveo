import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./config/env.js";
import { PrismaClient } from "./generated/prisma/client.js";

// Prisma 7 clients take a driver adapter instead of a connection URL. Runtime
// queries go through DATABASE_URL (the session pooler); migrations use
// DIRECT_URL and are configured separately in prisma.config.ts.
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter });
}

// tsx watch re-evaluates modules on every change, which would otherwise leak a
// new connection pool per reload. Cache the instance on globalThis outside
// production so reloads reuse a single client.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (env.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
