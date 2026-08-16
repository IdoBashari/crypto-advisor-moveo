import { useAuth } from "../auth/useAuth";

// Placeholder for the real dashboard. Step 3.5 only needs somewhere behind the
// protected wrapper that proves who is signed in and can sign them out again.
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="dashboard">
      <h1>Crypto Advisor</h1>
      <p>
        Signed in as <strong>{user?.name}</strong>
      </p>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </main>
  );
}
