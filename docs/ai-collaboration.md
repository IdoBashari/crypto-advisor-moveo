# AI Collaboration

How AI tools were used during this assignment, including cases where their output was rejected.

## Tools

- Claude (chat): architecture, technical decisions, specifications, review
- Claude Code: implementation from those specifications

## Working method

Decisions were made in conversation and handed to Claude Code as explicit specifications. Claude Code did not make architectural choices. Every generated file was reviewed before being committed.

## Notable interactions

### Specification drift, caught in review

On its first task, a truncated paste caused Claude Code to receive an incomplete specification. Rather than stopping, it filled the gaps with its own choices: a different port, a different route path, and a missing endpoint. This was caught by comparing the output against the original specification, and corrected with an explicit list of fixes. Subsequent specifications instructed it to stop and ask when input appeared incomplete, which it then did consistently.

### Deployment platform behaviour verified, not assumed

An early claim about a hosting provider's policy on self-directed traffic was traced to blog posts rather than official documentation. It was dropped rather than repeated in project documentation.
