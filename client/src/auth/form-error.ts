import { ApiError } from "../api/client";
import type { FieldErrors } from "../api/client";

export interface FormErrorState {
  /** General message shown above the form, or null when there is none. */
  message: string | null;
  /** Per-field messages, keyed by input name. Empty when not a 400. */
  fields: FieldErrors;
}

export const NO_FORM_ERROR: FormErrorState = { message: null, fields: {} };

// The single funnel every caught error passes through before it can reach the
// screen. Anything that is not a recognised ApiError becomes a fixed generic
// sentence, which is what guarantees no raw error object or stack is ever
// rendered, however the failure arose.
export function toFormError(error: unknown): FormErrorState {
  if (error instanceof ApiError) {
    return { message: error.message, fields: error.fields ?? {} };
  }
  return {
    message: "Something went wrong. Please try again.",
    fields: {},
  };
}
