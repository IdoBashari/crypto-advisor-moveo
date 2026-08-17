// The prompt, kept in its own file so it can be read and adjusted without
// touching the service that sends it.
//
// The governing rule: every fact the insight may use is supplied here. One of
// the three fallback models has a mid-2024 knowledge cutoff, so anything it
// recalls about a price is both stale and confidently stated. The prompt
// therefore hands over the numbers and forbids any others.
// From coingecko.ts, where the type is declared. prices.service re-uses it
// without re-exporting it, and this phase does not touch prices/.
import type { AssetPrice } from "../prices/coingecko.js";

/** Everything the prompt needs about one user. */
export interface InsightPromptInput {
  assets: string[];
  investorType: string;
  topics: string[];
  prices: AssetPrice[];
}

// Tone is chosen by topic rather than described in prose, so a new topic is a
// line here rather than a rewrite. Ordered by priority: a user who picked both
// FUN and CHARTS gets the first one listed that they selected.
const TONE_BY_TOPIC: ReadonlyArray<readonly [string, string]> = [
  ["FUN", "Light and playful. A dry joke is welcome; keep it short."],
  [
    "MARKET_NEWS",
    "Analytical and plain, the register of a market report rather than a pundit.",
  ],
  [
    "CHARTS",
    "Lean on the numbers themselves — magnitudes and direction of the moves.",
  ],
  [
    "SOCIAL",
    "Lean on mood and sentiment, how the day is likely being talked about.",
  ],
];

const DEFAULT_TONE = "Neutral and plain.";

function toneFor(topics: string[]): string {
  const selected = new Set(topics);
  for (const [topic, tone] of TONE_BY_TOPIC) {
    if (selected.has(topic)) return tone;
  }
  return DEFAULT_TONE;
}

// A change of 0.4% and one of -0.4% must not read the same, so direction is
// spelled out rather than left to the model to infer from a minus sign.
function describe(price: AssetPrice): string {
  const change =
    price.change24h === null
      ? "24h change unavailable"
      : `${price.change24h >= 0 ? "up" : "down"} ${Math.abs(price.change24h).toFixed(2)}% over 24h`;

  return `- ${price.name} (${price.symbol}): $${price.priceUsd.toLocaleString("en-US")}, ${change}`;
}

/**
 * The system message: the rules, which do not vary between users.
 *
 * Separated from the user message so the constraints are not buried among the
 * day's numbers, and so a model that weights system content differently still
 * sees them as instructions rather than context.
 */
export const INSIGHT_SYSTEM_PROMPT = [
  "You write a single short daily insight for one crypto investor.",
  "",
  "Rules, all of them mandatory:",
  "- Two or three sentences. Not a list, no headings, no bullet points.",
  "- Observation only. Never advice. Do not suggest buying, selling, holding,",
  "  taking profit, or any price target. This is not financial advice and must",
  "  not read like it.",
  "- Refer to the assets you are given and the movement you are given.",
  "- Use ONLY the numbers supplied in the message. Do not recall or estimate",
  "  any price from memory: your training data is out of date and any figure",
  "  you remember is wrong.",
  "- Plain text. No markdown, no bold, no preamble such as 'Here is your",
  "  insight'. Reply with the sentences and nothing else.",
].join("\n");

/** The user message: this reader, their holdings, today's numbers. */
export function buildInsightPrompt(input: InsightPromptInput): string {
  const priceLines =
    input.prices.length > 0
      ? input.prices.map(describe).join("\n")
      : "- (no price data available today)";

  // An asset the user holds that the price provider did not return. Named
  // rather than omitted, so the model does not invent a number for a holding
  // it can see referenced nowhere.
  // Widened to string: AssetPrice.id is the narrow catalog union, while the
  // user's stored assets are plain strings from the database.
  const priced = new Set<string>(input.prices.map((price) => price.id));
  const unpriced = input.assets.filter((asset) => !priced.has(asset));

  return [
    `Investor type: ${input.investorType}`,
    `Interests: ${input.topics.join(", ") || "none specified"}`,
    `Tone: ${toneFor(input.topics)}`,
    "",
    "Their assets and today's numbers:",
    priceLines,
    ...(unpriced.length > 0
      ? [
          "",
          `No data today for: ${unpriced.join(", ")}. Do not mention a price for these.`,
        ]
      : []),
    "",
    "Write the insight now.",
  ].join("\n");
}
