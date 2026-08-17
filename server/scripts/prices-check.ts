// Manual check for phase 5.1. Not part of the app.
//
// Calls getAllPrices() twice back to back. The first call must hit CoinGecko;
// the second must be served from the cache, which shows up as an identical
// fetchedAt and a duration of roughly zero. Run it with the seed script's
// runner: `npm run prices:check` (tsx scripts/prices-check.ts).
//
// Lives outside src/ so it is not compiled into dist/ or shipped.
import { getAllPrices, type PricesSnapshot } from "../src/prices/prices.service.js";

async function timed(label: string): Promise<PricesSnapshot> {
  const startedAt = process.hrtime.bigint();
  const snapshot = await getAllPrices();
  const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

  console.log(`\n${label} — ${ms.toFixed(1)}ms`);
  console.log(`  fetchedAt: ${snapshot.fetchedAt.toISOString()}`);
  console.log(`  isStale:   ${snapshot.isStale}`);
  console.log(`  assets:    ${snapshot.prices.length}`);
  for (const price of snapshot.prices) {
    const change =
      price.change24h === null ? "     n/a" : `${price.change24h.toFixed(2)}%`.padStart(8);
    console.log(
      `    ${price.symbol.padEnd(5)} ${`$${price.priceUsd.toLocaleString("en-US")}`.padStart(14)}` +
        `  ${change}  updated=${price.lastUpdatedAt ?? "n/a"}`,
    );
  }
  return snapshot;
}

async function main(): Promise<void> {
  const first = await timed("call 1 (cold cache)");
  const second = await timed("call 2 (should be cached)");

  const cached = first.fetchedAt.getTime() === second.fetchedAt.getTime();
  console.log(
    `\ncache ${cached ? "HIT" : "MISS"} — the second call ${cached ? "made no" : "MADE A SECOND"} external request.`,
  );
}

main().catch((error) => {
  console.error("\nprices-check failed:", error);
  process.exit(1);
});
