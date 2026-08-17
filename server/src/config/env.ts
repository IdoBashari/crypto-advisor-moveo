import "dotenv/config";

// Single source of truth for the server's environment configuration.
//
// This module validates on import rather than on first use, so importing it at
// the top of the entry point turns a missing variable into a failed boot rather
// than a failed request later on.
//
// One deliberate exception: prisma.config.ts still reads process.env directly.
// It is loaded by the Prisma CLI outside the server process, where the runtime
// variables validated here (JWT_SECRET in particular) are neither present nor
// relevant. DIRECT_URL is owned by that file for the same reason.

type NodeEnv = "development" | "test" | "production";

export interface Env {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly databaseUrl: string;
  readonly clientOrigins: readonly string[];
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly coingeckoApiKey: string;
  /** When true, insights are canned and no LLM request is made. */
  readonly mockLlm: boolean;
  /** Empty string when mockLlm is true, where it is never read. */
  readonly openrouterApiKey: string;
}

const missing: string[] = [];
const invalid: string[] = [];

// Collect every problem before throwing, so a fresh checkout reports all the
// missing variables at once instead of one per restart.
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    missing.push(name);
    return "";
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value.trim();
}

const nodeEnvRaw = optional("NODE_ENV", "development");
if (!["development", "test", "production"].includes(nodeEnvRaw)) {
  invalid.push(
    `NODE_ENV must be one of development, test, production (received "${nodeEnvRaw}")`,
  );
}

const portRaw = optional("PORT", "3000");
const port = Number(portRaw);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  invalid.push(`PORT must be an integer between 1 and 65535 (received "${portRaw}")`);
}

const databaseUrl = required("DATABASE_URL");
const clientOriginRaw = required("CLIENT_ORIGIN");
const jwtSecret = required("JWT_SECRET");
const jwtExpiresIn = required("JWT_EXPIRES_IN");
// Required rather than optional: without it CoinGecko answers a handful of
// requests and then starts returning 429, which reads as a rate-limit bug
// rather than as the missing configuration it actually is.
const coingeckoApiKey = required("COINGECKO_API_KEY");

// Mock by default everywhere but production. OpenRouter's free tier allows 50
// requests a day across the whole account, so a live call has to be a
// deliberate act rather than something a dev server does on every reload.
const mockLlmDefault = nodeEnvRaw === "production" ? "false" : "true";
const mockLlmRaw = optional("MOCK_LLM", mockLlmDefault);
if (!["true", "false"].includes(mockLlmRaw)) {
  invalid.push(`MOCK_LLM must be "true" or "false" (received "${mockLlmRaw}")`);
}
const mockLlm = mockLlmRaw === "true";

// Conditionally required, unlike COINGECKO_API_KEY (D37). That one is
// unconditional because every request needs prices; this one is not, so that
// someone cloning the repo can run the whole app without an OpenRouter
// account. Demanding a key for a call the default never makes would block a
// working checkout for nothing.
const openrouterApiKey = mockLlm ? optional("OPENROUTER_API_KEY", "") : required("OPENROUTER_API_KEY");

if (missing.length > 0 || invalid.length > 0) {
  const problems: string[] = [];
  if (missing.length > 0) {
    problems.push(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }
  problems.push(...invalid);
  // Never interpolate a value that may hold a secret into this message.
  throw new Error(
    `Invalid server environment.\n  - ${problems.join("\n  - ")}\n` +
      `Check server/.env against server/.env.example.`,
  );
}

export const env: Env = Object.freeze({
  nodeEnv: nodeEnvRaw as NodeEnv,
  port,
  databaseUrl,
  clientOrigins: Object.freeze(
    clientOriginRaw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
  jwtSecret,
  jwtExpiresIn,
  coingeckoApiKey,
  mockLlm,
  openrouterApiKey,
});

export default env;
