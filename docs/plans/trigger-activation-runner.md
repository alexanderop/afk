# Trigger-Activation Runner

## Context

- AFK ships `triggers.json` files (6 skills: grill, help, implement, prototype,
  research, ship) carrying `should_trigger: true/false` queries. Today nothing
  **executes** them: `tests/e2e/evals/run-evals.ts` only globs `evals.json`, and
  every behavioral eval prompt is `/afk:<skill>\n\n…` which **force-loads** the
  skill via slash command. The integration test (`checkTriggerSpec` in
  `tests/integration/run-integration-tests.ts`) only validates the *shape* of
  `triggers.json`, never behavior.
- Result: organic triggering — given a bare natural-language prompt, does Claude
  pick the right skill from its `description`? — is never measured. External
  research (Scott Spence, MLflow, cc-plugin-eval) converges on this as the
  highest-value, cheapest skill signal, and on the method below: run `claude -p`
  headless with `--output-format stream-json` and parse the JSONL for the
  `Skill` tool-use event.
- AFK is an 18-skill **router** with deliberate neighbor overlap (grill↔plan↔ship,
  implement↔batch, simplify↔review, qa↔review). The failure mode that matters
  is the *wrong* skill winning, so detection must be router-aware (which skill
  fired), not per-skill yes/no.
