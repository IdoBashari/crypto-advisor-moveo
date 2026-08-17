import { InsightSection } from "../dashboard/InsightSection";
import { MemeSection } from "../dashboard/MemeSection";
import { NewsSection } from "../dashboard/NewsSection";
import { PricesSection } from "../dashboard/PricesSection";
import { useAuth } from "../auth/useAuth";

// The dashboard, and all four of its sections.
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

      {/* Prices first, then the insight that discusses them: the numbers it
          refers to are already on screen by the time it is read. */}
      <div className="dashboard-sections">
        <PricesSection />
        <InsightSection />
        <NewsSection />
        <MemeSection />
      </div>
    </main>
  );
}
