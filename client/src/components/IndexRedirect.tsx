import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// "/" decides and renders nothing of its own. Keeping the decision here rather
// than inside the dashboard — or duplicated in the login and register screens —
// means there is exactly one place that answers "where does this user belong".
//
// It sits inside ProtectedRoute, which has already resolved `loading` and
// guaranteed a user, so `hasActivePreferences` is settled by the time this
// renders and cannot be read while still false-by-default.
export function IndexRedirect() {
  const { hasActivePreferences } = useAuth();

  return (
    <Navigate to={hasActivePreferences ? "/dashboard" : "/onboarding"} replace />
  );
}
