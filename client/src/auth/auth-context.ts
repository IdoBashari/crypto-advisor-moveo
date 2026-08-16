// The context object and its type live apart from the provider component so
// that the provider file only exports components — the project's lint config
// (react/only-export-components) flags mixing the two, and splitting keeps
// fast refresh working.
import { createContext } from "react";
import type { PublicUser } from "../api/client";

export interface AuthContextValue {
  user: PublicUser | null;
  /** True until the initial stored-token check has finished. */
  loading: boolean;
  register: (input: {
    email: string;
    name: string;
    password: string;
  }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
