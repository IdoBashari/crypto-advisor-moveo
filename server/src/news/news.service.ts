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
   * Whether any item reached the screen because of who this user is — their
   * assets or their investor type. A single flag, not a reason per item:
   * phase 7 designs that across all four sections at once.
   */
  matchedPreferences: boolean;
}

/**
 * At most four articles, in three passes: articles about the user's assets,
 * then articles written for their investor type, then general news to fill
 * whatever is left.
 *
 * The passes are no longer disjoint by construction. An article may carry both
 * a coin tag and an investorTypes value, so a Bitcoin piece aimed at day
 * traders would qualify under passes 1 and 2 alike — hence the dedupe below,
 * which the earlier two-pass version did not need.
 */
export async function getNewsForUser(
  assetIds: readonly string[],
  investorType: string,
): Promise<NewsSelection> {
  const all = await newsProvider.getItems();
  const wanted = new Set(assetIds);

  const matching = byNewestFirst(
    all.filter((item) => item.tags.some((tag) => wanted.has(tag))),
  );

  const profiled = byNewestFirst(
    all.filter((item) => item.investorTypes?.includes(investorType) ?? false),
  );

  // Filler is anything carrying no coin, including the articles aimed at a
  // particular investor type. An NFT piece is still general crypto news to a
  // day trader, and dropping it from this pool would mean it could only ever
  // be seen by collectors.
  //
  // It cannot appear twice for a collector: it qualifies here and under
  // profiled, and the dedupe below keeps the earlier, higher-priority copy.
  const general = byNewestFirst(all.filter((item) => item.tags.length === 0));

  const items = dedupe([...matching, ...profiled, ...general]).slice(
    0,
    MAX_ITEMS,
  );

  return {
    items,
    // Whether a match actually reached the screen, not merely that one exists:
    // with more qualifying articles than slots, the flag still describes what
    // was served rather than what was available.
    matchedPreferences: items.some(
      (item) =>
        item.tags.some((tag) => wanted.has(tag)) ||
        (item.investorTypes?.includes(investorType) ?? false),
    ),
  };
}

// Keeps the first occurrence, so an article qualifying under two passes stays
// at the higher-priority position rather than being pushed down the list.
function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.externalId)) return false;
    seen.add(item.externalId);
    return true;
  });
}

// Sorted on a copy: the provider hands out its own array and sorting in place
// would reorder it for everyone.
function byNewestFirst(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
