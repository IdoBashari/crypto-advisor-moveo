// The news section: up to four headlines, chosen server-side from the user's
// assets, each linking out to whoever published it.
//
// Modelled on PricesSection, including handleVote at module level: a news vote
// is cast on the section as a whole, so the handler closes over nothing.
import * as api from "../api/client";
import type { VoteValue } from "../api/client";
import { formatDate } from "./format";
import { SectionCard } from "./SectionCard";
import { useSection } from "./useSection";

function handleVote(value: VoteValue) {
  return api.recordVote({ section: "NEWS", value });
}

export function NewsSection() {
  const { data, loading, error, reload } = useSection(api.fetchNews);

  const items = data?.items ?? [];

  return (
    <SectionCard
      title="News"
      loading={loading}
      error={error}
      onRetry={reload}
      // Unlike the meme, this can legitimately be empty: the selection could
      // in principle match nothing and find no general news to fall back on.
      isEmpty={items.length === 0}
      emptyMessage="No articles to show right now."
      vote={data?.vote ?? null}
      onVote={handleVote}
    >
      <ul className="news-list">
        {items.map((item) => (
          <li className="news-item" key={item.externalId}>
            <a
              className="news-link"
              href={item.url}
              target="_blank"
              // noopener stops the opened page reaching back through
              // window.opener; noreferrer keeps our URL out of its logs.
              rel="noopener noreferrer"
            >
              {item.title}
            </a>
            <p className="news-meta">
              {item.source} ·{" "}
              {/* dateTime keeps the machine-readable ISO value on the element
                  while the text shows the short form. */}
              <time dateTime={item.publishedAt}>
                {formatDate(item.publishedAt)}
              </time>
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
