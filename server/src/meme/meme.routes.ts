// The meme endpoint.
//
// Same division of labour as the prices routes: validate, delegate, translate.
// The service owns the catalog and the choice; this file maps its results to a
// status code.
import { Router } from "express";
import { requireAuth, UNAUTHORIZED_BODY } from "../middleware/require-auth.js";
import { getActivePreferences } from "../preferences/preferences.service.js";
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

    const meme = await getMemeForUser(userId);

    // No vote field yet. 6.2 adds it, once a vote can address a content item.
    res.status(200).json({ meme });
  } catch (error) {
    // An empty catalog lands here. It is a build fault rather than something
    // the caller did, so it is logged in full and answered generically.
    console.error("GET /meme failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
