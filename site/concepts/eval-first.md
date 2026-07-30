# Eval-first

afk is eval-first: quality gates are built into the flow rather than bolted on
after the fact.

## How it works in practice

**ship runs afk:review as a quality gate** between simplify and qa. Before the
final QA run, [review](/reference/review) performs a principle-grounded
assessment of the code changes: numbered findings, severity ratings, options,
and a verdict (Accept / Accept with notes / Revise). A Revise verdict blocks
the run from proceeding to qa until the issues are addressed.

**qa judges product intent**, not just execution. A feature that runs without
errors but does not accomplish its stated purpose is not a SHIP. The QA skill
captures the change's acceptance criteria from the plan and evaluates whether
the observed behavior delivers them. A clean SHIP requires both: it
works *and* it delivers what the plan promised.

**grill records a UX quality bar**. For experience-bearing work (UI,
dashboards, reports, anything whose value is what the user understands or can
do), grill grills the quality bar as a contract, not taste. The agreed bar
lands in the plan's `## Acceptance` section so implement has a target and qa
has something to fail against. Without it, implementation ships something that
runs but does not deliver.

## Eval tasks

Behavioral evals are Vitest tests, one file per skill under
`tests/e2e/evals/<skill>.eval.ts`. They follow
[write-evals](/reference/write-evals) conventions: a fixture, a prompt, and
machine-checkable assertions, with an optional LLM judge for behaviors
substrings cannot express. The invariant: write the eval red first. A task
that cannot fail proves nothing.

Run evals before release with `bun run test:evals`. They make real LLM calls;
`bun run test` (zero tokens) is the every-edit check.

## Related skills

- [review](/reference/review): principle-grounded review ending in a verdict, used as the quality gate in ship
- [write-evals](/reference/write-evals): write behavioral evals, scaffold an eval harness, and run red-first
- [qa](/reference/qa): evidence-backed QA that judges product intent over execution
