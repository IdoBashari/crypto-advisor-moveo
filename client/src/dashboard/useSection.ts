// One section's data, its loading flag and its error message.
//
// This is the effect already written by hand in OnboardingPage — the `active`
// flag, the three pieces of state, the `.finally` — lifted so the four
// dashboard sections share one copy instead of four. That it is a refactor of
// code already working is the reason no data-fetching library is being added
// for it.
import { useCallback, useEffect, useRef, useState } from "react";
import { sectionErrorMessage } from "./section-error";

export interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useSection<T>(load: () => Promise<T>): SectionState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumped by reload(); the only thing that re-runs the fetch.
  const [attempt, setAttempt] = useState(0);

  // The loader is held in a ref so the effect below depends on `attempt` alone.
  // A caller passing an inline arrow would otherwise hand this hook a new
  // function on every render, re-running the fetch, setting state, and
  // rendering again without end.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    loadRef
      .current()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(sectionErrorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // A response that arrives after the section unmounts, or after a retry
    // superseded it, is dropped rather than written to state.
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { data, loading, error, reload };
}
