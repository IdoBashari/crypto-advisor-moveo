import { MemeSection } from "../dashboard/MemeSection";
import { NewsSection } from "../dashboard/NewsSection";
import { PricesSection } from "../dashboard/PricesSection";
import { useAuth } from "../auth/useAuth";

// The dashboard. One section today; the list below is where the other three
// join it in phase 6, which is why it is a list and not a single child.
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Crypto Advisor</h1>
          <p className="dashboard-greeting">
            Signed in as <strong>{user?.name}</strong>
          </p>
        </div>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </header>

      <div className="dashboard-sections">
        <PricesSection />
        <NewsSection />
        <MemeSection />
      </div>
    </main>
  );
}
