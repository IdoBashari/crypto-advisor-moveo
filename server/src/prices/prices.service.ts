// The cache in front of CoinGecko, and the only entry point routes may use.
//
// Prices are read far more often than they change and every read costs quota
// from a shared plan, so the number of external calls has to depend on the
// clock rather than on traffic. Everything here exists to keep that true: one
// module-level entry shared by all users, and one in-flight promise shared by
// concurrent callers.
//
// The cache is process-local and deliberately not persisted. It holds nothing
// that survives a restart usefully — a cold process simply fetches once.
import { fetchAllPrices, type AssetPrice } from "./coingecko.js";

// CoinGecko refreshes /simple/price once every 60s on the free plan, so a
// shorter TTL would spend quota to receive an identical response.
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  prices: AssetPrice[];
  fetchedAt: Date;
}

/** What a caller receives: the data, its age, and whether it is a fallback. */
export interface PricesSnapshot {
  prices: AssetPrice[];
  /** When we fetched, not when CoinGecko updated. */
  fetchedAt: Date;
  /** True only when a refresh was attempted, failed, and older data is served. */
  isStale: boolean;
}

// One entry for the whole catalog rather than one per asset: every fetch
// returns all ten together, so per-asset entries would only invent the
// possibility of them disagreeing about when they were fetched.
let cache: CacheEntry | null = null;

// Holds the fetch that is currently running, if any. Two users arriving in the
// same second must cost one external call, not two.
let inFlight: Promise<AssetPrice[]> | null = null;

/**
 * Prices for every supported asset, from cache when it is fresh enough.
 *
 * Cold cache and a failed fetch is the only case that rejects. Once we have
 * ever succeeded, a provider outage degrades to stale data instead of an
 * error: a price from an hour ago carrying an honest timestamp is a better
 * answer than an empty screen, and the caller decides how to present it.
 * Stale data is therefore served with no age limit.
 */
export async function getAllPrices(): Promise<PricesSnapshot> {
  const previous = cache;

  if (previous !== null && !isExpired(previous)) {
    return snapshotOf(previous, false);
  }

  try {
    const prices = await refresh();
    // Written here rather than inside refresh() so the entry and the timestamp
    // are created together. Concurrent callers sharing one fetch each write an
    // equivalent entry; last write wins and every fetchedAt is truthful.
    const entry: CacheEntry = { prices, fetchedAt: new Date() };
    cache = entry;
    return snapshotOf(entry, false);
  } catch (error) {
    if (previous === null) {
      // Nothing to fall back to. The caller has to hear about this.
      throw error;
    }
    console.warn(
      `Price refresh failed, serving prices cached at ${previous.fetchedAt.toISOString()}:`,
      error,
    );
    return snapshotOf(previous, true);
  }
}

/**
 * The same snapshot, narrowed to the given asset ids and left in catalog order.
 *
 * Filtering happens after the fetch, never before it: the request is always
 * for the full catalog, so one user's selection never shapes what we ask the
 * provider for. Unknown ids simply match nothing.
 */
export async function getPricesForAssets(
  assetIds: readonly string[],
): Promise<PricesSnapshot> {
  const snapshot = await getAllPrices();
  const wanted = new Set(assetIds);

  return {
    ...snapshot,
    // Filters the catalog-ordered list, so the result follows assets.ts rather
    // than the order the caller happened to pass ids in.
    prices: snapshot.prices.filter((price) => wanted.has(price.id)),
  };
}

/**
 * Starts a fetch, or joins the one already running.
 *
 * The promise is cleared in `finally` rather than after a successful `then`,
 * so a failed fetch does not leave every later caller awaiting a rejected
 * promise forever.
 */
function refresh(): Promise<AssetPrice[]> {
  if (inFlight === null) {
    inFlight = fetchAllPrices().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt.getTime() >= CACHE_TTL_MS;
}

// Copies the array so a caller cannot mutate what stays in the cache.
function snapshotOf(entry: CacheEntry, isStale: boolean): PricesSnapshot {
  return { prices: [...entry.prices], fetchedAt: entry.fetchedAt, isStale };
}
