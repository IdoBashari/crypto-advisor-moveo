// The daily insight: find today's, or generate and store one.
//
// The cache is the quota control. OpenRouter's free tier is 50 requests a day
// across the whole account, so at most one call per user per day is not a
// nicety — a refresh loop without it would exhaust the day in a minute.
import { prisma } from "../prisma.js";
import { getPricesForAssets } from "../prices/prices.service.js";
import {
  generateCompletion,
  type ChatMessage,
} from "./openrouter.js";
import { buildInsightPrompt, INSIGHT_SYSTEM_PROMPT } from "./prompt.js";

/** Shown when there is nothing generated and nothing stored to fall back on. */
const FALLBACK_TEXT =
  "Your insight could not be generated right now. Your prices, news and meme are unaffected, and a new one will be written the next time this section loads successfully.";

export interface InsightView {
  /** Null only for the static fallback, which is not a stored row. */
  id: string | null;
  body: string;
  /** ISO date (YYYY-MM-DD), or null for the static fallback. */
  forDate: string | null;
  /**
   * False when the generator failed and something older is being shown, so
   * the client can label it rather than passing a stale insight off as today's.
   */
  isFromToday: boolean;
}

export interface InsightInput {
  assets: string[];
  investorType: string;
  topics: string[];
}

/**
 * Today, as a date rather than a moment.
 *
 * UTC, deliberately. forDate is a @db.Date column and two users in different
 * timezones share one process, so "today" has to mean the same thing for both
 * — the same choice formatDate makes on the client, and for the same reason.
 * A user just past midnight local time sees yesterday's insight for a few
 * hours, which is a better outcome than two rows for one calendar day
 * colliding on the unique constraint.
 */
function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The user's insight for today.
 *
 * Four links, in order: today's stored row, a fresh generation, the most
 * recent older row, and finally a static sentence. The third matters most —
 * a real insight written for this reader, a day old and labelled as such,
 * beats generic filler, and the daily cache makes it free.
 */
export async function getInsightForUser(
  userId: string,
  input: InsightInput,
): Promise<InsightView> {
  const forDate = todayUtc();

  // 1. Today's, if it exists. No call, no cost.
  const existing = await prisma.contentItem.findUnique({
    where: {
      userId_type_forDate: { userId, type: "AI_INSIGHT", forDate },
    },
    select: { id: true, body: true, forDate: true },
  });

  if (existing) {
    return viewOf(existing, true);
  }

  // 2. Generate.
  try {
    const { prices } = await getPricesForAssets(input.assets);
    const messages: ChatMessage[] = [
      { role: "system", content: INSIGHT_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildInsightPrompt({ ...input, prices }),
      },
    ];

    const completion = await generateCompletion(messages);

    // 3. Store it. Upsert rather than create, and no pre-check: the unique on
    // [userId, type, forDate] is what enforces one per day, and two requests
    // arriving together would both have passed a check in code.
    const stored = await prisma.contentItem.upsert({
      where: {
        userId_type_forDate: { userId, type: "AI_INSIGHT", forDate },
      },
      update: {},
      create: {
        type: "AI_INSIGHT",
        userId,
        forDate,
        body: completion.text,
        metadata: { model: completion.model },
      },
      select: { id: true, body: true, forDate: true },
    });

    return viewOf(stored, true);
  } catch (error) {
    console.error("Insight generation failed:", error);

    // 4. The most recent one written for this user, whatever its date.
    const previous = await prisma.contentItem.findFirst({
      where: { userId, type: "AI_INSIGHT" },
      orderBy: { forDate: "desc" },
      select: { id: true, body: true, forDate: true },
    });

    if (previous) {
      return viewOf(previous, false);
    }

    // 5. Nothing to fall back on.
    return { id: null, body: FALLBACK_TEXT, forDate: null, isFromToday: false };
  }
}

function viewOf(
  row: { id: string; body: string; forDate: Date | null },
  isFromToday: boolean,
): InsightView {
  return {
    id: row.id,
    body: row.body,
    forDate: row.forDate ? toIsoDate(row.forDate) : null,
    isFromToday,
  };
}
