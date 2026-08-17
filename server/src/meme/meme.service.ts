// The meme catalog, and picking one to show.
//
// Memes are static content that ships with the code, not data the app
// produces, so the catalog lives in memes.json and is pushed into the database
// at startup. They are stored as ContentItem rows rather than read from the
// file per request because a vote has to point at a row: Vote.contentItemId is
// a foreign key, and a meme that exists only in a JSON file has nothing to
// point at.
import { prisma } from "../prisma.js";
import catalog from "./memes.json" with { type: "json" };

/** One entry as written in memes.json. */
export interface MemeCatalogEntry {
  externalId: string;
  title: string;
  body: string;
  imagePath: string;
  /** InvestorType values this meme suits. Read by phase 7, not by this file. */
  tags: string[];
}

/** What a caller gets: a meme, already reconciled with its stored metadata. */
export interface MemeView {
  id: string;
  title: string;
  /** Alt text. Describes the image for a reader who cannot see it. */
  body: string;
  imagePath: string;
}

const memes: MemeCatalogEntry[] = catalog;

// The last meme served to each user, so the next one differs. Process-local
// and lost on restart, which is the same trade the price cache makes: a
// repeat after a cold start is not worth a database table to prevent.
const lastServed = new Map<string, string>();

/**
 * Writes the catalog into the database. Safe to run on every boot.
 *
 * Upsert on the [type, externalId] unique key, with externalId derived from
 * the content rather than generated. A random id would insert a fresh row on
 * every restart, and the votes cast on the previous row would be left pointing
 * at a meme nobody is shown any more.
 *
 * Returns how many entries were synced, for the caller to log.
 */
export async function syncMemes(): Promise<number> {
  for (const meme of memes) {
    await prisma.contentItem.upsert({
      where: { type_externalId: { type: "MEME", externalId: meme.externalId } },
      // Title, body and metadata are editable in memes.json, so an existing
      // row is brought up to date rather than left at whatever it was first
      // created with. externalId and type are the identity and never change.
      update: {
        title: meme.title,
        body: meme.body,
        metadata: { imagePath: meme.imagePath, tags: meme.tags },
      },
      create: {
        type: "MEME",
        // Shared content: it belongs to no user and to no particular day.
        userId: null,
        forDate: null,
        externalId: meme.externalId,
        title: meme.title,
        body: meme.body,
        metadata: { imagePath: meme.imagePath, tags: meme.tags },
      },
    });
  }

  return memes.length;
}

/**
 * One meme for this user: tagged for their investor type or untagged, never
 * tagged for somebody else, and not the one they were shown last.
 *
 * The no-repeat exclusion is a preference, not a rule: with a single meme in
 * the pool the same one is served again rather than looping or failing.
 * Repetition is the correct answer when there is no alternative.
 */
export async function getMemeForUser(
  userId: string,
  investorType: string,
): Promise<MemeView> {
  const items = await prisma.contentItem.findMany({
    where: { type: "MEME" },
    select: { id: true, title: true, body: true, metadata: true },
    // A stable order so the randomness comes from the pick below and not from
    // whatever order the database happened to return.
    orderBy: { createdAt: "asc" },
  });

  // Not a data state the app can be in: syncMemes runs at startup and the
  // catalog ships with the code, so an empty table means the sync failed or
  // never ran. The caller turns this into a 500.
  if (items.length === 0) {
    throw new Error(
      "The meme catalog is empty. syncMemes() did not run or did not succeed.",
    );
  }

  // Profile first, then the no-repeat exclusion. The order matters: dropping
  // the previously served meme before narrowing to the profile can leave the
  // pool empty when the user's pool is small, and the fallbacks would then
  // widen it back to memes tagged for somebody else.
  const suited = items.filter((item) => {
    const tags = tagsOf(item.metadata);
    // Untagged memes suit everyone; tagged ones only their own type.
    return tags.length === 0 || tags.includes(investorType);
  });

  // Only reachable if the catalog loses its untagged entries, which would be a
  // gap in the catalog rather than a state to fail on. Serving a meme aimed at
  // another type beats serving nothing.
  const pool = suited.length > 0 ? suited : items;

  const previous = lastServed.get(userId);
  const unseen = pool.filter((item) => item.id !== previous);
  // Falling back to the whole pool covers a single-meme pool without a special
  // case: everything is excluded, so nothing is.
  const candidates = unseen.length > 0 ? unseen : pool;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  lastServed.set(userId, chosen.id);

  return {
    id: chosen.id,
    title: chosen.title ?? "",
    body: chosen.body,
    imagePath: imagePathOf(chosen.metadata, chosen.id),
  };
}

/**
 * The investor types a meme is tagged for, or an empty array.
 *
 * Same distrust as imagePathOf, for the same reason: metadata is an untyped
 * Json column. A row whose tags are missing, not an array, or full of numbers
 * returns empty rather than throwing — it then matches no investor type and is
 * treated as untagged, which suits everyone. One malformed row must not take
 * the section down.
 */
function tagsOf(metadata: unknown): string[] {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return [];
  }

  const tags = (metadata as Record<string, unknown>).tags;
  if (!Array.isArray(tags)) return [];

  return tags.filter((tag): tag is string => typeof tag === "string");
}

// metadata is an untyped Json column, so what comes back out of it is checked
// rather than trusted, exactly like a provider response.
function imagePathOf(metadata: unknown, id: string): string {
  if (typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)) {
    const value = (metadata as Record<string, unknown>).imagePath;
    if (typeof value === "string" && value !== "") return value;
  }

  // A meme row with no image is a broken row, but one broken row must not take
  // down the section. It is logged and served with an empty path, which the
  // client renders as a missing image rather than a crash.
  console.warn(`Meme ${id} has no imagePath in its metadata.`);
  return "";
}
