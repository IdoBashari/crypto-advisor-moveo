import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

// Prisma 7 clients take a driver adapter instead of a connection URL. Runtime
// queries go through DATABASE_URL (the session pooler); migrations use
// DIRECT_URL and are configured separately in prisma.config.ts.
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
