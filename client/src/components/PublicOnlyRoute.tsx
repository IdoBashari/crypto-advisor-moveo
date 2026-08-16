import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// The mirror of ProtectedRoute: keeps a signed-in user off /login and
// /register. It waits on the same loading flag, so a reload on one of those
// pages does not briefly show the form before redirecting.
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="page-status">Loading…</p>;
  }

  if (user !== null) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
