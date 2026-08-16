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

router.get("/me", requireAuth, async (req, res) => {
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

    res.status(200).json({ preferences });
  } catch (error) {
    console.error("GET /preferences/me failed:", error);
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
