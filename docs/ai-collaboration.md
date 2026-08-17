AI Collaboration

How AI tools were used on this assignment, including where their output was rejected.

Division of labour
Claude (chat) — architecture, decisions, specifications, review
Claude Code — implementation from those specifications

Claude Code received a written spec and made no architectural choices. It never committed — every commit was made by hand after reading the diff. Code that could not be explained aloud did not stay in the project.

The split reflects where each tool was reliable. Claude Code handled the mechanical work well: scaffolding, refactors across several files, keeping types aligned between client and server. The judgement stayed outside it.

Where the tools were wrong

A React dependency that would not have fired. Claude proposed [vote] for clearing a stale error. Claude Code identified that the same value does not re-run an effect, corrected it to [vote, loading], and demonstrated the difference in the browser.

A parallel call that was not parallel. Claude proposed Promise.all for the meme and the user's vote on it. The vote lookup needs the meme id — the calls are sequential. Claude Code flagged it rather than implementing the spec as written.

Status reports checked against the source. Claims about what was pushed and which environment variables the host held were confirmed with git log origin/main..main and the deployment dashboard before being acted on. Several turned out to be wrong. Anything a tool reported about state it could not see was treated as a claim, not a fact.

A prompt that described instead of observing. The first live model call restated the price table it was given. The prompt was revised to require an observation the data alone does not supply.

Where a tool stopped instead of guessing

npm install prisma pulled a major version whose configuration format differed from the spec. Claude Code halted and escalated rather than improvising. The change was accepted only after a clean typecheck, a successful build, and a real query returning rows.

The useful output came from specifying tightly and reviewing closely. The rejections above were caught by comparing output against the specification, and by checking claims against the systems they described.