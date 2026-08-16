import { useContext } from "react";
import { AuthContext } from "./auth-context";
import type { AuthContextValue } from "./auth-context";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  // Null only if a component is rendered outside the provider, which is a
  // wiring bug rather than a runtime condition worth handling in the UI.
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
