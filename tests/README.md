# afk Plugin Tests

Modeled on the [superpowers](https://github.com/obra/superpowers) test approach:
run real headless Claude Code sessions against the plugin and assert on the
transcript. There's an LLM in the loop, so tests verify *triggering and
instructions*, not exhaustive execution.

Requirements: Claude Code CLI installed and authenticated. Tests load the
plugin from this repo via `--plugin-dir`, so no installation is needed —
your working tree is what gets tested.

## tests/skill-triggering/

The core suite. Each prompt in `prompts/` is a *naive* request that never
names a skill; the test asserts the right skill auto-triggers (a `Skill`
tool call in the `stream-json` transcript).

```bash
cd tests/skill-triggering
./run-all.sh                          # all prompts (~1-3 min each, costs tokens)
./run-test.sh review prompts/review.txt   # one prompt
```

It also includes **negative tests** for afk's core promise, the
ticket-sizing gate: a typo-fix prompt must NOT route into
`spec`/`pipeline`/`slice`/`ralph`:

```bash
./run-test.sh --absent "spec|pipeline|slice|ralph" prompts/small-ticket.txt
```

The expected-skill argument is an extended regex, so alternations are fine
where the router could legitimately pick either skill (`"spec|pipeline"`).

Each run leaves its full transcript under `/tmp/afk-tests/<timestamp>/` for
debugging, and warns when Claude invoked other tools *before* loading the
skill (the "started working without reading the instructions" failure mode).

## tests/claude-code/

Fast behavioral tests using a small bash assertion library
(`test-helpers.sh`: `run_claude`, `assert_contains`, `assert_not_contains`,
`assert_order`, `create_test_project`).

```bash
cd tests/claude-code
./run-skill-tests.sh                  # fast tests (~2 min each)
./run-skill-tests.sh --verbose --test test-using-afk.sh
./run-skill-tests.sh --integration    # slow end-to-end tests (none yet)
```

Current fast tests:

- `test-using-afk.sh` — the sizing gate is loaded and correctly described
  (size first, 5-point threshold, iron law).
- `test-review-tiers.sh` — the review skill documents its risk tiers and
  all four specialist reviewer agents.

## Adding tests

- New trigger test: drop a naive prompt in `tests/skill-triggering/prompts/`
  and add a `"skill:prompt"` entry to `run-all.sh`.
- New behavioral test: copy a `test-*.sh` file, source `test-helpers.sh`,
  and add it to the `tests` array in `run-skill-tests.sh`.
- Keep prompts naive (no skill names), assertions grep-able, and tests
  short — long multi-skill runs belong in `--integration`.
