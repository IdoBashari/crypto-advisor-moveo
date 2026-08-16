// The only module in the app that touches localStorage.
//
// Every access is guarded: reading `window.localStorage` itself throws in
// Safari's private mode and wherever site data is blocked, and writing throws
// when the quota is full. None of that should take the app down, so a failure
// degrades to "no stored token" — the user stays logged in for the session and
// is simply asked to log in again next time.

const TOKEN_KEY = "crypto-advisor.auth-token";

export function getStoredToken(): string | null {
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    return token !== null && token !== "" ? token : null;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable. The in-memory session still works.
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clean up if storage was never reachable.
  }
}
