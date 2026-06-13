---
name: grill
description: Use when the user says "grill me", asks to stress-test a plan, offers a vague feature idea, or wants grounded planning before non-trivial implementation
---

# Grill

Grill turns unclear intent into an implementation-ready plan by interviewing
the user one decision at a time. The core principle is: ask only questions the
repo, docs, glossary, ADRs, or fetched primary sources cannot answer.

## When to Use

Use this skill when:

- The user says `grill me`, `stress-test this plan`, or asks for a planning
  interview.
- The user proposes a non-trivial implementation and shared understanding is
  not yet strong enough to code.
- A feature idea, migration, architecture change, domain model, or integration
  has unresolved product intent, trade-offs, boundaries, contracts, or source
  of truth.

Do not use this skill for tiny mechanical edits, direct bug fixes with an
obvious cause, or execution of an already-written `docs/plans/` plan.

## Process

1. Ground yourself before asking the first question. Read the relevant code,
   tests, configs, routes, schemas, package manifests, README instructions,
   and any nearby plans or specs.
2. Read the domain context. Start with `CONTEXT.md`; if `CONTEXT-MAP.md`
   exists, follow the map. Read relevant files in `docs/adr/`.
3. If the work depends on external behavior, fetch and read relevant primary
   sources before asking: official docs, maintainer posts, migration guides,
   RFCs, product announcements, architecture posts, or named blog posts. Prefer
   current official and maintainer-authored sources.
4. For broad or unfamiliar work, dispatch bounded read-only subagents in
   parallel:
   - Codebase scout: inspect entrypoints, neighboring files, tests, schemas,
     configs, and existing patterns. Report file paths, current behavior,
     contradictions, and open questions.
   - Research scout: read relevant external primary sources. Report source
     URLs, version notes, recommendations, and risks that affect the plan.
   - Domain scout, when useful: read `CONTEXT.md`, `CONTEXT-MAP.md`, and ADRs.
     Report glossary conflicts, prior decisions, and terms needing precision.
5. Synthesize the research yourself. Verify important claims against files or
   fetched sources before using them.
6. Ask the next best question, one at a time, and wait for the answer before
   continuing. Include your recommended answer and the reason for it.
7. Challenge glossary conflicts immediately. If the user uses a term
   differently from `CONTEXT.md`, say what the glossary says and ask which
   meaning is authoritative.
8. Sharpen fuzzy or overloaded language. Propose canonical terms when concepts
   such as `account`, `user`, `customer`, `order`, or `cancellation` may mean
   different things.
9. Stress-test decisions with concrete scenarios, edge cases, failure modes,
   permission boundaries, lifecycle states, and cross-system contracts.
10. Cross-reference user claims against code and fetched sources. Surface
    contradictions explicitly and ask which source should win.
11. Update `CONTEXT.md` immediately when a glossary term is resolved. Use it
    only as a glossary: no implementation details, specs, scratch notes, or
    plan content. If creating it, use [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).
12. Offer an ADR only when the decision is hard to reverse, surprising without
    context, and the result of a real trade-off. If creating one, use
    [ADR-FORMAT.md](./ADR-FORMAT.md).
13. Continue until the decision tree is resolved enough for implementation:
    contracts are clear, ambiguous terms are defined, key edge cases have an
    agreed answer, and source-of-truth conflicts are settled.
14. Write the agreed plan to `docs/plans/<slug>.md`. Include decisions made,
    contracts between parts, relevant glossary or ADR updates, source URLs that
    shaped decisions, and an ordered implementation task list.

## Stop and Ask

STOP and ask the user when:

- Product intent, priority, or acceptable trade-off cannot be inferred from the
  repo, glossary, ADRs, or docs.
- Multiple sources of truth conflict and choosing one would change behavior.
- A required external source, credential, account, environment, or proprietary
  document is unavailable.
- Continuing would require making a business, legal, security, data retention,
  privacy, or rollout decision without an owner.

Do not ask the user about facts that can be discovered by reading the repo or
fetched primary sources.

## Red Flags

| Thought | Reality |
|---------|---------|
| "I can ask the user how the code works." | Read the code first and ask only when the code conflicts with intent or another source. |
| "The plan is mostly obvious." | Non-trivial work needs explicit contracts, edge cases, and source-of-truth decisions before implementation. |
| "I'll batch glossary updates at the end." | Update `CONTEXT.md` when the term is resolved so later questions use the canonical meaning. |
| "This decision feels important, so it needs an ADR." | ADRs are only for decisions that are hard to reverse, surprising without context, and trade-off driven. |
| "A subagent report is enough." | The lead must synthesize and verify important claims before asking or planning. |

## Output

Create `docs/plans/<slug>.md` with this shape:

```markdown
# <Plan Title>

## Context
- <What is being changed and why>
- <Relevant code, glossary, ADR, or external source constraints>

## Decisions
- <Resolved decision and rationale>

## Contracts
- <Interface, data, lifecycle, permission, or ownership contract>

## Open Non-Blocking Notes
- <Known follow-up that does not block implementation>

## Tasks
1. <Ordered implementation task>
2. <Verification task>
```

End the session by telling the user the plan is ready, naming the exact
`docs/plans/<slug>.md` path, and stating that it is the input to `afk:implement`.
