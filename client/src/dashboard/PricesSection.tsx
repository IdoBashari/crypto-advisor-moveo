// The prices section: the user's assets, their price, and their 24h change.
//
// All of the state lives in useSection and all of the frame lives in
// SectionCard, so what remains here is the part that is actually about prices.
import * as api from "../api/client";
import type { VoteValue } from "../api/client";
import { formatChange, formatTime, formatUsd } from "./format";
import { SectionCard } from "./SectionCard";
import { useSection } from "./useSection";

function handleVote(value: VoteValue) {
  return api.recordVote({ section: "PRICES", value });
}

export function PricesSection() {
  // api.fetchPrices is passed by reference: it takes no arguments because the
  // server reads the asset list from the caller's saved preferences.
  const { data, loading, error, reload } = useSection(api.fetchPrices);

  const prices = data?.prices ?? [];

  return (
    <SectionCard
      title="Prices"
      loading={loading}
      error={error}
      onRetry={reload}
      // Reachable without anything going wrong: every id the user saved can be
      // missing from the provider's response.
      isEmpty={prices.length === 0}
      emptyMessage="No prices to show for your saved assets right now."
      vote={data?.vote ?? null}
      onVote={handleVote}
      footer={
        // Only while the provider is unreachable, and an absolute time rather
        // than "4 minutes ago" — a relative age would need an interval running
        // in the background to stay true, to maintain a label that appears
        // only during an outage. Informative, not an alarm.
        data?.isStale ? (
          <p className="section-footer">Prices from {formatTime(data.fetchedAt)}</p>
        ) : null
      }
    >
      <ul className="price-list">
        {prices.map((price) => (
          <li className="price-row" key={price.id}>
            <span className="price-asset">
              {price.name} <span className="symbol">{price.symbol}</span>
            </span>
            <span className="price-value">{formatUsd(price.priceUsd)}</span>
            <span className="price-change">
              {/* An em dash, not a hidden cell and not 0%. The provider sends
                  null when a price is stale, which is not the same as no
                  movement, and an omitted value would leave the row short
                  beside the others. */}
              {price.change24h === null ? "—" : formatChange(price.change24h)}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
