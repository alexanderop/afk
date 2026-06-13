---
name: grill
description: Interview the user relentlessly about a plan until shared understanding is reached, grounding questions in the codebase plus fetched docs or blog posts when relevant, and challenging it against CONTEXT.md and ADRs. Use before implementing anything non-trivial, or when the user says "grill me", "stress-test this plan", or hands you a vague feature idea.
---

# Grill

Interview the user relentlessly about every aspect of the plan until you reach
a shared understanding. Walk down each branch of the design tree, resolving
dependencies between decisions one by one. For each question, provide your
recommended answer.

Ask the questions **one at a time**, waiting for an answer before continuing.

If a question can be answered by exploring the codebase, explore the codebase
instead of asking.

## Ground yourself first

Before the first question, gather enough context to ask informed questions:

- `CONTEXT.md` at the repo root — the domain glossary. If `CONTEXT-MAP.md`
  exists instead, the repo has multiple contexts; follow the map.
- `docs/adr/` — recorded decisions.
- Relevant source files, configs, package manifests, route definitions,
  schemas, tests, and README instructions.

Create these lazily — only when you have something to write. Formats:
[CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md), [ADR-FORMAT.md](./ADR-FORMAT.md).

For broad or unfamiliar work, use subagents to accelerate discovery before
interviewing the user. Dispatch independent read-only subagents in parallel:

- Codebase scout: inspect likely entrypoints, neighboring files, tests,
  schemas, configs, and existing patterns. Report concrete file paths,
  current behavior, contradictions, and open questions.
- Research scout: fetch and read relevant official docs, maintainer posts,
  migration guides, RFCs, or named blog posts. Report source URLs, version
  notes, recommendations, and risks that affect the plan.
- Optional domain scout: read `CONTEXT.md`, `CONTEXT-MAP.md`, and ADRs to
  identify glossary conflicts, prior decisions, and terms that need precision.

Keep subagent briefs read-only and bounded. Do not let subagents ask the user
questions or write files. The lead must synthesize their reports, verify the
important claims against files or fetched sources when needed, then ask the
next best question.

If the request depends on external behavior, fetch and read the relevant docs
or blog posts before asking. Use fetch for framework/library/API docs, upgrade
or migration guides, product announcements, RFCs, architecture posts, or other
primary sources that affect the plan. Prefer official documentation and
maintainer-authored posts; use third-party posts only when they are the named
source or fill a gap. Cite the fetched URLs in the final plan when they shaped
a decision.

Do not ask the user questions that the codebase or fetched sources can answer.
Ask only for product intent, preferences, trade-offs, credentials/access, or
which ambiguous source/version to treat as authoritative.

## During the session

**Challenge against the glossary.** When the user uses a term that conflicts
with `CONTEXT.md`, call it out immediately: "Your glossary defines
'cancellation' as X, but you seem to mean Y — which is it?"

**Sharpen fuzzy language.** When a term is vague or overloaded, propose a
precise canonical one: "You're saying 'account' — do you mean the Customer or
the User? Those are different things."

**Stress-test with concrete scenarios.** Invent scenarios that probe edge
cases and force precision about the boundaries between concepts.

**Cross-reference with code.** When the user states how something works, check
whether the code agrees. Surface contradictions: "Your code cancels entire
Orders, but you just said partial cancellation is possible — which is right?"

**Cross-reference with fetched sources.** When a proposed plan relies on a
library, platform, API, migration guide, or current best practice, check the
source before locking the plan. Surface contradictions: "The docs now
recommend X, but this plan assumes Y — should we follow the current docs or
preserve the existing pattern?"

**Update CONTEXT.md inline.** When a term is resolved, update `CONTEXT.md`
right there — don't batch. `CONTEXT.md` is a glossary and nothing else: no
implementation details, no spec content, no scratch notes.

**Offer ADRs sparingly.** Only when all three hold: hard to reverse,
surprising without context, and the result of a real trade-off. If any is
missing, skip the ADR.

## Output

When the tree is resolved, write the agreed plan to `docs/plans/<slug>.md`:
the decisions made, the contracts between parts, and an ordered task list.
This file is the input to **afk:implement**. End by telling the user the plan
is ready and where it lives.
