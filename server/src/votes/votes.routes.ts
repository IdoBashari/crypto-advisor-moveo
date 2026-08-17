// Vote endpoints.
//
// Same division of labour as the preferences routes: validate, delegate,
// translate. One generic endpoint serves all four dashboard sections — the
// section is a field, not a path — so phase 6 adds sections without adding
// routes.
//
// There is no GET here on purpose: GET /prices already carries the caller's
// current vote, and a second way to ask the same question is a second thing
// that can disagree.
import { Router } from "express";
import type { ZodError } from "zod";
import { requireAuth, UNAUTHORIZED_BODY } from "../middleware/require-auth.js";
import { recordVoteSchema } from "./votes.schemas.js";
import { recordVote, VotesError } from "./votes.service.js";

const router = Router();

// Mirrors the helper in preferences.routes.ts. Kept local so the routers stay
// independent of each other.
function fieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_";
    (fields[field] ??= []).push(issue.message);
  }
  return fields;
}

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  const parsed = recordVoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      fields: fieldErrors(parsed.error),
    });
    return;
  }

  try {
    const value = await recordVote(
      userId,
      parsed.data.section,
      parsed.data.value,
      parsed.data.contentItemId,
    );
    // The value the server now holds, so the client confirms against the
    // database rather than against its own optimistic state.
    res.status(201).json({ vote: value });
  } catch (error) {
    if (error instanceof VotesError && error.code === "NO_ACTIVE_PREFERENCES") {
      // Same wording and shape as GET /prices and GET /preferences/me: one
      // contract for "you have not onboarded", whichever route notices.
      res.status(404).json({ error: error.message });
      return;
    }
    console.error("POST /votes failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
