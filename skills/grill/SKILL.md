---
name: grill
description: Interview the user relentlessly about a plan until shared understanding is reached, challenging it against the project's documented domain language (CONTEXT.md) and decisions (ADRs), updating those docs inline as things crystallise. Use before implementing anything non-trivial, or when the user says "grill me", "stress-test this plan", or hands you a vague feature idea.
---

# Grill

Interview the user relentlessly about every aspect of the plan until you reach
a shared understanding. Walk down each branch of the design tree, resolving
dependencies between decisions one by one. For each question, provide your
recommended answer.

Ask the questions **one at a time**, waiting for an answer before continuing.

If a question can be answered by exploring the codebase, explore the codebase
instead of asking.

## Ground yourself in the docs first

Before the first question, look for existing documentation:

- `CONTEXT.md` at the repo root — the domain glossary. If `CONTEXT-MAP.md`
  exists instead, the repo has multiple contexts; follow the map.
- `docs/adr/` — recorded decisions.

Create these lazily — only when you have something to write. Formats:
[CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md), [ADR-FORMAT.md](./ADR-FORMAT.md).

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
