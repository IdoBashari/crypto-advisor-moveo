// Seed data for Phase 2. Idempotent: every row is upserted by a unique key, so
// running this repeatedly leaves the database in the same state.
//
// The two users are deliberate opposites — they are the side-by-side test users
// for the Phase 7 comparison.
import { prisma } from "../src/prisma.js";

// Real password hashing arrives in Phase 3. This value is obviously not a hash
// so it can never be mistaken for a working credential.
const PLACEHOLDER_PASSWORD_HASH = "seed-placeholder-not-a-real-hash";

// @db.Date columns store a calendar day, so normalise to UTC midnight.
function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

async function main() {
  const forDate = todayUtc();

  // --- Users -------------------------------------------------------------
  const hodler = await prisma.user.upsert({
    where: { email: "hodler@example.com" },
    update: { name: "Hanna Hodler" },
    create: {
      email: "hodler@example.com",
      name: "Hanna Hodler",
      passwordHash: PLACEHOLDER_PASSWORD_HASH,
    },
  });

  const trader = await prisma.user.upsert({
    where: { email: "trader@example.com" },
    update: { name: "Dana Daytrader" },
    create: {
      email: "trader@example.com",
      name: "Dana Daytrader",
      passwordHash: PLACEHOLDER_PASSWORD_HASH,
    },
  });

  // --- Preferences (version 1, active) -----------------------------------
  const hodlerPrefs = await prisma.userPreferences.upsert({
    where: { userId_version: { userId: hodler.id, version: 1 } },
    update: {},
    create: {
      userId: hodler.id,
      version: 1,
      assets: ["BTC", "ETH"],
      investorType: "HODLER",
      topics: ["MARKET_NEWS", "CHARTS"],
    },
  });

  const traderPrefs = await prisma.userPreferences.upsert({
    where: { userId_version: { userId: trader.id, version: 1 } },
    update: {},
    create: {
      userId: trader.id,
      version: 1,
      assets: ["SOL", "DOGE"],
      investorType: "DAY_TRADER",
      topics: ["SOCIAL", "FUN"],
    },
  });

  // --- Shared content (userId and forDate stay null) ----------------------
  const news = [
    {
      externalId: "news-btc-etf-inflows",
      title: "Bitcoin ETFs post a third straight week of inflows",
      body: "Spot bitcoin ETFs recorded net inflows for the third consecutive week, with institutional allocations leading the move.",
      sourceUrl: "https://example.com/news/btc-etf-inflows",
    },
    {
      externalId: "news-eth-staking-yield",
      title: "Ethereum staking yield settles near 3.2%",
      body: "Validator rewards have stabilised as the staking queue clears, leaving yields close to their long-run average.",
      sourceUrl: "https://example.com/news/eth-staking-yield",
    },
    {
      externalId: "news-sol-throughput",
      title: "Solana sustains record throughput after client upgrade",
      body: "The latest validator client release pushed sustained transaction throughput to a new high without an increase in skipped slots.",
      sourceUrl: "https://example.com/news/sol-throughput",
    },
  ];

  const newsItems = [];
  for (const item of news) {
    newsItems.push(
      await prisma.contentItem.upsert({
        where: { type_externalId: { type: "NEWS", externalId: item.externalId } },
        update: { title: item.title, body: item.body },
        create: {
          type: "NEWS",
          externalId: item.externalId,
          title: item.title,
          body: item.body,
          metadata: { sourceUrl: item.sourceUrl },
        },
      }),
    );
  }

  const memes = [
    {
      externalId: "meme-buy-high-sell-low",
      title: "Buy high, sell low",
      body: "The eternal retail strategy, illustrated.",
      imagePath: "/memes/buy-high-sell-low.png",
    },
    {
      externalId: "meme-this-is-fine-portfolio",
      title: "This is fine",
      body: "Portfolio down 40%, conviction unchanged.",
      imagePath: "/memes/this-is-fine.png",
    },
    {
      externalId: "meme-wen-moon",
      title: "Wen moon",
      body: "Asking the important questions since 2013.",
      imagePath: "/memes/wen-moon.png",
    },
  ];

  const memeItems = [];
  for (const item of memes) {
    memeItems.push(
      await prisma.contentItem.upsert({
        where: { type_externalId: { type: "MEME", externalId: item.externalId } },
        update: { title: item.title, body: item.body },
        create: {
          type: "MEME",
          externalId: item.externalId,
          title: item.title,
          body: item.body,
          metadata: { imagePath: item.imagePath },
        },
      }),
    );
  }

  // --- AI insights: one per user per day ---------------------------------
  const hodlerInsight = await prisma.contentItem.upsert({
    where: {
      userId_type_forDate: { userId: hodler.id, type: "AI_INSIGHT", forDate },
    },
    update: {},
    create: {
      type: "AI_INSIGHT",
      userId: hodler.id,
      forDate,
      title: "Your long-term thesis is intact",
      body: "BTC and ETH are both holding above their 200-day averages. Nothing in today's flow data argues for changing a buy-and-hold position.",
      metadata: { modelUsed: "seed-placeholder", promptVersion: "v0" },
    },
  });

  const traderInsight = await prisma.contentItem.upsert({
    where: {
      userId_type_forDate: { userId: trader.id, type: "AI_INSIGHT", forDate },
    },
    update: {},
    create: {
      type: "AI_INSIGHT",
      userId: trader.id,
      forDate,
      title: "Volatility is where your edge is today",
      body: "SOL and DOGE are both showing widening intraday ranges. Watch the first hour of US trading for a direction before sizing up.",
      metadata: { modelUsed: "seed-placeholder", promptVersion: "v0" },
    },
  });

  // --- Votes --------------------------------------------------------------
  // Vote is an append-only log with no natural unique key, so seeded rows carry
  // deterministic ids purely so this script stays idempotent. Votes created by
  // the application always use generated ids.
  const votes = [
    {
      id: "seed-vote-hodler-news",
      userId: hodler.id,
      section: "NEWS" as const,
      contentItemId: newsItems[0].id,
      value: "UP" as const,
      userPreferencesId: hodlerPrefs.id,
      contextSnapshot: undefined,
    },
    {
      id: "seed-vote-hodler-meme",
      userId: hodler.id,
      section: "MEME" as const,
      contentItemId: memeItems[0].id,
      value: "DOWN" as const,
      userPreferencesId: hodlerPrefs.id,
      contextSnapshot: undefined,
    },
    {
      // PRICES has no stored content item, so the voted-on context is captured
      // in the snapshot instead.
      id: "seed-vote-hodler-prices",
      userId: hodler.id,
      section: "PRICES" as const,
      contentItemId: null,
      value: "UP" as const,
      userPreferencesId: hodlerPrefs.id,
      contextSnapshot: { assets: ["BTC", "ETH"] },
    },
    {
      id: "seed-vote-trader-meme",
      userId: trader.id,
      section: "MEME" as const,
      contentItemId: memeItems[2].id,
      value: "UP" as const,
      userPreferencesId: traderPrefs.id,
      contextSnapshot: undefined,
    },
    {
      id: "seed-vote-trader-insight",
      userId: trader.id,
      section: "AI_INSIGHT" as const,
      contentItemId: traderInsight.id,
      value: "UP" as const,
      userPreferencesId: traderPrefs.id,
      contextSnapshot: undefined,
    },
  ];

  for (const vote of votes) {
    await prisma.vote.upsert({
      where: { id: vote.id },
      update: {},
      create: vote,
    });
  }

  console.log("Seed complete:");
  console.log(`  users:         ${[hodler, trader].length}`);
  console.log(`  preferences:   ${[hodlerPrefs, traderPrefs].length}`);
  console.log(`  news items:    ${newsItems.length}`);
  console.log(`  meme items:    ${memeItems.length}`);
  console.log(`  ai insights:   ${[hodlerInsight, traderInsight].length}`);
  console.log(`  votes:         ${votes.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
