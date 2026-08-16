import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../api/client";
import { AuthContext } from "./auth-context";
import type { AuthContextValue } from "./auth-context";
import { clearStoredToken, getStoredToken, setStoredToken } from "./storage";
import type { PublicUser } from "../api/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [hasActivePreferences, setHasActivePreferences] = useState(false);
  // Starts true only when there is a token worth checking. With no token the
  // answer is already known, so the app renders immediately instead of
  // flashing a spinner.
  const [loading, setLoading] = useState(() => getStoredToken() !== null);

  useEffect(() => {
    if (getStoredToken() === null) {
      return;
    }

    // Guards against a state update after unmount, and against StrictMode's
    // double effect invocation in development resolving out of order.
    let active = true;

    api
      .fetchCurrentUser()
      .then((session) => {
        if (!active) return;
        setUser(session.user);
        setHasActivePreferences(session.hasActivePreferences);
      })
      .catch(() => {
        // Expired, tampered, or belonging to a deleted account — all mean the
        // same thing here. Drop the token and continue as a logged-out user
        // rather than surfacing an error screen.
        clearStoredToken();
        if (!active) return;
        setUser(null);
        setHasActivePreferences(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const register = useCallback(
    async (input: { email: string; name: string; password: string }) => {
      const { user: newUser, token } = await api.register(input);
      setStoredToken(token);
      setUser(newUser);
      // An account that was created a moment ago cannot have preferences, so
      // this is known without asking the server.
      setHasActivePreferences(false);
    },
    [],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const { token } = await api.login(input);
      setStoredToken(token);

      // The login response carries the user but not the onboarding flag, and
      // "/" cannot decide without it. Resolving the session here keeps that
      // single request inside the context instead of pushing it into a route.
      try {
        const session = await api.fetchCurrentUser();
        setUser(session.user);
        setHasActivePreferences(session.hasActivePreferences);
      } catch (error) {
        // A token we cannot resolve is worse than no token: it would leave the
        // app authenticated with an unknown destination. Roll the whole login
        // back and let the form report the failure.
        clearStoredToken();
        setUser(null);
        setHasActivePreferences(false);
        throw error;
      }
    },
    [],
  );

  // Logout is purely local: tokens are stateless, so there is nothing on the
  // server to invalidate.
  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setHasActivePreferences(false);
  }, []);

  // Called after POST /preferences succeeds. A 201 means an active row now
  // exists, so the flag is set from that outcome rather than re-fetching it.
  const markPreferencesActive = useCallback(() => {
    setHasActivePreferences(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      hasActivePreferences,
      loading,
      register,
      login,
      logout,
      markPreferencesActive,
    }),
    [
      user,
      hasActivePreferences,
      loading,
      register,
      login,
      logout,
      markPreferencesActive,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
