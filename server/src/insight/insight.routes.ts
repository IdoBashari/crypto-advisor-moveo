// The insight endpoint.
//
// Same division of labour as the prices routes: validate, delegate, translate.
import { Router } from "express";
import { SectionType } from "../generated/prisma/enums.js";
import { requireAuth, UNAUTHORIZED_BODY } from "../middleware/require-auth.js";
import { getActivePreferences } from "../preferences/preferences.service.js";
import { getCurrentVote } from "../votes/votes.service.js";
import { getInsightForUser } from "./insight.service.js";

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
    // Here the preferences are also the entire input to the prompt, so there
    // is nothing to generate without them.
    if (!preferences) {
      res.status(404).json({
        error: "No preferences saved yet. Complete onboarding first.",
      });
      return;
    }

    const insight = await getInsightForUser(userId, {
      assets: preferences.assets,
      investorType: preferences.investorType,
      topics: preferences.topics,
    });

    // Sequential, like the meme and unlike prices: the vote is per item and
    // the lookup needs the id of the insight that was just served.
    //
    // Which id that is comes from the server's own choice rather than from
    // anything the caller asked for — the request carries no parameters at
    // all. The static fallback is not a stored row, so it has no vote to
    // read and none can be cast on it.
    const vote =
      insight.id === null
        ? null
        : await getCurrentVote(userId, SectionType.AI_INSIGHT, insight.id);

    res.status(200).json({ insight, vote });
  } catch (error) {
    console.error("GET /insight failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
