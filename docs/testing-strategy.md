# AFK Testing Strategy

AFK is a Markdown-first Claude Code plugin. The product surface is skill
frontmatter, skill instructions, plugin agent definitions, plugin manifests,
and the way Claude Code loads those files. The test strategy is therefore
layered by cost and confidence:

1. Unit tests validate deterministic file-level rules with no model calls.
2. Integration tests validate relationships between plugin files.
3. End-to-end tests validate that Claude Code can load and execute the plugin.

Run cheap checks on every edit. Run model-backed checks only when plugin
registration or user-visible behavior may have changed.

Local zero-token entrypoint:

```bash
bun run test
```

## Test Categories

| Category | Scope | Cost | Current command | Purpose |
|----------|-------|------|-----------------|---------|
| Unit | One file or one deterministic rule | Zero token | `bun run test:unit` | Catch malformed manifests, invalid skill or agent frontmatter, overlong descriptions, oversized instruction files, and test pipeline shape regressions. |
| Integration | Relationships across plugin files | Zero token | `bun run test:integration` | Catch mismatches between skill directory names, supporting files, eval specs, help catalog entries, README references, and plugin manifests. |
| End-to-end | Claude Code loading or exercising the plugin | Model-backed | `bun run test:e2e`, `bun run test:evals`, `bun run test:triggers` | Catch failures Claude Code would report only at runtime, such as plugin registration errors or behavioral regressions. |

## Unit Checks

Unit checks are pure structural tests. They should stay deterministic and cheap
enough to run on every save or before every commit.

Current unit coverage:

- `.claude-plugin/plugin.json` is valid JSON and contains `name` and `version`.
- Additional `.claude-plugin/*.json` files are valid JSON.
- Every `skills/*/SKILL.md` opens frontmatter on line 1.
- Every skill frontmatter block closes.
- Every skill has a single-line `description:`.
- Every skill description is at most 1024 characters.
- Every skill description starts with `Use when`.
- Every skill `name:` matches its directory name.
- Every skill name uses lowercase kebab-case.
- Every `SKILL.md` has body content after frontmatter.
- Every workflow skill has `When to Use`, `Process`, `Stop and Ask`, and
  `Output` sections.
- Every `SKILL.md` is at most 500 lines.
- Every `agents/**/*.md` file has valid frontmatter, a single-line
  description, a supported model, a valid tool list, and body content.
- The read-only implementation orchestrator excludes `Write`, `Edit`, and
  `Bash`; the implementation worker includes edit/write-capable tools.
- No `.sh` runners exist under `tests/`.

## Integration Checks

Integration checks verify that independently valid files still compose as a
plugin. They can share the same harness as unit checks, but the failure mode is
cross-file breakage rather than one malformed file.

Current integration coverage:

- Plugin-internal references from skill prose resolve relative to the source
  file, plugin root, or skill directories.
- Markdown links with relative paths resolve.
- README-listed skills match actual `skills/*/SKILL.md` files.
- Help catalog entries in `skills/help/afk-help.csv` match actual skill names.
- Skill references such as `afk:implement` or `/afk:qa` point to existing
  skills.
- Agent names referenced from skill prose point to existing `agents/*.md`
  definitions.
- Marketplace metadata references the same plugin name as `plugin.json`.
- Eval spec directories under `tests/e2e/evals/specs/` match actual skill names.
- Eval files are valid JSON and have the required shape.
- Plugin manifests and skill files are checked together in CI.

Good future integration checks:

- Generated install instructions mention the real marketplace name.
- Marketplace metadata references the same plugin version as `plugin.json` if
  the marketplace format grows a version field.

## End-to-End Checks

End-to-end checks prove the plugin works through the real Claude Code loading
path. They cost money and require authentication, so they should stay small.

Current end-to-end coverage:

- `bun run test:e2e` runs one headless Claude Code turn with
  `--plugin-dir`.
- The stream JSON `system/init` event is produced.
- `afk` appears in the loaded plugin list.
- `plugin_errors` is empty.

Good future end-to-end checks:

- Invoke `/afk:help` in a tiny fixture repo and assert it recommends the
  expected next skill.
- Invoke `/afk:write-good-goal` with a bounded prompt and assert the response
  contains a concrete goal shape.
- Keep each E2E scenario to one or two turns unless it is explicitly an eval,
  not a smoke test.

## Trigger-Activation Runner

`bun run test:triggers` measures whether AFK skills fire organically from bare
natural-language prompts (no `/afk:` prefix). It reads a single shared corpus
at `tests/e2e/triggers/corpus.json`, sends each prompt headless through
`claude -p`, and detects which AFK skill fires first (the first `Skill`
tool-use naming an `afk:` skill).

Three metrics are reported over the corpus:

- **Activation %** — positive queries where any AFK skill fired.
- **Accuracy %** — positive queries where the expected owner fired.
- **False-positive %** — `none` queries where any AFK skill fired.

The runner runs 3 trials per query (strict-majority vote per query) and prints
a confusion matrix (expected owner × fired skill). It exits non-zero if
activation < 80%, false-positive > 10%, or any per-query majority fails.

Cost is approximately $10–14 per full suite. This check is local and
pre-release only — it is not in `bun run test` and not in CI. Env knobs
mirror `AFK_EVAL_*`: `AFK_TRIGGER_TRIALS`, `AFK_TRIGGER_MAX_BUDGET_USD`,
`AFK_TRIGGER_TIMEOUT_SECONDS`, `AFK_TRIGGER_ACTIVATION_MIN`,
`AFK_TRIGGER_FP_MAX`, `AFK_TRIGGER_OUT_DIR`, `AFK_TRIGGER_SKILL`,
`AFK_TRIGGER_QUERY`.

## Behavioral Evals

Behavioral evals are not the same as CI smoke tests. They specify expected
agent behavior for realistic prompts and can be reviewed manually before a
runner exists. The lint harness validates their JSON shape, but does not run
the prompts through a model.

Use [eval-quality-guide.md](eval-quality-guide.md) when adding or revising eval
cases. Prefer deterministic artifact checks over substring-only assertions when
the runner can verify the behavior directly.

Use JSON files under `tests/e2e/evals/specs/<skill>/`. Current specs cover
`help`, `grill`, `implement`, and `ship`.
Run them with:

```bash
bun run test:evals
```

This requires Claude Code non-interactive auth. In CI, set
`ANTHROPIC_API_KEY`. Locally, first verify that a plain `claude -p 'Reply ok'`
can make a model call.

```json
{
  "skill_name": "help",
  "evals": [
    {
      "id": "help-no-plan",
      "prompt": "What should I do next?",
      "expected_output": "Recommends afk:grill when brain/plans is missing.",
      "expectations": [
        "Inspects project state",
        "Does not list every skill",
        "Recommends exactly one next step",
        "Names afk:grill"
      ]
    }
  ]
}
```

Add a runner only after the expectations are stable.

## CI Policy

CI should keep the same shape as local checks:

- Always run `bun run test`, which includes unit and integration checks.
- Run end-to-end checks only when `ANTHROPIC_API_KEY` is configured.
- Skip smoke cleanly for forks or unauthenticated environments.
- `bun run test:triggers` is local pre-release only — never in CI.

The current GitHub workflow follows this policy in
`.github/workflows/checks.yml`.
