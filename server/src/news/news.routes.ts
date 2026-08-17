// The news endpoint.
//
// Same division of labour as the prices routes: validate, delegate, translate.
// The service owns the selection; this file shapes it into a response.
import { Router } from "express";
import { SectionType } from "../generated/prisma/enums.js";
import { requireAuth, UNAUTHORIZED_BODY } from "../middleware/require-auth.js";
import { getActivePreferences } from "../preferences/preferences.service.js";
import { getCurrentVote } from "../votes/votes.service.js";
import { getNewsForUser } from "./news.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  try {
    const preferences = await getActivePreferences(userId);

    // One contract for "you have not onboarded", whichever route notices it.
    // The selection needs the asset list, and voting needs a preference
    // version to attach to, so there is nothing to serve without this.
    if (!preferences) {
      res.status(404).json({
        error: "No preferences saved yet. Complete onboarding first.",
      });
      return;
    }

    // Genuinely independent: the vote is on the section, so it does not wait
    // on which articles were chosen.
    //
    // Both the assets and the investor type come from the preferences already
    // loaded above — the selection needs both, and neither is worth a second
    // query for.
    const [selection, vote] = await Promise.all([
      getNewsForUser(preferences.assets, preferences.investorType),
      getCurrentVote(userId, SectionType.NEWS),
    ]);

    // tags are not in the response. They are how the server chooses, not
    // something the client renders, and phase 7 owns explaining the choice.
    res.status(200).json({
      items: selection.items.map((item) => ({
        externalId: item.externalId,
        title: item.title,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
      })),
      vote,
    });
  } catch (error) {
    console.error("GET /news failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
