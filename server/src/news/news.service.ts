// Choosing which news a user sees.
//
// Tags are a preference, not a filter. A user whose assets no article mentions
// still gets a full section, filled with general crypto news — the same rule
// the meme catalog follows. A section that empties itself because nobody wrote
// about Polkadot this week would look broken rather than quiet.
import { newsProvider, type NewsItem } from "./news.provider.js";

/** How many articles the section shows. */
const MAX_ITEMS = 4;

export interface NewsSelection {
  items: NewsItem[];
  /**
   * Whether any item was chosen because it mentions one of the user's assets.
   * A single flag, not a reason per item: phase 7 designs that across all four
   * sections at once.
   */
  matchedPreferences: boolean;
}

/**
 * At most four articles: the ones touching the user's assets first, then
 * general news to fill the gap.
 *
 * Both passes are newest first, and the second cannot repeat the first because
 * it only considers untagged items, which by definition matched nothing.
 */
export async function getNewsForUser(
  assetIds: readonly string[],
): Promise<NewsSelection> {
  const all = await newsProvider.getItems();
  const wanted = new Set(assetIds);

  const matching = byNewestFirst(
    all.filter((item) => item.tags.some((tag) => wanted.has(tag))),
  );

  // Untagged rather than "everything else": an article tagged for an asset the
  // user does not hold is about something they did not ask for, so it is not
  // filler. General news is.
  const general = byNewestFirst(all.filter((item) => item.tags.length === 0));

  const items = [...matching, ...general].slice(0, MAX_ITEMS);

  return {
    items,
    // Whether a match actually reached the screen, not merely that one exists:
    // with five tagged articles and a cap of four, the flag still describes
    // what was served.
    matchedPreferences: items.some((item) =>
      item.tags.some((tag) => wanted.has(tag)),
    ),
  };
}

// Sorted on a copy: the provider hands out its own array and sorting in place
// would reorder it for everyone.
function byNewestFirst(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
