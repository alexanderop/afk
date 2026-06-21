# AFK Eval Quality Guide

Good AFK evals protect workflow behavior, not phrasing. They should catch the
mistakes a future model or skill edit is likely to make under pressure.

## Good Eval Criteria

- Specific: each case names one behavior that must hold.
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
3. Event or trace assertions when the runner can inspect tool usage.
4. Substring assertions for routing language and final reports.
5. Human review only when the behavior cannot be graded reliably.

Substring-only evals are acceptable as smoke tests, but they should not be the
only gate for safety-sensitive behavior. A model can mention the right words
without following the workflow.

## Routing Cases

When the *entire* behavior under test is "which AFK skill/route did it pick",
use a `kind:"routing"` case (`routing.expect` / `routing.forbid`) rather than a
judged case. It is code-graded, judge-free, and scored by strict-majority over
trials, so it stays cheap even at the default `AFK_EVAL_TRIALS=3`. Reserve judged
`expectations` for the cases where the *reasoning or explanation* is the behavior,
not just the route. Migrate an existing case to routing only when its core
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

## Validate the Judge

A judged eval is only as trustworthy as the judge. After a run, open a
`judge*.json` artifact and read the `<thinking>` reasoning and verdicts for at
least one case: confirm the judge read the transcript, applied each expectation
faithfully, and didn't reward keyword-matching. A miscalibrated judge silently
inverts the gate.

## Red-First, and Its Carve-Out

New behavior is locked in test-first: write the eval red, watch it fail for the
right reason, then go green. Coverage cases that lock in already-correct behavior
— negative gate twins, edge classes, routing-volume cases — are an explicit
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
- Are forbidden substrings aimed at realistic wrong behavior, not harmless
  wording?
- Is there at least one negative or edge case near the happy path?
