# AFK Eval Quality Guide

Good AFK evals protect workflow behavior, not phrasing. They should catch the
mistakes a future model or skill edit is likely to make under pressure.

## Good Eval Criteria

- Specific: each task names one behavior that must hold.
- Representative: the prompt looks like a real AFK user request, with realistic
  repo fixtures when state matters.
- Measurable: assertions use deterministic checks when possible; substring
  checks are only for user-visible routing or explanation.
- Adversarial enough: include nearby wrong routes, missing decisions, unsafe
  assumptions, and over-eager orchestration.
- Stable: avoid requiring exact prose, ordering, or model-specific wording.
- Cheap by default: static and deterministic checks should carry the safety
  invariants; model-backed evals should stay focused.

## Assertion Strength

Prefer checks in this order:

1. Static checks for file structure, frontmatter, tool access, and references.
2. Code assertions over eval artifacts, such as required files, unchanged files,
   and file substrings.
3. Tool-call assertions (`toUseTools({ required, forbidden, ordered })`) over
   what the trial actually invoked — e.g. `{ required: ["Task"] }` proves
   workers were dispatched, `{ forbidden: ["Edit", "Write"] }` proves a
   read-only role stayed read-only. Prefer these over a rubric assertion
   whenever the behavior *is* a tool call.
4. Substring assertions for routing language and final reports.
5. Human review only when the behavior cannot be graded reliably.

Substring-only evals are acceptable as smoke tests, but they should not be the
only gate for safety-sensitive behavior. A model can mention the right words
without following the workflow.

**Substrings are for identifiers, the judge is for meaning.** Expected and
forbidden substrings must be things with no synonyms — skill names
(`afk:grill`), agent names (`implement-orchestrator`), file paths, or
output-template markers (`Verdict: SHIP`, `Next step: [Q]`). Never gate on
prose phrases: an expected phrase punishes valid rephrasing ("sequentially" vs
"one after another"), and a forbidden phrase false-fails on negated mentions —
a correct answer saying "we do *not* dispatch implementation-worker" contains
the forbidden string. When the behavior is a meaning, not an identifier, use a
rubric assertion.

## Routing Cases

When the *entire* behavior under test is "which AFK skill/route did it pick",
use a routing task (`toRoute({ expect, forbid })`) rather than a
rubric-graded task. It is code-graded, judge-free, and scored by strict-majority over
trials, so it stays cheap even at the default `AFK_EVAL_TRIALS=3`. Reserve judged
`assertions` for the tasks where the *reasoning or explanation* is the behavior,
not just the route. Migrate an existing task to routing only when its core
assertion is the route; keep the judge where the prose matters.

Pair every "should-block" safety gate with a "should-proceed" twin marked
`overblock_guard: true`. The twin catches a skill that has become so cautious it
blocks safe work — the suite reports those failures as an **over-block** count, a
distinct failure mode from a missed block.

## Mirror the Real Distribution

Add volume that looks like the real spread of AFK requests — gate twins, the
edge-case classes a skill actually hits (ambiguous, rambling, off-topic /
adversarial, referenced-file-missing), and a few adversarial routing prompts.
Do not pad the suite with near-duplicate happy-path variations; they cost trials
without covering a new failure.

## Capability vs Regression Tasks

Every gating task is a regression task: it must pass, and a failure blocks.
Mark a task `capability: true` (on `toRoute` or `toPassRubric`) to make it a
**capability task**: it runs, its score lands in the report and in
`qa/evals/history.jsonl`, but it never fails the suite. Use this for behavior
you *want* but the skill or model can't do reliably yet — a hill to climb that
makes model upgrades measurable. When a capability task passes consistently
across runs (check the history), graduate it by removing the flag.

## Grade the Outcome, Not the Self-Report

Explain-the-route tasks ("Eval mode: do not edit files; explain the route")
are the cheap tier — they grade what the skill *says* it would do, which can
diverge from what it does. Each skill with real side effects should also carry
at least one **execution task** (`run(prompt, { execution: true })`) where the
skill actually does the work and grading is deterministic on the end state:
`toHaveFile`, file-content checks, `toUseTools`, and `trial.exec("bun test")`
exit codes. Execution tasks dominate run cost; keep them few and their
fixtures tiny.

