// Preferences endpoints.
//
// Same division of labour as the auth routes: validate, delegate, translate.
// The service owns Prisma and the versioning transaction; this file maps a
// typed service error to a status code and never inspects an error string.
// Both routes sit behind requireAuth and return the identical body shape, so
// the frontend has one contract regardless of which it called.
import { Router } from "express";
import type { ZodError } from "zod";
import { requireAuth, UNAUTHORIZED_BODY } from "../middleware/require-auth.js";
import { SUPPORTED_ASSETS } from "./assets.js";
import { savePreferencesSchema } from "./schemas.js";
import {
  getActivePreferences,
  PreferencesError,
  savePreferences,
} from "./preferences.service.js";

const router = Router();

function fieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_";
    (fields[field] ??= []).push(issue.message);
  }
  return fields;
}

// The selectable asset list, served verbatim from assets.ts. It exists so the
// client never keeps a second copy: a hard-coded list in the frontend would
// drift from the ids the server validates against and the ones CoinGecko
// expects, and nothing would fail loudly when it did.
router.get("/assets", requireAuth, (_req, res) => {
  res.status(200).json({ assets: SUPPORTED_ASSETS });
});

// GET and POST on the same path, which is what the resource is: one set of
// preferences belonging to the caller. There is no id in the path because
// there is nothing to address — the token says whose they are.
router.get("/", requireAuth, async (req, res) => {
  // req.userId is optional on the augmented type because it applies to every
  // request, so it is narrowed rather than asserted.
  const userId = req.userId;
  if (!userId) {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  try {
    const preferences = await getActivePreferences(userId);

    if (!preferences) {
      res.status(404).json({
        error: "No preferences saved yet. Complete onboarding first.",
      });
      return;
    }

    // assets are returned as stored — CoinGecko ids, not symbols. Turning
    // "bitcoin" into "BTC" needs the catalog, which the client already fetches
    // for onboarding, so doing it here would duplicate that lookup server-side.
    res.status(200).json({ preferences });
  } catch (error) {
    console.error("GET /preferences failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  const parsed = savePreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      fields: fieldErrors(parsed.error),
    });
    return;
  }

  try {
    const preferences = await savePreferences(userId, parsed.data);
    res.status(201).json({ preferences });
  } catch (error) {
    if (error instanceof PreferencesError && error.code === "VERSION_CONFLICT") {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error("POST /preferences failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
