// Validation for the vote payload.
//
// Like the preferences schemas, this is the boundary where an untrusted body
// becomes a typed value the service can persist without re-checking. Both
// fields are bound to the generated Prisma enums, so a value the database
// would reject is rejected here first, with a message instead of a 500.
//
// strictObject, not object: the only two fields a client may send are the two
// below. userPreferencesId, contentItemId and contextSnapshot are all derived
// server-side, and a request that tries to supply one is rejected rather than
// quietly ignored.
import { z } from "zod";
import { SectionType, VoteValue } from "../generated/prisma/enums.js";

// Listing the accepted values in the message keeps it accurate as the enums
// change, rather than restating them in prose that can drift.
const sectionValues = Object.values(SectionType).join(", ");
const voteValues = Object.values(VoteValue).join(", ");

export const recordVoteSchema = z.strictObject({
  section: z.enum(SectionType, {
    error: `Unknown section. Choose from: ${sectionValues}.`,
  }),

  value: z.enum(VoteValue, {
    error: `A vote must be one of: ${voteValues}.`,
  }),
});

export type RecordVoteInput = z.infer<typeof recordVoteSchema>;
