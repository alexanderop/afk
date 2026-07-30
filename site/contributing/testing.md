# Testing Strategy

afk is a Claude Code plugin whose product is the markdown itself: skills, agent
definitions, and hooks. The test suite protects that product at four
levels, from instant zero-token static checks up to model-backed behavioral
evals that make real LLM calls.

```
unit + integration  →  e2e smoke  →  behavioral evals  →  trigger activation
   bun run test          test:e2e        test:evals          test:triggers
   zero tokens          ~$0.01         real LLM calls       ~$10–14
   every edit           before release  before release       before release
```

The rule of thumb: **`bun run test` runs on every edit** (it costs nothing and
takes seconds); the model-backed layers run **before a release**, not on every
change.

## The layers

### Unit: `bun run test:unit`

File-level checks that read one file at a time. Zero tokens, one Vitest file per
concern in
[`tests/unit/`](https://github.com/alexanderopalic/afk/tree/main/tests/unit)
(`manifests`, `skills`, `agents`, `brain-hook`, `pipeline`).

It validates:

- **Plugin manifests**: `.claude-plugin/*.json` is valid JSON and `plugin.json`
  has a `name` and `version`.
- **Skill frontmatter**: `name:` matches the directory name, is lowercase
  kebab-case, carries no reserved words (`anthropic`, `claude`) or XML tags; the
  `description:` is present, within 1024 chars, and starts with `Use when`; only
  allowed frontmatter keys appear; required sections (`## When to Use`,
  `## Process`, `## Stop and Ask`, `## Output`) exist; and `SKILL.md` stays under
  500 lines.
- **Agent frontmatter**: the two named agents pin their tier and tool allowlist
  (`implement-orchestrator` → `opus`, read-only; `implementation-worker` →
  `sonnet`, with `Bash`/`Edit`/`Write`). Omitting `model` would inherit
  the user's default tier; omitting `tools` would inherit *all* tools
  and erase the least-privilege guarantee, so the lint fails the build.
- **The brain index hook**: runs `auto-index-brain.sh` against a throwaway temp
  vault and asserts summary lines become entry descriptions, list markers are
  stripped, title-only notes stay bare wikilinks, and a rebuild is idempotent.
- **No `.sh` test runners**: the test pipeline is TypeScript only, and no test
  file may import Bun-only modules (Vitest workers run under Node).

### Integration: `bun run test:integration`

Cross-file checks that verify references between files line up. Also zero tokens,
in [`tests/integration/`](https://github.com/alexanderopalic/afk/tree/main/tests/integration).

It validates:

- **Eval files**: every `tests/e2e/evals/<skill>.eval.ts` is named after a real
  skill (the filename routes the `/afk:<skill>` prompt) and uses the shared
  eval kit — shape validation beyond that is TypeScript's job, since evals are
  code.
- **Internal file references**: every `references/…` or `skills/…` path
  mentioned in a skill resolves to a file that exists.
- **Markdown links**: every `.md` link across the repo points at a real file
  (dead links fail the build).
- **Skill & agent catalog**: every `/afk:<skill>` referenced in the README, the
  `help` CSV catalog, the docs, and the skills resolves to a real skill or agent.
- **Marketplace**: `marketplace.json` and `plugin.json` agree on the plugin
  name, the source points at the repo root, and a version anchor is present.

### `bun run test`: the every-edit gate

`bun run test` is `vitest run`: it executes the unit and integration projects
(defined in
[`vitest.config.ts`](https://github.com/alexanderopalic/afk/blob/main/vitest.config.ts))
and exits non-zero if either fails. The model-backed e2e project only exists
when `AFK_E2E=1` is set, so this command can never spend money. This is the
check to run after every edit: it is fast, free, and catches most regressions
(broken frontmatter, dead links, a skill renamed without updating the catalog).
`bun run test:watch` reruns on skill/agent/hook edits; `bun run test -- -t grill`
filters by test name.

### e2e smoke: `bun run test:e2e`

[`tests/e2e/plugin-load.test.ts`](https://github.com/alexanderopalic/afk/blob/main/tests/e2e/plugin-load.test.ts)
runs a single headless `claude -p` turn (~$0.01) against the working tree with
`--plugin-dir .` and confirms the plugin loads: a `system/init` event is
emitted, `afk` appears in the loaded plugins list, no `plugin_errors` are
reported, and the run completes without a Claude error. This catches packaging
problems the static checks can't see: a malformed `hooks.json`, a frontmatter
shape the runtime rejects.

### Behavioral evals: `bun run test:evals`

Evals are ordinary Vitest tests, one file per skill under
[`tests/e2e/evals/`](https://github.com/alexanderopalic/afk/tree/main/tests/e2e/evals)
(`grill.eval.ts`, `implement.eval.ts`, …), written against the eval harness in
[`tests/lib/harness.ts`](https://github.com/alexanderopalic/afk/blob/main/tests/lib/harness.ts).
`task()` is one eval task — a prompt, an environment, and success criteria. It
provides a `run()` fixture — it drives the skill end-to-end under `claude -p` in
a fresh environment seeded with the task's fixture files, runs k trials, and
returns the completed trials — plus the graders, which carry the grading
semantics:

```ts
import { task } from "../../lib/harness";

task("writes the plan artifact when decisions are resolved", async ({ run, expect }) => {
  const result = await run("We have resolved the decisions. …");

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["afk:implement"]);
    expect.soft(trial).toHaveFile("brain/plans/team-billing.md");
  }
  await expect(result).toPassRubric(["Creates a brain/plans/<slug>.md artifact", "…"]);
});
```

- **Code-based graders** are plain code per trial: `toContainAll` /
  `toContainNone` on `trial.output` or `trial.file(path)`, `toHaveFile`,
  `toLeaveUnchanged` (compares against the fixture content), and
  `toUseTools({ required, forbidden, ordered })` over the trial's actual tool
  calls — the outcome-not-self-report check for tool behavior (needles match by
  tool name, or by call prefix when they carry a paren, e.g. `"Edit(brain/"`).
- **`toPassRubric(assertions, options?)`** (model-based): an LLM judge scores
  each trial's transcript per assertion (verdicts: met / unmet / unknown); the
  task passes when **every assertion is met in a strict majority of trials**.
  Pass `{ threshold: N }` to opt a genuinely fuzzy task back into a mean-score
  gate, or `{ capability: true }` to mark a capability task (scored and
  reported, never failing — a hill to climb that graduates to a regression task
  once it passes reliably).
- **`toRoute({ expect, forbid })`**: code-graded routing — the output must
  contain every `expect` substring and none of the `forbid` ones, passing on a
  strict majority of trials; `overblockGuard: true` flags over-eager refusals,
  `capability: true` marks a capability task. Keep needles to identifiers
  (skill, agent, and file names) or output-template markers — prose phrases
  false-fail on negated mentions.
- **`run(prompt, { execution: true })`**: execution tier — the skill actually
  does the work and the task grades the **outcome** (the environment's end
  state: files written, `trial.exec("bun test")` exit code) instead of the
  agent's self-report.

Tasks in a file run concurrently and each task's trials also run concurrently;
a global semaphore caps live claude sessions (`AFK_EVAL_CONCURRENCY`). A trial
that dies on infra (timeout, nonzero exit) is retried once, then excluded from
grading; a verdict needs a strict majority of attempted trials to have
completed (quorum), or the task fails as inconclusive. Filter natively:
`bun run test:evals -- tests/e2e/evals/grill.eval.ts` runs one skill,
`-t "<task name>"` one task. Useful env knobs:

| Variable | Default | Purpose |
| --- | --- | --- |
| `AFK_EVAL_TRIALS` | `3` | trials per eval |
| `AFK_EVAL_CONCURRENCY` | `4` | max claude sessions in flight |
| `AFK_EVAL_JUDGE_MODEL` | `claude-haiku-4-5` | the judge model |
| `AFK_EVAL_MAX_BUDGET_USD` | `0.50` | per-eval budget cap |
| `AFK_EVAL_TRIAL_RETRIES` | `1` | re-runs per infra-failed trial |
| `AFK_EVAL_REJUDGE` | unset | `<run-dir>` or `latest`: re-grade a previous run's saved transcripts — judge cost only, no skill runs |
| `AFK_EVAL_FAST` | unset | `1`: skip the rubric grader when a task's code-based graders already failed (dev loop only) |

Each run appends a rollup (per-task verdicts, rubric percentages, cost, mean
turns / tool calls / duration, `pass@k` and `pass^k`, model id, and a
`pluginHash` of the plugin content) to `qa/evals/history.jsonl` and prints a
delta against the previous run, so regressions and saturation are visible
run-over-run — and an unchanged hash pins any drift on the model or judge
rather than a plugin edit. `pass@k` counts tasks that passed at least one of
their k trials; `pass^k` counts tasks that passed every trial — the consistency
bar that matters for behavior users hit on every run.
`bun run test:evals` also runs a **judge self-check** — canned ideal and
sabotaged transcripts that must pass and fail respectively, proving the
assertions are gradeable before any skill run is blamed. After a run, audit
verdicts with `bun run eval:audit` (prints sampled judge verdicts next to the
agent's final result).

The invariant: **write the eval red first**. A task that cannot fail proves
nothing. See [Eval-first](/concepts/eval-first) for how this drives the flow, and
the [write-evals](/reference/write-evals) skill for scaffolding new specs.

### Trigger activation: `bun run test:triggers`

The Trigger-Activation Runner measures whether AFK skills fire *organically* from
bare natural-language prompts — no `/afk:` prefix. It reads a single shared corpus
at `tests/e2e/triggers/corpus.json`, sends each prompt headless through
`claude -p`, and detects which AFK skill fires first (the first `Skill` tool-use
naming an `afk:` skill).

It reports three metrics over the corpus:

- **Activation %** — positive queries where any AFK skill fired.
- **Accuracy %** — positive queries where the expected owner fired.
- **False-positive %** — `none` queries where any AFK skill fired.
- **pass^k** — queries where *every* trial was correct: the consistency bar a
  router is actually held to by users.

The runner runs 3 trials per query (strict-majority vote per query), prints a
confusion matrix (expected owner × fired skill), and exits non-zero if activation
< 80%, false-positive > 10%, or any per-query majority fails. Cost is roughly
$10–14 per full suite, so this check is **local pre-release only** — it is not in
`bun run test` and not in CI.

## Where things live

| Path | What |
| --- | --- |
| `tests/unit/` | file-level checks |
| `tests/integration/` | cross-file checks |
| `tests/e2e/plugin-load.test.ts` | plugin-load smoke test |
| `tests/e2e/evals/` | model-backed behavioral evals, one `<skill>.eval.ts` per skill |
| `tests/lib/` | shared helpers (lint rules, claude CLI runner, eval engine + kit) |
| `vitest.config.ts` | the unit / integration / e2e project split |

## Adding tests

- Changing skill or agent **structure** (frontmatter, sections, line budgets)?
  Add or extend a check in `tests/unit/`.
- Adding a cross-file **relationship** (a new catalog, a new reference style)?
  Add a check in `tests/integration/`.
- Changing a skill's **behavior**? Add a behavioral eval test in
  `tests/e2e/evals/<skill>.eval.ts` and prove it fails before your
  change makes it pass.

Run `bun run test` before every commit; run `bun run test:e2e`,
`bun run test:evals`, and `bun run test:triggers` before cutting a release.
