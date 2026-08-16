// Validation for the onboarding preferences payload.
//
// Like the auth schemas, this is the boundary where an untrusted request body
// becomes a typed value the service layer can persist without re-checking.
// The asset list and the investor/topic enums are bound to their single
// sources of truth — assets.ts and the generated Prisma enums — so a value
// that would violate the database schema is rejected here first.
import { z } from "zod";
import { ContentTopic, InvestorType } from "../generated/prisma/enums.js";
import { MAX_ASSETS, MIN_ASSETS, SUPPORTED_ASSET_IDS } from "./assets.js";

// Listing the accepted values in the message keeps it accurate as the enums
// change, rather than restating them in prose that can drift.
const investorTypeValues = Object.values(InvestorType).join(", ");
const topicValues = Object.values(ContentTopic).join(", ");

const ASSET_COUNT_MESSAGE = `Select between ${MIN_ASSETS} and ${MAX_ASSETS} assets.`;

function hasNoDuplicates(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export const savePreferencesSchema = z.strictObject({
  assets: z
    .array(
      z.enum(SUPPORTED_ASSET_IDS, {
        error: "Unknown asset. Choose from the supported assets list.",
      }),
      { error: "Assets must be a list of supported asset ids." },
    )
    .min(MIN_ASSETS, ASSET_COUNT_MESSAGE)
    .max(MAX_ASSETS, ASSET_COUNT_MESSAGE)
    .refine(hasNoDuplicates, "Each asset can only be selected once."),

  investorType: z.enum(InvestorType, {
    error: `Choose one investor type: ${investorTypeValues}.`,
  }),

  topics: z
    .array(
      z.enum(ContentTopic, {
        error: `Unknown topic. Choose from: ${topicValues}.`,
      }),
      { error: "Topics must be a list of supported topics." },
    )
    .min(1, "Select at least one topic.")
    .refine(hasNoDuplicates, "Each topic can only be selected once."),
});

export type SavePreferencesInput = z.infer<typeof savePreferencesSchema>;
