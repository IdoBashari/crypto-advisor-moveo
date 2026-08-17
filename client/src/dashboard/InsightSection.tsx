// The insight section: two or three sentences written for this user today.
//
// Modelled on MemeSection — handleVote inside the component, closing over the
// id of the item on screen — with one difference. The meme's id is the one the
// client was shown and sends back; here the server derived it from the user
// and the date, and the client is only returning what it was given.
import * as api from "../api/client";
import type { VoteValue } from "../api/client";
import { SectionCard } from "./SectionCard";
import { useSection } from "./useSection";

export function InsightSection() {
  const { data, loading, error, reload } = useSection(api.fetchInsight);

  function handleVote(value: VoteValue) {
    // The static fallback is not a stored row, so there is nothing to vote on.
    // The server would reject a vote naming no item.
    const id = data?.insight.id;
    if (!id) return Promise.resolve();

    return api.recordVote({
      section: "AI_INSIGHT",
      value,
      contentItemId: id,
    });
  }

  return (
    <SectionCard
      title="Your insight"
      loading={loading}
      error={error}
      onRetry={reload}
      // No isEmpty: the server always returns something — today's insight, an
      // earlier one, or a static line — so there is no empty state to render.
      vote={data?.vote ?? null}
      onVote={handleVote}
      footer={
        // Shown only when every model was unreachable and the user is reading
        // their last stored insight. Presented like the stale-prices line: a
        // quiet note, never the error style, because this is the fallback
        // working rather than something to alarm anyone about.
        data && !data.insight.isFromToday ? (
          <p className="section-footer">From an earlier day</p>
        ) : null
      }
    >
      {/* Plain text as written: two or three sentences, no markdown parsing,
          no truncation, nothing to expand. */}
      {data && <p className="insight-body">{data.insight.body}</p>}
    </SectionCard>
  );
}
