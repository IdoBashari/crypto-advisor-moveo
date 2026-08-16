import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../api/client";
import { AuthContext } from "./auth-context";
import type { AuthContextValue } from "./auth-context";
import { clearStoredToken, getStoredToken, setStoredToken } from "./storage";
import type { PublicUser } from "../api/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
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
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        // Expired, tampered, or belonging to a deleted account — all mean the
        // same thing here. Drop the token and continue as a logged-out user
        // rather than surfacing an error screen.
        clearStoredToken();
        if (active) setUser(null);
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
    },
    [],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const { user: existingUser, token } = await api.login(input);
      setStoredToken(token);
      setUser(existingUser);
    },
    [],
  );

  // Logout is purely local: tokens are stateless, so there is nothing on the
  // server to invalidate.
  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, register, login, logout }),
    [user, loading, register, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
