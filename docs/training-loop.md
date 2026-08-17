Feedback and Future Model Improvement

Proposal only. Not implemented.

How feedback is stored

Votes are an append-only log — changing a vote appends a new row, so the sequence survives. Each row carries the context it was cast in:

userPreferencesId — the preference version active at that moment. Preferences are versioned rather than overwritten, so a vote from last week still points at last week's profile.
contextSnapshot — what the section was serving where its contents vary between requests: the figures, the headlines. Rebuilt server-side, never taken from the request body.
contentItemId — the specific item, for sections that resolve to one.

A vote therefore does not say "this user likes the news section." It says "this user approved these four headlines, as a HODLer holding ADA and DOT" — a complete training example: profile, content, response. Versioning preferences rather than overwriting them is what keeps that true over time.

What could be trained

Not the language model. What improves is the selection: which articles surface for a profile, which memes suit which investor type, which register the insight takes.

Content is scored by approval rate within a segment, and those scores feed the ranking that already exists. The segment matters: an article downvoted by day traders and upvoted by HODLers is misrouted, not bad — a global score would discard it.

The process

Collect, then compare approval rates by segment, then change one thing — a ranking weight or a prompt — and measure the next batch against the previous one. Insight prompts would need to be versioned and recorded alongside the vote for a revision to be evaluated rather than assumed.

Not before each segment holds enough votes for a difference to be signal rather than noise. With a handful of users, any rate is an accident.

What is missing

Impression data. An item scrolled past and an item never reached look identical.