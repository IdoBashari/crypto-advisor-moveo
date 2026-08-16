import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// Guards /dashboard: a user who has not onboarded has nothing to show there.
//
// The loading check repeats ProtectedRoute's rather than assuming it, because
// redirecting on an unresolved flag would bounce a user with preferences to
// onboarding for a frame.
export function RequirePreferences({ children }: { children: ReactNode }) {
  const { hasActivePreferences, loading } = useAuth();

  if (loading) {
    return <p className="page-status">Loading…</p>;
  }

  if (!hasActivePreferences) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
