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

## Review Checklist

Before accepting a new eval:

- Would this fail if the skill chose the wrong AFK phase?
- Would this fail if the model only repeated keywords from the skill?
- Does the fixture contain enough repo state for the expected behavior?
- Are forbidden substrings aimed at realistic wrong behavior, not harmless
  wording?
- Is there at least one negative or edge case near the happy path?
