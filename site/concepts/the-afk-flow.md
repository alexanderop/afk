# The AFK Flow

afk's four-step flow takes you from unclear intent to a verified, shipped
change. Each skill works standalone: run them in sequence for a feature, grab
one on its own, or use `/afk:ship` to drive the planning-through-verdict loop
automatically.

<FlowDiagram />

::: tip The whole loop, hands-free
`/afk:ship` drives every box above to a verdict: planning when needed,
simplifying when useful, and calling [reflect](/reference/reflect) at the end to
persist learnings back to the brain.
:::

## grill

[grill](/reference/grill) is **research-first**: before it asks you anything, it
grounds itself in the codebase, your domain glossary (`brain/context.md`), ADRs
(`brain/decisions/`), and the brain's principles — dispatching read-only scout
subagents and fetching live library/API docs — and writes what it found to a
research doc. If [map-codebase](/reference/map-codebase) has already mapped the
area into `brain/codebase/`, grill reads that map as observed ground and scopes
its own reading to the gaps. The interview then asks only the questions that
research could not answer, one decision at a time, stress-testing each with
concrete scenarios, edge cases, and failure modes. It produces two artifacts:
the agreed plan at `brain/plans/<slug>.md` (the input to implement) and the
research doc described next.

### The research doc

Whenever a scout ran or an external fact was fetched, grill writes a companion
**research doc** at `brain/plans/<slug>.research.md`. The split is deliberate and
strict: the plan is *prescriptive* ("what we will build"), the research doc is
*descriptive* ("what is there today") — no recommendations, no proposed changes,
just observations with inline citations (`src/checkout.ts:40-78`), doc-verified
external facts with their versions, and a coverage ledger whose open rows are
exactly the questions grill puts to you. It pins the git commit it was captured
at, so a later phase can tell whether the code has moved past what was researched.

The point of writing it down is reuse: the research doc is the durable input that
**implement** and **qa** read instead of re-discovering the area from scratch, so
the grounding grill paid for once is spent once. (This is distinct from the
[afk:research](/reference/research) skill, which sweeps the *external* web into a
`brain/sources/` digest for grill and plan to consume — the research doc is
grill's own per-plan record of the codebase and the facts that plan depends on.)

## implement

[implement](/reference/implement) is the gate before any file editing. It
triages complexity: test-free work (docs, config, a one-liner)
stays in the main conversation; everything else routes through the
[implement-orchestrator](/reference/implement), a read-only Opus agent that
reads grill's research doc (`brain/plans/<slug>.research.md`) for grounding, then
decides architecture, contracts, and slice boundaries, which it fans out to
bounded Sonnet [implementation-worker](/reference/implement) agents running local
TDD slices. Each worker writes the failing test first, makes the
smallest passing change, and reports evidence.

## simplify

[simplify](/reference/simplify) runs four independent cleanup agents in
parallel, each reviewing the diff from one angle: reuse, simplification,
efficiency, and altitude. It deduplicates their findings and applies only fixes
that preserve intended behavior. This is not a correctness review; it improves
quality without hunting for bugs.

## qa

[qa](/reference/qa) proves whether the intended user or client can complete the
changed flow. It reads grill's research doc and plan for the intended behavior,
then routes by project shape: browser QA with direct screenshots and console
checks for frontend, contract-level API or CLI verification for backend, both for
hybrids. It ends with a SHIP, DO NOT SHIP, or SHIP WITH
CAVEATS verdict backed by direct evidence, not just "tests pass". qa is the
closer for the single-diff implement path: `ship` stops at this verdict, and
`batch` opens its own PRs.

## batch

[batch](/reference/batch) is the fan-out alternative to implement for plans
that split into many independently-mergeable units. It runs one parallel
worktree worker per unit, each opening its own PR. Use batch when you want
parallel PRs rather than a single integrated change.

## ship

[ship](/reference/ship) drives the whole loop to a verdict. It plans when
needed, implements, simplifies when useful, runs [afk:review](/reference/review)
as a quality gate between simplify and qa, QA-checks behavior, and ends with a
ship/no-ship decision. Ship also calls [reflect](/reference/reflect) at the end
to persist session learnings back to the brain vault.