## Infra Failures Are Not Evidence

A trial that dies on timeout or a nonzero exit says nothing about the skill.
The harness retries it (`AFK_EVAL_TRIAL_RETRIES`, default 1) and, if it still
fails, excludes it from grading. A verdict then requires **quorum**: a strict
majority of attempted trials must have completed (and scored, for judged
tasks), otherwise the task fails as inconclusive with the infra reasons in the
message. The run report counts excluded trials separately so persistent infra
flake stays visible instead of masquerading as regressions.

## Validate the Judge

A judged eval is only as trustworthy as the judge. Three layers:

- The judge may answer **unknown** per assertion when the transcript lacks
  evidence; unknown counts as unmet, so thin transcripts fail loudly instead of
  being confidently misgraded. Repeated unknowns mean the assertion asks for
  evidence the transcript can't show — reword it or strengthen the fixture.
- The **judge self-check** (`tests/e2e/judge-selfcheck.test.ts`) runs canned
  ideal and sabotaged transcripts through the judge: the ideal must pass, the
  sabotaged must fail. When adding a judge-heavy suite or rewording contested
  assertions, extend it — it catches unmeetable or trivially-satisfiable
  assertions without burning a skill run, and doubles as a judge-model-drift
  canary.
- After a run, `bun run eval:audit` prints sampled judge verdicts next to the
  agent's final result. Read a few and mark your own agree/disagree: confirm
  the judge read the transcript, applied each assertion faithfully, and
  didn't reward keyword-matching. A miscalibrated judge silently inverts the
  gate.

Iterating on assertion wording or substring needles does not need new skill
runs: `AFK_EVAL_REJUDGE=latest bun run test:evals -- <file> -t "<task>"`
replays the previous run's saved transcripts and re-grades them — judge cost
only. Re-run the skill for real once the wording settles.

## Red-First, and Its Carve-Out

New behavior is locked in test-first: write the eval red, watch it fail for the
right reason, then go green. Coverage tasks that lock in already-correct behavior
— negative gate twins, edge classes, routing-volume tasks — are an explicit
exception: they may be born green (you can't make passing behavior fail), and we
rely on review to catch dead assertions. Say so in the PR rather than faking a
red.

## Implement Skill Coverage

`afk:implement` evals should cover at least these behaviors:

- Tiny local changes stay direct and do not spawn ceremony.
- Complex plans route through `implement-orchestrator`.
- Worker briefs include exact files, contracts, TDD evidence, verification, and
  boundaries.
- The read-only orchestrator does not claim it edited files or ran final shell
  verification.
- Shared file conflicts stop before parallel worker dispatch.
- Missing product intent, credentials, or destructive migration policy blocks
  implementation.
- Eval-mode prompts do not mutate fixture files.

## Grill and Batch Slice Coverage

Decomposition is where horizontal slicing leaks in, so `afk:grill` and
`afk:batch` evals should lock the vertical-slice invariant:

- A grill plan slices vertically — each slice is one behavior carrying its own
  test and implementation together — and sequences the thinnest end-to-end happy
  path first as a tracer bullet, never a tests-only slice then an
  implementation-only slice.
- A batch decomposition rejects a horizontally-sliced plan (a tests-only unit
  and a separate implementation-only unit) and re-scopes into vertical units,
  rather than fanning the horizontal halves out as separate PRs.

## Review Checklist

Before accepting a new eval:

- Would this fail if the skill chose the wrong AFK phase?
- Would this fail if the model only repeated keywords from the skill?
- Does the fixture contain enough repo state for the expected behavior?
- Are all substring needles identifiers or template markers — never prose
  phrases that a correct answer could utter in negation?
- Is there at least one negative or edge case near the happy path?
- Could a hand-written ideal transcript pass every rubric assertion? If in
  doubt, add it to the judge self-check.
