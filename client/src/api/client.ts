// The single place that talks to the server.
//
// Two things are centralised here on purpose. First, the Authorization header:
// it is read from storage and attached in one function, so no component ever
// builds it and no call site can forget it. Second, error handling: every
// failure — a 4xx with a JSON body, an unreachable server, an HTML error page
// from a proxy — is normalised into one ApiError, so the UI renders errors
// from a single known shape instead of inspecting raw responses.
import { API_URL } from "../config/env";
import { getStoredToken } from "../auth/storage";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

/** Field name -> messages, as returned by the server's validation errors. */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  /** HTTP status, or 0 when the request never produced a response. */
  readonly status: number;
  /** Per-field validation messages, present only for 400 responses. */
  readonly fields?: FieldErrors;

  constructor(message: string, status: number, fields?: FieldErrors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Attach the stored bearer token. */
  auth?: boolean;
}

function isFieldErrors(value: unknown): value is FieldErrors {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(
    (messages) =>
      Array.isArray(messages) &&
      messages.every((message) => typeof message === "string"),
  );
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects for network-level failures. Status 0 marks "never
    // reached the server", which callers can distinguish from a real status.
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      0,
    );
  }

  // A body is not guaranteed to be JSON: proxies and crashes return HTML.
  let payload: unknown = null;
  const text = await response.text();
  if (text !== "") {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const record =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {};

    const message =
      typeof record.error === "string" && record.error !== ""
        ? record.error
        : `Request failed (${response.status})`;

    throw new ApiError(
      message,
      response.status,
      isFieldErrors(record.fields) ? record.fields : undefined,
    );
  }

  return payload as T;
}

export function register(input: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: input,
  });
}

export function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", { method: "POST", body: input });
}

export interface CurrentUserResponse {
  user: PublicUser;
  /** Whether onboarding is already complete. Decides where "/" sends the user. */
  hasActivePreferences: boolean;
}

export function fetchCurrentUser(): Promise<CurrentUserResponse> {
  return request<CurrentUserResponse>("/auth/me", { auth: true });
}

/** One selectable asset. `id` is the value submitted; the rest is display. */
export interface SupportedAsset {
  id: string;
  symbol: string;
  name: string;
}

export interface Preferences {
  assets: string[];
  investorType: string;
  topics: string[];
  version: number;
  createdAt: string;
}

export interface SavePreferencesInput {
  assets: string[];
  investorType: string;
  topics: string[];
}

// Fetched rather than hard-coded: the server's assets.ts is the single source
// of truth for which ids are valid.
export function fetchSupportedAssets(): Promise<{ assets: SupportedAsset[] }> {
  return request<{ assets: SupportedAsset[] }>("/preferences/assets", {
    auth: true,
  });
}

export function savePreferences(
  input: SavePreferencesInput,
): Promise<{ preferences: Preferences }> {
  return request<{ preferences: Preferences }>("/preferences", {
    method: "POST",
    body: input,
    auth: true,
  });
}

export type VoteValue = "UP" | "DOWN";

export interface AssetPrice {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  /** null when the provider reports the price as stale. Not the same as 0. */
  change24h: number | null;
  lastUpdatedAt: number | null;
}

export interface PricesResponse {
  prices: AssetPrice[];
  /** When the server fetched, not when the provider updated. */
  fetchedAt: string;
  /** True when the provider is unreachable and older prices are being served. */
  isStale: boolean;
  vote: VoteValue | null;
}

// No parameters, deliberately. The server derives the asset list from the
// caller's saved preferences, so there is nothing to send and no way for a
// request to ask for something the user did not choose.
export function fetchPrices(): Promise<PricesResponse> {
  return request<PricesResponse>("/prices", { auth: true });
}

export interface Meme {
  id: string;
  title: string;
  /** Alt text: describes the image for a reader who cannot see it. */
  body: string;
  imagePath: string;
}

export interface MemeResponse {
  meme: Meme;
  /** The vote on this meme, not on the section — it changes every request. */
  vote: VoteValue | null;
}

// No parameters, like fetchPrices: the server chooses which meme to serve and
// the client asks for nothing.
export function fetchMeme(): Promise<MemeResponse> {
  return request<MemeResponse>("/meme", { auth: true });
}

// One endpoint for every section, so the sections phase 6 adds reuse this
// unchanged. contentItemId is required by the server for the sections whose
// contents change between requests, and rejected for the ones where the
// section itself is what was voted on.
export function recordVote(input: {
  section: string;
  value: VoteValue;
  contentItemId?: string;
}): Promise<{ vote: VoteValue }> {
  return request<{ vote: VoteValue }>("/votes", {
    method: "POST",
    body: input,
    auth: true,
  });
}
