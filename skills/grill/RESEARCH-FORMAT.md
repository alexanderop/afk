# brain/plans/<slug>.research.md Format

The research doc is grill's durable record of what the scouts found: the
codebase and external sources **as they exist today**, captured once so every
later phase reads it instead of re-discovering. It is the companion to the plan
(`brain/plans/<slug>.md`) — the plan is prescriptive ("what we will build"), the
research is descriptive ("what is there"). Keep the two strictly separate.

## The one rule that matters

**Describe what IS, not what SHOULD BE.** No recommendations, no proposed
changes, no critique, no root-cause theories, no "we could refactor this." Those
belong in the plan. If a finding tempts you to prescribe, restate it as an
observation and a citation. A reader should be able to trust this file as ground
truth regardless of which plan it spawned.

## Structure

```md
---
slug: <plan-slug>
git_commit: <short sha at time of research>
branch: <branch>
date: <ISO date>
---

# Research: <Topic>

## Summary

2–4 paragraphs synthesizing what was found — the architecture, data flow, and
relationships that matter for this work. Synthesize; do not compress every
detail.

## Findings

Organize by concept, not by file. Each section explains how something works,
with citations woven in. Use tables for comparisons, mermaid for data flow,
code blocks for key signatures.

### 1. <Concept / component>

Prose explanation of what it is and how it works, citing locations inline as
ranges — e.g. (`src/checkout.ts:40-78`). Concept first, citation second.

**Testing patterns**: where and how this is currently tested (unit/integration/
e2e), mocks, fixtures. If untested, say so — that is a finding.

### 2. <Concept / component>
...

## External sources

Library / API / SDK facts that the plan depends on, each doc-verified (not from
memory) with the source URL and version it was checked against.
- <fact> — <source URL>, version <x.y>

## Code references

Comprehensive, grouped list a developer can navigate the whole area from. Note
when a group is exhaustive vs. covers key files only.
- `path/to/file.ts:28-36` — what's there
- `path/to/dir/` — directory contents (key files listed, others exist)

## Open questions

Genuine investigative gaps — "how does X reach Y?", not "should we refactor Z?".
If none, say "None."
```

## Rules

- **Descriptive only** — see the one rule above. Prescription lives in the plan.
- **Concept-first citations.** Say what something does, then cite where it lives.
  BAD: "`app.ts:57` creates WorkosService / `app.ts:58` creates S3Service."
  GOOD: "Services are module-level singletons created at startup in
  `app.ts:57-80`: WorkosService, S3Service, JiraService."
- **Cite ranges, not lines.** Adjacent facts from one file use `file.ts:45-67`.
- **Pin the commit.** The frontmatter `git_commit` lets a later phase tell
  whether the code moved past what was researched (same convention as
  `brain/codebase/` maps).
- **Verify external facts.** Every library/API claim cites a fetched source URL
  and version — never training data.
- **Self-contained.** A later phase should understand the area from this file
  alone; citations support the narrative, they don't replace it.
- **Give findings stable headings.** The plan links decisions back to findings
  (`[[<slug>.research#<finding>]]`), so each finding section needs a clear,
  durable heading to anchor to. Name findings for the concept, not "Finding 1".
- **Write it once, lazily.** Only create the doc when grill actually did
  research worth persisting. A trivial plan needs no research doc.
