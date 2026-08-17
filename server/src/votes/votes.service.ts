// Reading and writing votes.
//
// Vote is an append-only event log: every click is a new row and there is no
// unique constraint to update against. "The user's vote on this section" is
// therefore not a row that exists — it is the most recent row, and asking for
// it any other way returns whatever the database happened to hand back first.
//
// Nothing here updates or deletes. Changing a vote appends the new value, so
// the sequence of clicks survives, which is the whole point of the table.
import { prisma } from "../prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import { SectionType } from "../generated/prisma/enums.js";
import type { VoteValue } from "../generated/prisma/enums.js";
import { getActivePreferencesRef } from "../preferences/preferences.service.js";
import { getPricesForAssets } from "../prices/prices.service.js";

/**
 * The user's current vote on a section, or null if they have never voted on it.
 *
 * Not filtered by userPreferencesId. That column records the context a vote
 * was cast in — it is history, not a lookup key — so filtering on it would
 * silently discard a user's vote the moment they edited their preferences,
 * which is the one thing the versioning was built to avoid.
 *
 * findFirst with an explicit descending order rather than findUnique: there is
 * no unique key here to look up by. The @@index([userId, section, createdAt])
 * exists for exactly this query, so the sort is served by the index.
 */
export async function getCurrentVote(
  userId: string,
  section: SectionType,
): Promise<VoteValue | null> {
  const vote = await prisma.vote.findFirst({
    where: { userId, section },
    orderBy: { createdAt: "desc" },
    // Only the value: the caller renders a button state, and the row's id,
    // context and timestamp are none of its business.
    select: { value: true },
  });

  return vote?.value ?? null;
}

export type VotesErrorCode = "NO_ACTIVE_PREFERENCES";

export class VotesError extends Error {
  readonly code: VotesErrorCode;

  constructor(code: VotesErrorCode, message: string) {
    super(message);
    this.name = "VotesError";
    this.code = code;
  }
}

/**
 * Appends a vote and returns the value that is now current.
 *
 * Always an insert. No lookup of the previous vote, no upsert, no delete: a
 * repeated identical value is a duplicate event, which is noise in a log, not
 * corruption of it. The client already prevents the common case (D27).
 *
 * The preference version is resolved here rather than taken from the request.
 * A vote records the context it was cast in, and a stale tab supplying its own
 * id would attach the vote to preferences the user had already replaced —
 * quietly, and in the one column the later training loop depends on.
 */
export async function recordVote(
  userId: string,
  section: SectionType,
  value: VoteValue,
): Promise<VoteValue> {
  const preferences = await getActivePreferencesRef(userId);

  // Voting is only reachable from a dashboard that preferences produced, so
  // their absence is the caller's state being wrong, not a vote to store
  // without context. Nothing is written on this path.
  if (!preferences) {
    throw new VotesError(
      "NO_ACTIVE_PREFERENCES",
      "No preferences saved yet. Complete onboarding first.",
    );
  }

  const created = await prisma.vote.create({
    data: {
      userId,
      section,
      value,
      userPreferencesId: preferences.id,
      contextSnapshot: await buildContextSnapshot(section, preferences.assets),
      // contentItemId stays null. PRICES is voted on but is never a stored
      // content item; how the other sections supply one is phase 6's problem.
    },
    // Read the stored value back rather than echoing the argument, so the
    // response states what the database holds.
    select: { value: true },
  });

  return created.value;
}

/**
 * What the user was looking at when they voted.
 *
 * Deliberately not a copy of their preferences: userPreferencesId already
 * links to that row in full, so duplicating it here would store nothing new.
 * The column is for the context recorded nowhere else — the actual numbers on
 * screen, which no later query could reconstruct.
 */
async function buildContextSnapshot(
  section: SectionType,
  assets: string[],
): Promise<Prisma.InputJsonObject> {
  // Sections other than PRICES get their shape in phase 6, when there is
  // something real to put in it. Inventing one now would only have to be
  // migrated.
  if (section !== SectionType.PRICES) {
    return { section };
  }

  try {
    // A cache read in all but the rare cold-and-expired case — voting does not
    // trigger provider traffic.
    const snapshot = await getPricesForAssets(assets);

    return {
      section,
      assets: snapshot.prices.map((price) => ({
        id: price.id,
        priceUsd: price.priceUsd,
        change24h: price.change24h,
      })),
      fetchedAt: snapshot.fetchedAt.toISOString(),
      isStale: snapshot.isStale,
    };
  } catch (error) {
    // Only reachable with a cold cache and a provider outage. The snapshot is
    // enrichment; the vote is the event. Dropping a user's click because a
    // third party is down would be the wrong half to lose.
    console.warn("Recording vote without a price snapshot:", error);
    return { section: SectionType.PRICES, snapshotUnavailable: true };
  }
}
