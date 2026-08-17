// The meme section: one meme, chosen by the server, with its own vote.
//
// Built on the same two pieces as PricesSection — useSection for the fetch,
// SectionCard for the frame and the buttons — with one structural difference,
// noted on handleVote below.
import * as api from "../api/client";
import type { VoteValue } from "../api/client";
import { SectionCard } from "./SectionCard";
import { useSection } from "./useSection";

export function MemeSection() {
  const { data, loading, error, reload } = useSection(api.fetchMeme);

  // Inside the component, unlike the prices equivalent, because it closes over
  // the id of the meme currently on screen. A prices vote names no item, so
  // its handler can live at module level; this one cannot. That is what
  // onVote: (value) => Promise<unknown> is for — the caller supplies what only
  // it knows, and SectionCard stays ignorant of it.
  function handleVote(value: VoteValue) {
    if (!data) return Promise.resolve();
    return api.recordVote({
      section: "MEME",
      value,
      contentItemId: data.meme.id,
    });
  }

  return (
    <SectionCard
      title="Meme of the moment"
      loading={loading}
      error={error}
      onRetry={reload}
      // No isEmpty: the catalog ships with the code, so a missing meme is a
      // build fault rather than a state to render, and the server already
      // answers it with a 500.
      vote={data?.vote ?? null}
      onVote={handleVote}
    >
      {data && (
        <figure className="meme">
          {/* The box is sized before the image arrives. The ten images have
              different proportions, so without a reserved space the card
              would resize as each one loads and shove the sections below it
              down the page. */}
          <div className="meme-frame">
            <img
              className="meme-image"
              src={data.meme.imagePath}
              // body is alt text and was written as alt text: it describes the
              // image for a reader who cannot see it.
              alt={data.meme.body}
            />
          </div>
          <figcaption className="meme-caption">{data.meme.title}</figcaption>
        </figure>
      )}
    </SectionCard>
  );
}
