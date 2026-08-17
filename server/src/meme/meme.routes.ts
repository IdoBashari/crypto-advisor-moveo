// The meme endpoint.
//
// Same division of labour as the prices routes: validate, delegate, translate.
// The service owns the catalog and the choice; this file maps its results to a
// status code.
import { Router } from "express";
import { SectionType } from "../generated/prisma/enums.js";
import { requireAuth, UNAUTHORIZED_BODY } from "../middleware/require-auth.js";
import { getActivePreferences } from "../preferences/preferences.service.js";
import { getCurrentVote } from "../votes/votes.service.js";
import { getMemeForUser } from "./meme.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  try {
    // The meme itself does not depend on preferences. The guard is here
    // because voting on it does: without it the section would load cleanly and
    // then fail on the user's first click. One contract for "you have not
    // onboarded", whichever route notices it first.
    const preferences = await getActivePreferences(userId);
    if (!preferences) {
      res.status(404).json({
        error: "No preferences saved yet. Complete onboarding first.",
      });
      return;
    }

    // The investor type comes from the preferences already loaded above for
    // the guard, so narrowing the meme pool costs no extra query.
    const meme = await getMemeForUser(userId, preferences.investorType);

    // Sequential rather than a Promise.all: the vote lookup needs the id of
    // the meme that was chosen, so there is nothing to overlap it with. The
    // two reads in GET /prices are genuinely independent; these are not.
    //
    // The vote is asked for this meme, not for the MEME section: the section
    // shows a different item on every request, so a section-wide answer would
    // light the button on a meme the user has never seen.
    const vote = await getCurrentVote(userId, SectionType.MEME, meme.id);

    // The current vote travels in the section's own response rather than from
    // a separate endpoint (D32): a second way to ask the same question is a
    // second thing that can disagree.
    res.status(200).json({ meme, vote });
  } catch (error) {
    // An empty catalog lands here. It is a build fault rather than something
    // the caller did, so it is logged in full and answered generically.
    console.error("GET /meme failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
