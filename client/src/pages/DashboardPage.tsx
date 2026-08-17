import * as api from "../api/client";
import { InsightSection } from "../dashboard/InsightSection";
import { MemeSection } from "../dashboard/MemeSection";
import { NewsSection } from "../dashboard/NewsSection";
import { PricesSection } from "../dashboard/PricesSection";
import { useSection } from "../dashboard/useSection";
import { investorTypeLabel } from "../preferences/investor-types";
import { useAuth } from "../auth/useAuth";

// The dashboard, and all four of its sections.
export function DashboardPage() {
  const { user, logout } = useAuth();

  // Two reads for the banner, independent of the sections and of each other.
  // Their errors are deliberately unused: this line explains the content
  // below it, so failing to build it is a reason to say nothing, never a
  // reason to put an error where the explanation would have been. The four
  // sections load and report on their own.
  const preferences = useSection(api.fetchPreferences);
  const catalog = useSection(api.fetchSupportedAssets);

  const profile = describeProfile(
    preferences.data?.preferences,
    catalog.data?.assets,
  );

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Crypto Advisor</h1>
          <p className="dashboard-greeting">
            Signed in as <strong>{user?.name}</strong>
          </p>
          {profile !== null && <p className="dashboard-profile">{profile}</p>}
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

/**
 * The one-line summary, or null when there is nothing worth saying.
 *
 * Topics are deliberately absent: they shape the insight's tone rather than
 * which content appears, so naming them here would explain the wrong thing.
 */
function describeProfile(
  preferences: api.Preferences | undefined,
  catalog: api.SupportedAsset[] | undefined,
): string | null {
  if (!preferences || !catalog) return null;

  const segments: string[] = [];

  // Omitted rather than printed raw if the value is unrecognised: a stray
  // "NFT_COLLECTOR" on screen is worse than a shorter line.
  const label = investorTypeLabel(preferences.investorType);
  if (label !== null) segments.push(label);

  // Ids are what the server stores; symbols are what the user chose from. An
  // id missing from the catalog is skipped for the same reason as above.
  const symbols = preferences.assets
    .map((id) => catalog.find((asset) => asset.id === id)?.symbol)
    .filter((symbol): symbol is string => symbol !== undefined);

  if (symbols.length > 0) segments.push(symbols.join(", "));

  if (segments.length === 0) return null;

  return `Curated for you — ${segments.join(" · ")}`;
}
