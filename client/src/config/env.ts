// Client environment configuration.
//
// Validated at import rather than at first fetch, so a missing variable shows
// up as a clear error when the app boots instead of as a confusing request to
// "undefined/auth/login" much later.

const rawApiUrl: unknown = import.meta.env.VITE_API_URL;

if (typeof rawApiUrl !== "string" || rawApiUrl.trim() === "") {
  throw new Error(
    "Missing required environment variable VITE_API_URL. " +
      "Copy client/.env.example to client/.env and set it to the server URL.",
  );
}

// Trailing slashes are stripped so request paths can be joined with a single
// leading slash without producing a double slash.
export const API_URL = rawApiUrl.trim().replace(/\/+$/, "");