- Verified against Claude Code skills docs (https://code.claude.com/docs/en/skills):
  skills "load automatically when relevant" from their `description`; AFK skills
  are model-invocable (descriptions are written as trigger conditions). Activation
  surfaces as a `Skill` tool-use in `stream-json`, which the existing
  `collectToolCalls` in `run-evals.ts` already parses (`tool_use` events).
- No `brain/` vault in this repo → this plan lives in `docs/plans/`.

## Decisions

1. **Scope:** all 18 skills. Author a trigger query (with expected owner) for
   every skill, plus off-topic `none` queries that should fire no AFK skill.
2. **Detection: router-aware.** Per query, record *which* AFK skill fired (the
   first `Skill` tool-use naming an `afk:` skill = the winner). A positive query
   passes only if its **owning** skill won; a `none` query passes only if **no**
   AFK skill fired.
3. **Corpus structure: single shared corpus** at `tests/e2e/triggers/corpus.json`
   — one labeled list, each query naming its one `owner` (a skill name or
   `"none"`). Each query runs once; the confusion matrix is native. This
   **replaces** the 6 per-skill `triggers.json` files (delete them) and the
   integration lint's `checkTriggerSpec`.
4. **Placement: local pre-release only.** New `test:triggers` script, run by hand
   before release like `test:evals`. NOT added to `check.ts` (zero-token) and NOT
   added to CI (`.github/workflows/checks.yml` keeps `test` + plugin-load smoke).
   Stochastic activation must not flake PR checks.
5. **Scoring: 3 trials, strict-majority per query**, mirroring `run-evals.ts`
   routing cases. Aggregate gate: **activation ≥ 80%**, **false-positive ≤ 10%**.
   All knobs env-overridable (`AFK_TRIGGER_*`).
6. **Run cap:** per-run `--max-budget-usd 0.04` + 30s timeout (env-overridable).
   Detection only needs the early `Skill` tool-use; cut the run off cheaply.
   ~80–90 queries × 3 trials ≈ 240–270 runs ≈ $10–14/suite.

## Contracts

### Corpus schema — `tests/e2e/triggers/corpus.json`
```json
[
  { "query": "grill me on this feature idea", "owner": "grill" },
  { "query": "implement the plan in brain/plans/search.md", "owner": "implement" },
  { "query": "what's the weather in Berlin today", "owner": "none" }
]
```
- `query`: string — bare natural-language prompt sent with **no** `/afk:` prefix.
- `owner`: string — either an existing skill directory name (`skills/<owner>/`
  must exist) or the literal `"none"`.
- Invariant (lint-enforced): every one of the 18 skills appears as `owner` on
  ≥1 query; ≥1 query has `owner: "none"`.

### Detection contract (the calibration-sensitive part)
- Read the run's `stream-json` JSONL. The **winner** = the first `tool_use`
  content block whose tool name matches `/skill/i` **and** whose
  `JSON.stringify(input)` contains `afk:<skill>` (or the bare skill name as
  fallback). Map it to the skill directory name.
- If no such block appears → winner = `none`.
- RISK: the exact field carrying the skill identifier in the `Skill` tool-use
  input is not documented. Mitigation: scan tool name + full stringified input
  (don't hard-code a field); the runner **dumps raw JSONL per run** so the first
  real run calibrates the matcher. This is an explicit verification step below.

### Scoring contract
Per query, over N trials (default 3):
- `winner(trial)` ∈ {skill name, `none`}.
- **Positive query** (`owner ≠ none`): trial correct iff `winner === owner`.
  Query passes on strict majority correct.
- **`none` query:** trial correct iff `winner === none`. Query passes on strict
  majority.
- Global metrics over the corpus:
  - **activation %** = trials (on positive queries) where *any* AFK skill fired.
  - **accuracy %** = trials (on positive queries) where the *owner* fired.
  - **false-positive %** = trials (on `none` queries) where *any* skill fired.
- Per-query majority pass/fail → `run.pass/fail` (like routing cases). Aggregate
  gate → process exits non-zero if `activation < AFK_TRIGGER_ACTIVATION_MIN`
  (default 80) OR `false_positive > AFK_TRIGGER_FP_MAX` (default 10), OR any
  per-query majority fail. Print a confusion matrix (expected owner × fired skill)
  to the artifacts dir.

### Env knobs (mirror `AFK_EVAL_*`)
`AFK_TRIGGER_TRIALS` (3), `AFK_TRIGGER_MAX_BUDGET_USD` (0.04),
`AFK_TRIGGER_TIMEOUT_SECONDS` (30), `AFK_TRIGGER_ACTIVATION_MIN` (80),
`AFK_TRIGGER_FP_MAX` (10), `AFK_TRIGGER_OUT_DIR`, `AFK_TRIGGER_SKILL`/`_QUERY`
filters.

## Acceptance

Tooling, not UI — but it must actually deliver the signal, not just run:
- Runner detects organic activation **calibrated against real `stream-json`** —
  a query known to trigger grill is attributed to `grill`, a `none` query to
  `none`. Verified on a live first run, not assumed.
- Output reports all three metrics (activation/accuracy/false-positive) **and** a
  legible confusion matrix showing which wrong skills win for which queries — the
  router-confusion signal is the point, so it must be visible at a glance.
- Exit code gates on the thresholds; a deliberately-broken query (owner set to a
  skill that can't win) makes the suite fail.
- Zero-token `bun run test` stays green and unchanged in runtime; CI is untouched.
- The integration lint guarantees every skill has ≥1 positive query (coverage
  can't silently regress).

## Open Non-Blocking Notes

- Auto-fix feedback loop (feed a failed query's confusion back to fix the
  `description`) is a separate follow-up; not in scope here.
- Sampled CI gating can be revisited once we know the suite's flake rate from
  real pre-release runs.

## Tasks

- **Wave 1 — parallel** (disjoint files; share only the corpus schema contract):
  - Author corpus · owns `tests/e2e/triggers/corpus.json` · depends: none.
    Migrate the 6 existing `triggers.json` (each `should_trigger:true` →
    `owner:<that skill>`; each `should_trigger:false` query → a positive owned by
    its *real* owner, deduped). Author ~3–4 positives for the remaining 12 skills
    grounded in each skill's `description`. Add ~8–12 `none` off-topic queries.
    Ensure every skill is covered ≥1×.
  - Build runner · owns `tests/e2e/triggers/run-triggers.ts` · depends: corpus
    schema only. Model on `run-evals.ts` + `plugin-load.ts`; reuse `lib/paths`,
    `lib/fs`, `lib/runner`. Bare-query prompt (no slash command), `--plugin-dir`,
    `--setting-sources project`, `--output-format stream-json --verbose`, budget
    cap + timeout. Implement detection, 3-trial majority, metrics, confusion
    matrix, threshold gate, raw-JSONL artifact dump under
    `qa/triggers/<timestamp>/`.
- **Wave 2 — parallel** (depend on Wave 1 corpus schema):
  - Lint + cleanup · owns `tests/integration/run-integration-tests.ts` and
    deletes the 6 `specs/*/triggers.json` · depends: corpus schema. Replace
    `checkTriggerSpec` with corpus validation: file exists, array, each entry has
    string `query` + string `owner`, `owner` is `none` or an existing skill,
    every skill covered ≥1×, ≥1 `none` query. Drop the per-skill `triggers.json`
    branch in the eval-specs loop.
  - Wire script · owns `package.json` · depends: runner path. Add
    `"test:triggers": "bun tests/e2e/triggers/run-triggers.ts"`. Do **not** touch
    `check.ts` or CI.
- **Wave 3** (depends on Waves 1–2):
  - Docs · owns `CLAUDE.md` (test section) and `docs/testing-strategy.md` ·
    depends: final script name + behavior. Document `test:triggers` as a
    pre-release, model-backed, cost-bearing check alongside `test:evals`.

**Verification**
1. `bun run test` — zero-token unit+integration stay green; new corpus lint
   passes (coverage of all 18 skills enforced).
2. `AFK_TRIGGER_TRIALS=1 AFK_TRIGGER_SKILL=grill bun run test:triggers` — single
   calibration run on one obviously-triggering query; inspect the dumped raw
   JSONL to confirm the `Skill` tool-use field the matcher keys on. Adjust the
   detection matcher if the live shape differs from the contract above.
2. Full `bun run test:triggers` — confirm metrics + confusion matrix print,
   thresholds gate the exit code, and cost lands in the ~$10–14 range.
4. Negative check: temporarily set one query's `owner` to a skill that cannot
   win and confirm the suite fails (proves the gate bites), then revert.
