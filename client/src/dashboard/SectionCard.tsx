// The frame every dashboard section is rendered in.
//
// It owns the four states, the vote buttons and nothing else. It has no idea
// what a price is, and a prop that would only ever make sense for one section
// does not belong here — that is what keeps the three sections phase 6 adds to
// their own content and no plumbing.
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "../api/client";
import type { VoteValue } from "../api/client";

// The same sentence the onboarding screen uses. A free Render instance sleeps
// when idle and the first request after that can take up to a minute, which
// looks like a hang unless it is explained — but it is explained once, in the
// same words, wherever the user first waits.
const COLD_START_NOTE =
  "The API sleeps when idle, so the first request after a while can take up to a minute.";

// What went wrong, as a sentence that can follow another one. Server messages
// are written as standalone lines and do not all end in a full stop, so one is
// added when it is missing rather than running the two together.
function reason(error: unknown): string {
  if (!(error instanceof ApiError)) return "Please try again.";
  return /[.!?]$/.test(error.message) ? error.message : `${error.message}.`;
}

interface SectionCardProps {
  title: string;
  loading: boolean;
  error: string | null;
  /** Loaded successfully, with nothing to show. Not a failure. */
  isEmpty?: boolean;
  emptyMessage?: string;
  /** The vote the server holds. Null when the user has not voted. */
  vote: VoteValue | null;
  onVote: (value: VoteValue) => Promise<unknown>;
  onRetry?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}

export function SectionCard({
  title,
  loading,
  error,
  isEmpty = false,
  emptyMessage = "Nothing to show yet.",
  vote,
  onVote,
  onRetry,
  footer,
  children,
}: SectionCardProps) {
  // The button state is held here rather than read straight from the prop so
  // a click can show its result before the server has confirmed it.
  const [selected, setSelected] = useState<VoteValue | null>(vote);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  // A reload brings the server's answer back; adopt it.
  useEffect(() => {
    setSelected(vote);
  }, [vote]);

  async function handleVote(value: VoteValue) {
    // Clicking the active value does nothing and sends nothing (D27). These
    // buttons pick a value; they do not toggle one off.
    if (value === selected) return;
    // A second click while the first is still in flight is ignored rather than
    // queued. The buttons stay enabled through it: the optimistic state
    // already shows the result, and greying them out for 300ms on every vote
    // would be the flicker this whole approach exists to avoid.
    if (voting) return;

    const previous = selected;
    setSelected(value);
    setVoteError(null);
    setVoting(true);

    try {
      await onVote(value);
    } catch (caught) {
      // Nothing was recorded, so the button must not keep claiming otherwise.
      setSelected(previous);
      setVoteError(`Your vote was not saved. ${reason(caught)}`);
    } finally {
      setVoting(false);
    }
  }

  // Nothing to vote on while the section is loading or broken, and no honest
  // value to show on the buttons either.
  const showVote = !loading && error === null;

  return (
    <section className="section-card">
      <header className="section-card-header">
        <h2>{title}</h2>

        {showVote && (
          <div className="section-vote">
            <button
              type="button"
              className="vote-button"
              aria-label="Vote up"
              aria-pressed={selected === "UP"}
              onClick={() => void handleVote("UP")}
            >
              👍
            </button>
            <button
              type="button"
              className="vote-button"
              aria-label="Vote down"
              aria-pressed={selected === "DOWN"}
              onClick={() => void handleVote("DOWN")}
            >
              👎
            </button>
          </div>
        )}
      </header>

      {loading && (
        <p className="page-status" role="status">
          Loading… {COLD_START_NOTE}
        </p>
      )}

      {error !== null && (
        <>
          <p className="form-error" role="alert">
            {error}
          </p>
          {onRetry && (
            <button type="button" className="section-retry" onClick={onRetry}>
              Try again
            </button>
          )}
        </>
      )}

      {!loading &&
        error === null &&
        // Plain text, never the error style: an empty section is a real state
        // the data can be in, and colouring it red would report a fault that
        // did not happen.
        (isEmpty ? <p className="section-empty">{emptyMessage}</p> : children)}

      {!loading && error === null && footer}

      {voteError !== null && (
        <p className="form-error" role="alert">
          {voteError}
        </p>
      )}
    </section>
  );
}
