// The only module in the codebase that knows CoinGecko exists.
//
// Everything above this file speaks in AssetPrice objects, so swapping the
// provider means rewriting this file and nothing else. In exchange, this file
// carries all of the distrust: the provider's response is untyped JSON from a
// third party and is validated field by field before it is allowed out.
import { env } from "../config/env.js";
import {
  SUPPORTED_ASSETS,
  SUPPORTED_ASSET_IDS,
  type SupportedAssetId,
} from "../preferences/assets.js";

// Demo-plan keys target api.coingecko.com. pro-api.coingecko.com is for paid
// plans and rejects our key, so this host is not a detail to "modernise".
const BASE_URL = "https://api.coingecko.com/api/v3";

// Without a deadline a hanging provider request hangs ours: the fetch would
// wait on the OS default (minutes) while a user stares at a spinner.
const REQUEST_TIMEOUT_MS = 8000;

/** One asset's market data, already reconciled with our own catalog. */
export interface AssetPrice {
  id: SupportedAssetId;
  symbol: string;
  name: string;
  priceUsd: number;
  /** null when CoinGecko reports the price as stale. */
  change24h: number | null;
  /** Provider's own timestamp, unix seconds. Null when absent. */
  lastUpdatedAt: number | null;
}

export type PriceProviderErrorCode =
  | "TIMEOUT"
  | "NETWORK"
  | "RATE_LIMITED"
  | "HTTP_ERROR"
  | "INVALID_BODY"
  | "NO_PRICES";

// A typed error rather than a bare Error, mirroring PreferencesError: the
// caller (the cache in prices.service) treats every failure the same way, but
// the code makes a log line or a future retry policy possible without parsing
// message strings.
export class PriceProviderError extends Error {
  readonly code: PriceProviderErrorCode;

  constructor(code: PriceProviderErrorCode, message: string) {
    super(message);
    this.name = "PriceProviderError";
    this.code = code;
  }
}

/**
 * Current USD prices for every supported asset, in catalog order.
 *
 * Always one request for the whole catalog, never a per-user subset. The
 * catalog is closed and small, so a single global call serves every user at
 * once and keeps our external usage independent of how many people are signed
 * in — ten users looking at five different assets still cost one request.
 *
 * Resolves with a partial list when the provider omits an asset; rejects when
 * it gives us nothing usable at all.
 */
export async function fetchAllPrices(): Promise<AssetPrice[]> {
  const url = new URL(`${BASE_URL}/simple/price`);
  url.searchParams.set("ids", SUPPORTED_ASSET_IDS.join(","));
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_24hr_change", "true");
  url.searchParams.set("include_last_updated_at", "true");

  const body = await requestJson(url);
  return mapPrices(body);
}

/**
 * Performs the request and returns the parsed body, or throws.
 *
 * Every way this can fail — timeout, DNS, non-2xx, a proxy's HTML error page —
 * ends as a PriceProviderError, so the mapper below only ever sees a value
 * that genuinely came back as JSON.
 */
async function requestJson(url: URL): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // The key travels as a header, not a query parameter. CoinGecko
        // recommends this precisely because query strings leak into access
        // logs, proxies and Referer headers.
        "x-cg-demo-api-key": env.coingeckoApiKey,
        accept: "application/json",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new PriceProviderError(
        "TIMEOUT",
        `CoinGecko did not respond within ${REQUEST_TIMEOUT_MS}ms.`,
      );
    }
    throw new PriceProviderError(
      "NETWORK",
      `Could not reach CoinGecko: ${errorMessage(error)}`,
    );
  } finally {
    // Cleared on every path, including success: an uncleared timer keeps the
    // process alive for the full timeout after the work is done.
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 429) {
      // The one failure we caused rather than suffered, so it gets its own
      // line: it means our call rate outgrew the plan, and the fix is the
      // cache TTL, not a retry.
      console.error(
        "CoinGecko rate limit reached (429). We are calling more often than the plan allows.",
      );
      throw new PriceProviderError(
        "RATE_LIMITED",
        "CoinGecko rate limit reached (429).",
      );
    }
    throw new PriceProviderError(
      "HTTP_ERROR",
      `CoinGecko responded with ${response.status} ${response.statusText}.`,
    );
  }

  try {
    return await response.json();
  } catch (error) {
    // A gateway or captive portal answering with HTML lands here. Better a
    // thrown error than NaN prices flowing onward.
    throw new PriceProviderError(
      "INVALID_BODY",
      `CoinGecko returned a body that is not JSON: ${errorMessage(error)}`,
    );
  }
}

/**
 * Turns the provider's untyped object into AssetPrice records.
 *
 * Iterates our own catalog rather than the response keys: the order the user
 * sees comes from assets.ts, symbol and name come from assets.ts, and an
 * unexpected extra key in the response is simply not our concern.
 */
function mapPrices(body: unknown): AssetPrice[] {
  if (!isRecord(body)) {
    throw new PriceProviderError(
      "INVALID_BODY",
      "CoinGecko returned a payload that is not an object.",
    );
  }

  const prices: AssetPrice[] = [];
  const skipped: string[] = [];

  for (const asset of SUPPORTED_ASSETS) {
    const quote = body[asset.id];
    // A missing or malformed id costs us that one asset, never the section.
    // CoinGecko ids do get renamed and coins do get delisted, and one of those
    // must not blank the dashboard for every user.
    if (!isRecord(quote) || !isFiniteNumber(quote.usd)) {
      skipped.push(asset.id);
      continue;
    }

    prices.push({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      priceUsd: quote.usd,
      // Documented as null when the price is stale. Mapping that to 0 would
      // render as a genuine "flat, no change today", which is a lie.
      change24h: isFiniteNumber(quote.usd_24h_change) ? quote.usd_24h_change : null,
      lastUpdatedAt: isFiniteNumber(quote.last_updated_at)
        ? quote.last_updated_at
        : null,
    });
  }

  // One line after the loop, not one per asset: a provider-wide id change
  // would otherwise print ten near-identical warnings.
  if (skipped.length > 0) {
    console.warn(
      `CoinGecko returned no usable USD price for: ${skipped.join(", ")}`,
    );
  }

  // A partial result is a success; an empty one is a failed request wearing a
  // 200. Throwing here keeps an empty array from being cached as the truth.
  if (prices.length === 0) {
    throw new PriceProviderError(
      "NO_PRICES",
      "CoinGecko returned no usable price for any supported asset.",
    );
  }

  return prices;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Rejects NaN and Infinity as well as non-numbers: JSON can carry neither, so
// either one means we misread the shape.
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
