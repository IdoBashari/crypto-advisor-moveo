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

// After a failure, wait before trying the provider again. Long enough that a
// provider outage does not make every request pay the full timeout, short
// enough that recovery is noticed quickly.
const RETRY_AFTER_FAILURE_MS = 30_000;

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

// When the last refresh failed, if one has. Without this an outage would make
// every single request wait out the provider timeout before serving the stale
// data it was always going to serve.
let lastFailedAt: Date | null = null;

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

  // Expired, but a recent attempt already failed and we have something to
  // serve. Retrying now would make this request wait out the timeout to reach
  // the same stale answer, and would do it again for the request after that.
  //
  // A cold cache never takes this path: with nothing to fall back on, failing
  // fast is no better than trying, and the caller has to hear about a failure
  // either way.
  if (previous !== null && isWithinFailureBackoff()) {
    return snapshotOf(previous, true);
  }

  try {
    const prices = await refresh();
    // Any success ends the backoff, including one that follows a long outage.
    lastFailedAt = null;
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
    lastFailedAt = new Date();
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
    // One line per external call rather than per caller, so the log shows what
    // we actually spend: concurrent requests that share a fetch print one.
    console.log("Refreshing prices from CoinGecko.");
    inFlight = fetchAllPrices().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt.getTime() >= CACHE_TTL_MS;
}

function isWithinFailureBackoff(): boolean {
  return (
    lastFailedAt !== null &&
    Date.now() - lastFailedAt.getTime() < RETRY_AFTER_FAILURE_MS
  );
}

// Copies the array so a caller cannot add or remove entries in what stays in
// the cache. The AssetPrice objects themselves are shared, not cloned.
function snapshotOf(entry: CacheEntry, isStale: boolean): PricesSnapshot {
  return { prices: [...entry.prices], fetchedAt: entry.fetchedAt, isStale };
}
