// The context object and its type live apart from the provider component so
// that the provider file only exports components — the project's lint config
// (react/only-export-components) flags mixing the two, and splitting keeps
// fast refresh working.
import { createContext } from "react";
import type { PublicUser } from "../api/client";

export interface AuthContextValue {
  user: PublicUser | null;
  /**
   * Whether the user has completed onboarding. Sourced from /auth/me and held
   * here so the routing decision is made in one place from one value, rather
   * than each route issuing its own request.
   *
   * Only meaningful once `loading` is false. Redirecting on it while the
   * session is still resolving would briefly read false and flash onboarding
   * at a user who already has preferences.
   */
  hasActivePreferences: boolean;
  /** True until the initial stored-token check has finished. */
  loading: boolean;
  register: (input: {
    email: string;
    name: string;
    password: string;
  }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  /**
   * Records that preferences now exist, after a successful save. Keeps the
   * guards in step without a page reload or a second /auth/me round trip.
   */
  markPreferencesActive: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
