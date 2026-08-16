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

export function fetchCurrentUser(): Promise<{ user: PublicUser }> {
  return request<{ user: PublicUser }>("/auth/me", { auth: true });
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
