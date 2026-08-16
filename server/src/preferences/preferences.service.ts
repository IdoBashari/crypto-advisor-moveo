// Reading and writing user preferences.
//
// The table is append-only and versioned: editing preferences deactivates the
// current row and inserts a successor, never mutating assets/investorType/
// topics in place. That history is load-bearing — Vote.userPreferencesId
// points at the exact row that was active when a vote was cast, so an in-place
// edit would silently rewrite the context of every past vote.
import { prisma } from "../prisma.js";
import type { SavePreferencesInput } from "./schemas.js";

// The shape returned to callers. userId and isActive are deliberately absent:
// the caller is the user, and isActive is an internal versioning mechanism.
const preferencesSelect = {
  assets: true,
  investorType: true,
  topics: true,
  version: true,
  createdAt: true,
} as const;

export type PreferencesView = Awaited<
  ReturnType<typeof prisma.userPreferences.findFirstOrThrow<{
    select: typeof preferencesSelect;
  }>>
>;

export type PreferencesErrorCode = "VERSION_CONFLICT";

export class PreferencesError extends Error {
  readonly code: PreferencesErrorCode;

  constructor(code: PreferencesErrorCode, message: string) {
    super(message);
    this.name = "PreferencesError";
    this.code = code;
  }
}

/**
 * The user's currently active preferences, or null if they have never saved any.
 *
 * THIS IS THE ONLY PLACE IN THE CODEBASE THAT MAY CONTAIN `isActive: true`.
 * Every consumer of active preferences must go through this function. A second
 * copy of that filter elsewhere is a silent bug: it would return stale
 * preferences with no error, and nothing would fail loudly to reveal it.
 *
 * findFirst rather than findUnique because no unique constraint backs the
 * "exactly one active row" invariant — the transaction in savePreferences is
 * what upholds it.
 */
export async function getActivePreferences(
  userId: string,
): Promise<PreferencesView | null> {
  return prisma.userPreferences.findFirst({
    where: { userId, isActive: true },
    select: preferencesSelect,
  });
}

/**
 * Saves a new version of the user's preferences.
 *
 * First save inserts version 1. Every later save deactivates whatever is
 * current and inserts version + 1. Both paths run in one transaction, so a
 * reader never observes zero active rows or two.
 */
export async function savePreferences(
  userId: string,
  input: SavePreferencesInput,
): Promise<PreferencesView> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Highest existing version, not a row count: deactivated rows still
      // occupy their version numbers, so counting would reuse one and collide.
      const latest = await tx.userPreferences.findFirst({
        where: { userId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      // Deactivates every prior row rather than only the active one. The
      // filter is unnecessary — they are all superseded — and leaving it out
      // keeps `isActive: true` confined to getActivePreferences, while also
      // repairing the invariant if more than one row were ever active.
      await tx.userPreferences.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // isActive is not set here: the column defaults to true in the schema,
      // which keeps the literal out of this function.
      return tx.userPreferences.create({
        data: {
          userId,
          version: nextVersion,
          assets: input.assets,
          investorType: input.investorType,
          topics: input.topics,
        },
        select: preferencesSelect,
      });
    });
  } catch (error) {
    // Two concurrent saves can read the same highest version and both attempt
    // the same next one. @@unique([userId, version]) rejects the loser with
    // P2002. Following the same decision as duplicate email in auth.service:
    // rely on the constraint, never pre-check.
    if (isUniqueConstraintViolation(error)) {
      throw new PreferencesError(
        "VERSION_CONFLICT",
        "Preferences were updated concurrently. Please retry.",
      );
    }
    throw error;
  }
}

// Mirrors the helper in auth.service.ts. Kept local so the two services stay
// independent of each other.
function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
