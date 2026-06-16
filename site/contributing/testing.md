# Testing Strategy

afk is a Claude Code plugin whose product is the markdown itself: skills, agent
definitions, and hooks. The test suite protects that product at four
levels, from instant zero-token static checks up to model-backed behavioral
evals that make real LLM calls.

```
unit + integration  →  e2e smoke  →  behavioral evals
   bun run test          test:e2e        test:evals
   zero tokens          ~$0.01         real LLM calls
   every edit           before release  before release
```

The rule of thumb: **`bun run test` runs on every edit** (it costs nothing and
takes seconds); the model-backed layers run **before a release**, not on every
change.

## The layers

### Unit: `bun run test:unit`

File-level checks that read one file at a time. Zero tokens, runs in
[`tests/unit/run-unit-tests.ts`](https://github.com/alexanderopalic/afk/blob/main/tests/unit/run-unit-tests.ts).

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
- **No `.sh` test runners**: the test pipeline is Bun/TypeScript only.

### Integration: `bun run test:integration`

Cross-file checks that verify references between files line up. Also zero tokens,
in [`tests/integration/run-integration-tests.ts`](https://github.com/alexanderopalic/afk/blob/main/tests/integration/run-integration-tests.ts).

It validates:

- **Eval specs**: every `evals.json` / `triggers.json` under
  `tests/e2e/evals/specs/` belongs to a real skill and has the required shape
  (judged cases keep an `expectations` array; routing cases carry an
  `expect`/`forbid` `routing` block).
- **Internal file references**: every `references/…` or `skills/…` path
  mentioned in a skill resolves to a file that exists.
- **Markdown links**: every `.md` link across the repo points at a real file
  (dead links fail the build).
- **Skill & agent catalog**: every `/afk:<skill>` referenced in the README, the
  `help` CSV catalog, the docs, and the skills resolves to a real skill or agent.
- **Marketplace**: `marketplace.json` and `plugin.json` agree on the plugin
  name, the source points at the repo root, and a version anchor is present.

### `bun run test`: the every-edit gate

[`tests/check.ts`](https://github.com/alexanderopalic/afk/blob/main/tests/check.ts)
runs unit **and** integration in sequence and exits non-zero if either fails.
This is the check to run after every edit: it is fast, free, and catches most
regressions (broken frontmatter, dead links, a skill
renamed without updating the catalog).

### e2e smoke: `bun run test:e2e`

[`tests/e2e/plugin-load.ts`](https://github.com/alexanderopalic/afk/blob/main/tests/e2e/plugin-load.ts)
runs a single headless `claude -p` turn (~$0.01) against the working tree with
`--plugin-dir .` and confirms the plugin loads: a `system/init` event is
emitted, `afk` appears in the loaded plugins list, no `plugin_errors` are
reported, and the run completes without a Claude error. This catches packaging
problems the static checks can't see: a malformed `hooks.json`, a frontmatter
shape the runtime rejects.

### Behavioral evals: `bun run test:evals`

[`tests/e2e/evals/run-evals.ts`](https://github.com/alexanderopalic/afk/blob/main/tests/e2e/evals/run-evals.ts)
is the deepest layer: it drives each skill end-to-end with real LLM calls and
grades the behavior. Specs live under `tests/e2e/evals/specs/<skill>/evals.json`.

Each eval runs the skill in a fresh temp project (its `fixture.files` are written
in first), then grades the transcript three ways:

- **Deterministic assertions**: `required_substrings`, `forbidden_substrings`,
  `required_files`, `required_file_substrings`, and `unchanged_files` are checked
  in code against the output and the resulting project.
- **Judged cases** (`kind: "judged"`): an LLM judge scores the transcript
  against a list of `expectations`. The case passes when the mean score across
  trials clears the threshold (default 70%).
- **Routing cases** (`kind: "routing"`) are code-graded: the output must contain
  every `expect` substring and none of the `forbid` substrings. A case passes on
  a strict majority of trials; `overblock_guard` flags over-eager refusals.

Each case runs multiple trials (default 3) to surface flaky routing. Useful env
knobs:

| Variable | Default | Purpose |
| --- | --- | --- |
| `AFK_EVAL_TRIALS` | `3` | trials per eval |
| `AFK_EVAL_SCORE_THRESHOLD` | `70` | judged pass threshold (%) |
| `AFK_EVAL_SKILL` | (none) | run only one skill's evals |
| `AFK_EVAL_ID` | (none) | run only one eval id |
| `AFK_EVAL_JUDGE_MODEL` | `claude-haiku-4-5` | the judge model |
| `AFK_EVAL_MAX_BUDGET_USD` | `0.50` | per-eval budget cap |

The invariant: **write the eval red first**. A case that cannot fail proves
nothing. See [Eval-first](/concepts/eval-first) for how this drives the flow, and
the [write-evals](/reference/write-evals) skill for scaffolding new specs.

## Where things live

| Path | What |
| --- | --- |
| `tests/unit/` | file-level checks |
| `tests/integration/` | cross-file checks |
| `tests/e2e/plugin-load.ts` | plugin-load smoke test |
| `tests/e2e/evals/` | model-backed behavioral evals + specs |
| `tests/lib/` | shared Bun test helpers (`TestRun`, fs/path utils) |

## Adding tests

- Changing skill or agent **structure** (frontmatter, sections, line budgets)?
  Add or extend a check in `tests/unit/`.
- Adding a cross-file **relationship** (a new catalog, a new reference style)?
  Add a check in `tests/integration/`.
- Changing a skill's **behavior**? Add a behavioral eval under
  `tests/e2e/evals/specs/<skill>/evals.json` and prove it fails before your
  change makes it pass.

Run `bun run test` before every commit; run `bun run test:e2e` and
`bun run test:evals` before cutting a release.
