// Where news items come from.
//
// The interface is load-bearing rather than decorative. CryptoPanic closed its
// free tier, so what ships is the static catalog below — but a live provider
// implements this same shape, and swapping one in should be a new file and a
// changed export at the bottom of this one, not a rewrite of the section. The
// service above it never learns which kind it is holding.
import catalog from "./news.json" with { type: "json" };

export interface NewsItem {
  externalId: string;
  title: string;
  source: string;
  url: string;
  /** ISO date string. */
  publishedAt: string;
  /** Asset ids from preferences/assets.ts, or empty for general news. */
  tags: string[];
  /** InvestorType values this article suits. Absent on most articles. */
  investorTypes?: string[];
}

export interface NewsProvider {
  getItems(): Promise<NewsItem[]>;
}

/**
 * The catalog that ships with the code.
 *
 * Async despite resolving immediately: the interface is written for a provider
 * that makes a network call, and having the static one match that shape is
 * what keeps the two interchangeable.
 */
export class StaticNewsProvider implements NewsProvider {
  private readonly items: NewsItem[];

  constructor(items: NewsItem[] = catalog) {
    this.items = items;
  }

  async getItems(): Promise<NewsItem[]> {
    // A copy, so a caller sorting or splicing the result cannot reorder the
    // catalog for every request that follows it.
    return [...this.items];
  }
}

// The single instance the service uses. Replacing the static catalog with a
// live feed is a change to this line.
export const newsProvider: NewsProvider = new StaticNewsProvider();
