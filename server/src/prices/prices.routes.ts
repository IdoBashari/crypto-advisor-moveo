// The prices endpoint.
//
// Same division of labour as the preferences routes: the services own the
// provider, the cache and Prisma; this file assembles their results and maps a
// typed service error to a status code. No controller layer, because there is
// nothing between the router and the services to put in one.
//
// The client sends no asset list, no currency and no filter of any kind. What
// a user sees is derived server-side from their saved preferences, so a
// tampered request cannot widen the response and the endpoint has no surface
// area to validate.
import { Router } from "express";
import { SectionType } from "../generated/prisma/enums.js";
import { requireAuth, UNAUTHORIZED_BODY } from "../middleware/require-auth.js";
import { getActivePreferences } from "../preferences/preferences.service.js";
import { getCurrentVote } from "../votes/votes.service.js";
import { PriceProviderError } from "./coingecko.js";
import { getPricesForAssets } from "./prices.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  try {
    const preferences = await getActivePreferences(userId);

    // The route guard in the client keeps this unreachable in practice. The
    // server does not rely on that, and answers the same way GET
    // /preferences does rather than inventing a second contract for it.
    if (!preferences) {
      res.status(404).json({
        error: "No preferences saved yet. Complete onboarding first.",
      });
      return;
    }

    // Independent reads, so they overlap: the vote query costs a round trip to
    // the database that need not wait behind a possible provider call.
    const [snapshot, vote] = await Promise.all([
      getPricesForAssets(preferences.assets),
      getCurrentVote(userId, SectionType.PRICES),
    ]);

    // An empty prices array with isStale false is a real state, not an error:
    // every id the user saved can be absent from the provider's response. The
    // client renders that as an empty section, which is the truth.
    res.status(200).json({
      prices: snapshot.prices,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      isStale: snapshot.isStale,
      vote,
    });
  } catch (error) {
    // Only reachable on a cold cache — with anything cached the service serves
    // it as stale and this never throws.
    if (error instanceof PriceProviderError) {
      // The provider's name, status and error code stay in the log. Telling a
      // client which upstream we use and how it broke helps nobody who can act
      // on it.
      console.error("GET /prices: price provider unavailable:", error);
      res.status(503).json({
        error: "Prices are temporarily unavailable. Please try again shortly.",
      });
      return;
    }

    console.error("GET /prices failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
