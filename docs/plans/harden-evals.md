# Harden the AFK Eval Suite

## Context

- The AFK eval harness (`tests/e2e/evals/run-evals.ts`) grades skill behavior
  via three tiers: deterministic substring/file assertions, an LLM judge over
  free-text `expectations`, and per-case pass/fail. Six gaps were identified
  (rendered in `qa/eval-improvements.html`) and this plan hardens all six.
- Grounding facts confirmed in-repo:
  - Judge prompt emits `{"met":true,"reason":"..."}`; parser reads
    `verdicts[index]?.met` **by key** (not position), so field reorder / added
    prose is safe (`run-evals.ts:138`, `:180`).
  - Trials run via `AFK_EVAL_TRIALS` (default 1) but collapse to a mean
    (`run-evals.ts:287`); no agreement/variance output.
  - Every case is independent; no `routing` vs `judged` distinction, no
    accuracy/over-block reporting. Routing is checked only via
    `required/forbidden_substrings` like `afk:grill`.
  - `extractJson` already strips fences and surrounding prose
    (`run-evals.ts:114`), so a `<thinking>` block before the JSON parses fine.
  - No `brain/`, no `CONTEXT.md`, no `docs/adr/` — pure in-repo work.
- Sources informing the design: Anthropic's "Define success criteria & build
  evaluations" guide and the "Building evals" cookbook. Cookbook wisdom applied:
  grading is the perpetual cost (favor code-graded), reformat to
  classification/"multiple choice" where faithful, read judge samples to
  validate, prefer volume that mirrors the real request distribution.

## Decisions

1. **Routing case kind (harness surgery for #3 + #5).** Add an explicit
   `kind: "routing"` case type. Harness computes routing accuracy, an
   over-block tally, and per-case trial agreement. Cleanest and most measurable.
2. **Coverage cases are pragmatic, no red-proof ceremony (#2/#4/#6).** New
   twins/edge/volume cases may be born green; we rely on review to catch dead
   assertions. This is an explicit, scoped carve-out from the `write-evals`
   red-first invariant — documented in the skill so it's not silent.
3. **Default `AFK_EVAL_TRIALS=3` (#5).** Agreement always reported. ~3× judge
   cost accepted because evals are a pre-release pass, not every-edit. Routing
   cases stay cheap (code-graded), so the 3× hits only judged cases.
4. **Judge: explicit `<thinking>` then strict JSON, thinking discarded (#1).**
   Matches the cookbook's `<thinking>`/extract pattern. JSON shape also moves
   `reason` before `met`.
5. **Migrate all routing-ish existing cases (#3).** Every existing case whose
   core assertion is "which skill did it pick" moves onto the code-graded
   routing kind, dropping judge expectations where the route *is* the behavior
   (~8–10 cases across help/ship/implement).
6. **Targeted volume: ~26 → ~40 (#6/#2/#4).** Add a negative twin per safety
   gate, the 4 edge-case classes on the skills where they bite, and ~3
   adversarial routing cases. Mirror real request distribution; no broad
   variation-spam.

## Contracts

### Routing case (new `kind`)

`kind` defaults to `"judged"` (today's behavior: `expectations` + `assertions`).
Backward compatible — existing cases need no `kind` field.

```json
{
  "id": "help-after-plan",
  "prompt": "...",
  "kind": "routing",
  "fixture": { "files": { } },
  "routing": {
    "expect": ["afk:implement"],
    "forbid": ["run afk:qa now"],
    "overblock_guard": false
  }
}
```

- A **trial is correct** iff every `expect` substring is present (case-insensitive,
  over `assistantText + resultText`) **and** no `forbid` substring is present.
- A **routing case passes** iff ≥2/3 trials are correct (majority). Agreement is
  reported as `N/3`; any case below full agreement is flagged flaky in the summary.
- `overblock_guard: true` marks a "should-proceed" gate twin: a failure of such a
  case is tallied as an **over-block** in the summary (the suite blocked something
  safe). Default `false`.

### Suite summary additions

- `routing accuracy: <correct trials>/<total routing trials>` (and cases passed).
- `over-blocked: <N>` — failed `overblock_guard` cases.
- `agreement` — per-case `N/trials`; flaky cases (<full) listed.

### Judge prompt (revised)

Instruct: "First reason about each expectation inside `<thinking>…</thinking>`,
then output STRICT JSON only in this shape: `{"results":[{"reason":"...","met":true}]}`,
one entry per expectation in order." Parser unchanged (reads `.met` by key);
`extractJson` strips the `<thinking>` block.

## Open Non-Blocking Notes

- Per-skill calibrated judge thresholds (vs flat 70%) were out of the six; revisit
  later if routing migration leaves few judged cases.
- If migration leaves a skill with zero judged cases, that skill's judge cost
  drops to zero — a good outcome, not a regression.

## Tasks

Slices in a wave touch disjoint files and share no contract, so they run in
parallel. The routing/judge **contracts above are fixed**, so doc and harness
slices proceed concurrently against them.

- **Wave 1 — parallel (foundation):**
  - Harness changes · owns `tests/e2e/evals/run-evals.ts` · depends: none.
    Add `kind:"routing"` handling + `routing` block (expect/forbid/overblock_guard);
    routing accuracy + over-block + agreement reporting; default trials → 3;
    judge prompt `<thinking>`-then-JSON with `reason` before `met`; majority-pass
    + flaky flagging.
  - Schema doc · owns `skills/write-evals/eval-spec.md` · depends: none.
    Document `kind`, the `routing` block, and the revised judge shape.
  - Template sync · owns `skills/write-evals/run-evals.template.ts` · depends: none.
    Mirror routing kind + judge fix + trials default so scaffolds match.
  - Guidance · owns `docs/eval-quality-guide.md`, `skills/write-evals/SKILL.md` ·
    depends: none. Add routing-kind guidance, the regression-lock carve-out from
    red-first (decision 2), "mirror real distribution", and a "read judge samples
    to validate" step.

- **Wave 2 — parallel (specs; each owns one file, all depend on Harness slice):**
  - `specs/help/evals.json` — migrate routing-ish cases to routing kind.
  - `specs/ship/evals.json` — migrate routing cases; add adversarial routing +
    a clear-feature-proceeds case.
  - `specs/implement/evals.json` — migrate routing cases; add gate twins
    (`...-allows-safe-migration`, `...-proceeds-on-clear-spec`,
    `overblock_guard:true`) + edge cases.
  - `specs/grill/evals.json` — add the 4 edge classes (ambiguous, long/rambling,
    off-topic/adversarial, referenced-file-missing).
  - `specs/batch/evals.json` + `specs/prototype/evals.json` — migrate/add where
    routing applies (smaller).

- **Wave 3 — verification:** depends on Waves 1–2.

**Verification**
1. `bun run test` — zero-token unit/integration (spec JSON parses, lint passes).
2. `bun -e 'JSON.parse(...)'` is covered by the lint; confirm no spec fails to parse.
3. Spot-run migrated + new cases per skill, e.g.
   `AFK_EVAL_SKILL=help bun run test:evals` and `AFK_EVAL_SKILL=implement bun run test:evals`.
4. Open a `judge*.json` artifact and confirm the `<thinking>`-then-JSON output
   parses and grades sanely (cookbook validation step).
5. Confirm the summary now prints routing accuracy, over-block count, and
   agreement, and that an intentionally-wrong route fails its case.
