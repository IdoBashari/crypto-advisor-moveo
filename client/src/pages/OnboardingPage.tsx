import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api/client";
import type { SupportedAsset } from "../api/client";
import { NO_FORM_ERROR, toFormError } from "../auth/form-error";
import type { FormErrorState } from "../auth/form-error";
import { useAuth } from "../auth/useAuth";
import { INVESTOR_TYPES } from "../preferences/investor-types";

// INVESTOR_TYPES moved to preferences/investor-types.ts when the dashboard
// needed the same labels. TOPICS stays here because only this screen uses it.
//
// Mirrors the server's ContentTopic enum. The values are the contract and must
// match exactly; the labels are display only. Unlike the asset list these are
// small, fixed enums with no API to fetch them from, so they live here — but a
// typo in a value is a 400 from the server, not a silent mismatch.
const TOPICS = [
  { value: "MARKET_NEWS", label: "Market News" },
  { value: "CHARTS", label: "Charts" },
  { value: "SOCIAL", label: "Social" },
  { value: "FUN", label: "Fun" },
] as const;

const MIN_ASSETS = 1;
const MAX_ASSETS = 5;

// The server reports validation problems keyed by field, sometimes indexed
// ("assets.0"). This collects every message belonging to one block.
function messagesFor(
  fields: Record<string, string[]>,
  field: string,
): string[] {
  return Object.entries(fields)
    .filter(([key]) => key === field || key.startsWith(`${field}.`))
    .flatMap(([, messages]) => messages);
}

function toggle(set: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { markPreferencesActive } = useAuth();

  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  const [selectedAssets, setSelectedAssets] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [investorType, setInvestorType] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FormErrorState>(NO_FORM_ERROR);

  useEffect(() => {
    let active = true;

    api
      .fetchSupportedAssets()
      .then(({ assets: list }) => {
        if (active) setAssets(list);
      })
      .catch((caught: unknown) => {
        // An empty block with no explanation would look like "there are no
        // assets" rather than "the request failed", so the reason is shown.
        if (active) setAssetsError(toFormError(caught).message);
      })
      .finally(() => {
        if (active) setAssetsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const assetCapReached = selectedAssets.size >= MAX_ASSETS;

  // Client-side gating guides the user; the server remains the authority and
  // its messages are what get displayed when it disagrees.
  const canSubmit =
    selectedAssets.size >= MIN_ASSETS &&
    selectedAssets.size <= MAX_ASSETS &&
    investorType !== null &&
    selectedTopics.size >= 1;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !canSubmit || investorType === null) return;

    setSubmitting(true);
    setError(NO_FORM_ERROR);

    try {
      await api.savePreferences({
        assets: [...selectedAssets],
        investorType,
        topics: [...selectedTopics],
      });

      // Order matters: the save succeeded, so the flag is updated from that
      // result before navigating. Navigating first would hand /dashboard a
      // still-false flag and bounce the user straight back here.
      markPreferencesActive();
      navigate("/dashboard");
    } catch (caught) {
      setError(toFormError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const assetErrors = messagesFor(error.fields, "assets");
  const investorTypeErrors = messagesFor(error.fields, "investorType");
  const topicErrors = messagesFor(error.fields, "topics");

  return (
    <main className="onboarding">
      <h1>Set up your dashboard</h1>
      <p className="onboarding-intro">
        Tell us what you follow. You can change any of this later.
      </p>

      <form className="onboarding-form" onSubmit={handleSubmit} noValidate>
        {error.message !== null && (
          <p className="form-error" role="alert">
            {error.message}
          </p>
        )}

        <fieldset className="block">
          <legend>
            Assets <span className="hint">pick {MIN_ASSETS}–{MAX_ASSETS}</span>
          </legend>

          {assetsLoading && (
            <p className="page-status" role="status">
              Loading assets… The API sleeps when idle, so the first request
              after a while can take up to a minute.
            </p>
          )}

          {assetsError !== null && (
            <p className="form-error" role="alert">
              {assetsError} The asset list could not be loaded, so onboarding
              cannot be completed right now.
            </p>
          )}

          {!assetsLoading && assetsError === null && (
            <>
              <div className="options">
                {assets.map((asset) => {
                  const checked = selectedAssets.has(asset.id);
                  return (
                    <label className="option" key={asset.id}>
                      <input
                        type="checkbox"
                        name="assets"
                        value={asset.id}
                        checked={checked}
                        // Once the cap is reached the remaining boxes disable,
                        // so the limit is visible instead of a click doing
                        // nothing.
                        disabled={!checked && assetCapReached}
                        onChange={() =>
                          setSelectedAssets((current) =>
                            toggle(current, asset.id),
                          )
                        }
                      />
                      <span>
                        {asset.name} <span className="symbol">{asset.symbol}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="counter">
                {selectedAssets.size} of {MAX_ASSETS} selected
              </p>
            </>
          )}

          {assetErrors.map((message) => (
            <p className="field-error" key={message}>
              {message}
            </p>
          ))}
        </fieldset>

        <fieldset className="block">
          <legend>Investor type</legend>
          <div className="options">
            {INVESTOR_TYPES.map((option) => (
              <label className="option" key={option.value}>
                <input
                  type="radio"
                  name="investorType"
                  value={option.value}
                  checked={investorType === option.value}
                  onChange={() => setInvestorType(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {investorTypeErrors.map((message) => (
            <p className="field-error" key={message}>
              {message}
            </p>
          ))}
        </fieldset>

        <fieldset className="block">
          <legend>
            Content topics <span className="hint">pick at least one</span>
          </legend>
          <div className="options">
            {TOPICS.map((option) => (
              <label className="option" key={option.value}>
                <input
                  type="checkbox"
                  name="topics"
                  value={option.value}
                  checked={selectedTopics.has(option.value)}
                  onChange={() =>
                    setSelectedTopics((current) =>
                      toggle(current, option.value),
                    )
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {topicErrors.map((message) => (
            <p className="field-error" key={message}>
              {message}
            </p>
          ))}
        </fieldset>

        <button type="submit" disabled={!canSubmit || submitting}>
          {submitting ? "Saving…" : "Save preferences"}
        </button>
      </form>
    </main>
  );
}
