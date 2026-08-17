// Validation for the vote payload.
//
// Like the preferences schemas, this is the boundary where an untrusted body
// becomes a typed value the service can persist without re-checking. Both
// fields are bound to the generated Prisma enums, so a value the database
// would reject is rejected here first, with a message instead of a 500.
//
// strictObject, not object: the only fields a client may send are the ones
// below. userPreferencesId and contextSnapshot are derived server-side, and a
// request that tries to supply one is rejected rather than quietly ignored.
import { z } from "zod";
import { SectionType, VoteValue } from "../generated/prisma/enums.js";

// Listing the accepted values in the message keeps it accurate as the enums
// change, rather than restating them in prose that can drift.
const sectionValues = Object.values(SectionType).join(", ");
const voteValues = Object.values(VoteValue).join(", ");

// Sections whose contents change between requests, so a vote has to name the
// item it was cast on. For the others the section itself is the thing voted
// on: PRICES always shows the same saved assets, and NEWS is voted on as a
// section rather than per headline.
const SECTIONS_REQUIRING_ITEM: readonly SectionType[] = [
  SectionType.MEME,
  SectionType.AI_INSIGHT,
];

export const recordVoteSchema = z
  .strictObject({
    section: z.enum(SectionType, {
      error: `Unknown section. Choose from: ${sectionValues}.`,
    }),

    value: z.enum(VoteValue, {
      error: `A vote must be one of: ${voteValues}.`,
    }),

    // Optional at this level, then made conditionally required below. Which
    // sections need it is a rule about the pair, not about the field.
    contentItemId: z
      .string({ error: "contentItemId must be a string." })
      .min(1, "contentItemId cannot be empty.")
      .optional(),
  })
  // Rejecting rather than ignoring, for the same reason strictObject was
  // chosen: a caller sending a field that will not be stored needs to be told
  // so, not left to assume it was.
  .superRefine((input, ctx) => {
    const requiresItem = SECTIONS_REQUIRING_ITEM.includes(input.section);

    // path is set explicitly on both issues. A superRefine issue carries an
    // empty path by default, and fieldErrors builds its keys from issue.path,
    // so the message would arrive under "_" and never reach the field it is
    // about.
    if (requiresItem && input.contentItemId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["contentItemId"],
        // Phrased as "A vote on X" rather than "A X vote" so the message needs
        // no article in front of the section name — "A AI_INSIGHT vote" reads
        // as broken English written by a machine, which it would be.
        message: `A vote on ${input.section} must name the item it is cast on, because the section shows a different one each time.`,
      });
    }

    if (!requiresItem && input.contentItemId !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["contentItemId"],
        message: `A vote on ${input.section} is cast on the section itself, so it must not name a content item.`,
      });
    }
  });

export type RecordVoteInput = z.infer<typeof recordVoteSchema>;
