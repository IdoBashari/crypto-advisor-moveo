// One definition of what a section error looks like on screen.
//
// request() already normalises every failure — a 4xx body, an unreachable
// server, an HTML page from a proxy — into ApiError, so its message is the one
// to render. auth/form-error is not used here: that helper exists to split a
// 400 into per-field messages for a form, and a section has no fields.
import { ApiError } from "../api/client";

/**
 * A displayable sentence for whatever was caught.
 *
 * The fallback is a parameter because the two call sites are read in different
 * places: a failed load stands alone, while a failed vote follows a sentence
 * that has already said what did not happen. What must not vary — and is
 * therefore fixed here — is that only an ApiError's own message is ever shown,
 * and that it always ends as a sentence.
 */
export function sectionErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!(error instanceof ApiError)) return fallback;
  // Server messages are written as standalone lines and do not all end in a
  // full stop, so one is added rather than running two sentences together.
  return /[.!?]$/.test(error.message) ? error.message : `${error.message}.`;
}
