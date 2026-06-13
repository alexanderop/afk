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
2. Read the domain context and project memory. Start with `CONTEXT.md`; if
   `CONTEXT-MAP.md` exists, follow the map. Read relevant files in `docs/adr/`.
   Then read the brain's principles if the vault has them: `brain/index.md`,
   then `brain/principles.md` and each principle file it links. The SessionStart
   hook surfaces the index; ground your questions and the plan in those
   principles, and do not ask the user to restate anything the brain already
   records. A fresh project may have no principles yet — that is fine; do not
   invent them.
3. Research real documentation automatically whenever the work touches a
   library, framework, SDK, API, CLI, or cloud service — before asking, and
   before writing any technical contract into the plan. Do not rely on training
   data for version-specific behavior, method signatures, config keys, or
   request/response shapes; it drifts and is often wrong. Use a documentation
   tool when one is available (a docs MCP server such as Context7, or the
   project's configured doc lookup); otherwise fetch the current official docs,
   migration guides, RFCs, or maintainer-authored sources by URL. Verify every
   API name, parameter, and version detail against what you fetched, and record
   the source URL plus version so it can go in the plan. Prefer current
   official and maintainer sources over blogs. Treat this as a hard
   prerequisite, not a fallback: never make the user ask you to check the docs.
4. For broad or unfamiliar work, dispatch bounded read-only subagents in
   parallel:
   - Codebase scout: inspect entrypoints, neighboring files, tests, schemas,
     configs, and existing patterns. Report file paths, current behavior,
     contradictions, and open questions.
   - Research scout: read relevant external primary sources and library/API
     documentation (via a docs MCP server such as Context7 when available, else
     fetched official docs). Report source URLs, version notes, exact API
     shapes, recommendations, and risks that affect the plan.
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
    contracts between parts, relevant glossary or ADR updates, and the
    implementation task list grouped into parallel waves (see Output). Decide the
    schedule here so `afk:implement` does not have to re-derive it: mark which
    slices are independent (disjoint files, no shared contract) so they run
    concurrently, and which depend on earlier slices; give every slice the files
    it owns and what it depends on. Every contract that depends on a library,
    SDK, or API must be doc-verified (not written from memory) and cite the
    source URL and version it was checked against.

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
| "I know this library/API well enough to write the contract." | Training data drifts. Fetch the current docs and verify every API name, parameter, and version before it goes in the plan. |
| "I'll check the docs if the user asks." | Doc research is automatic the moment external libraries/APIs are involved — don't wait to be told. |

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

Group implementation into waves so the orchestrator can delegate the schedule
without re-deriving it. Slices in one wave touch disjoint files and share no
contract, so they run in parallel; each later wave depends on earlier ones. For
every slice, give the files it **owns** and what it **depends on**.

- **Wave 1 — parallel:**
  - <slice> · owns `<file(s)>` · depends: none
  - <slice> · owns `<file(s)>` · depends: none
- **Wave 2 — parallel:**
  - <slice> · owns `<file>` · depends: <slice or contract from Wave 1>
- **Wave 3:**
  - <slice> · owns `<file>` · depends: <earlier slices>

**Verification**
1. <Verification task or command>
```

End the session by telling the user the plan is ready, naming the exact
`docs/plans/<slug>.md` path, and stating that it is the input to `afk:implement`
(or `afk:batch` when the plan splits into many independently-mergeable units the
user wants implemented as parallel PRs).
