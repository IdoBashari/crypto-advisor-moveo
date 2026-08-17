// Reading votes. Writing arrives in 5.3.
//
// Vote is an append-only event log: every click is a new row and there is no
// unique constraint to update against. "The user's vote on this section" is
// therefore not a row that exists — it is the most recent row, and asking for
// it any other way returns whatever the database happened to hand back first.
import { prisma } from "../prisma.js";
import type { SectionType, VoteValue } from "../generated/prisma/enums.js";

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
