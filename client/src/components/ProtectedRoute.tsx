import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// Renders children only for a signed-in user.
//
// The loading check comes first and matters: redirecting while the stored
// token is still being validated would bounce a logged-in user to /login on
// every reload, which is exactly the flash this is meant to avoid.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="page-status">Loading…</p>;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
