import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// The mirror of RequirePreferences, guarding /onboarding. Re-running onboarding
// would be an edit, and editing preferences is out of scope for phase 4, so a
// user who already has an active row is sent to the dashboard instead.
export function RequireNoPreferences({ children }: { children: ReactNode }) {
  const { hasActivePreferences, loading } = useAuth();

  if (loading) {
    return <p className="page-status">Loading…</p>;
  }

  if (hasActivePreferences) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
