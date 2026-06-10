# afk Plugin Tests

Modeled on the [superpowers](https://github.com/obra/superpowers) test approach:
run real headless Claude Code sessions against the plugin and assert on the
transcript. There's an LLM in the loop, so tests verify *triggering and
instructions*, not exhaustive execution.

Requirements: Claude Code CLI installed and authenticated. Tests load the
plugin from this repo via `--plugin-dir`, so no installation is needed —
your working tree is what gets tested. The parity suite additionally uses
the Copilot CLI when it's installed.

## tests/parity/

The harness matrix: every supported harness (Claude Code, Copilot CLI) must
deliver the same core experience. One cheap headless prompt per feature per
harness, with a feature × harness summary table at the end:

```bash
tests/parity/run-parity-tests.sh                    # all installed harnesses
tests/parity/run-parity-tests.sh --harness copilot  # one harness only
```

Features checked per harness:

- **skills** — all 9 afk skills are discoverable by the model
- **agents** — all 6 `agents/*.agent.md` subagents are loadable (this is what
  `ralph` and `review` dispatch)
- **hooks** — the SessionStart hook injects the ticket-sizing gate
- **backstop** — a project CLAUDE.md carrying the template's sizing-gate
  section routes big tickets away from single-pass implementation, even when
  hooks don't fire
- **custom reviewers** — a repo-local `.afk/reviewers/vue-reviewer.md` (the
  team-extension convention) shows up in the review skill's dispatch plan for
  a matching diff, alongside the built-in specialists

A harness whose CLI is not on PATH is SKIPped, not failed. Known upstream
bugs WARN instead of FAIL: Copilot CLI has an open issue where
marketplace-installed plugin hooks are listed but never execute
([copilot-cli#2540](https://github.com/github/copilot-cli/issues/2540)) —
the hooks check warns there, and the backstop check proves the CLAUDE.md
fallback covers it.

## tests/hooks/

Zero-token tests for the two hooks — pure bash, no LLM calls, safe to run on
every edit:

```bash
tests/hooks/run-hook-tests.sh
```

Covers: `session-start.sh` emits valid JSON (including with JSON-hostile
characters in the brain index), and `auto-index-brain.sh` fast-exits on
non-brain writes, regenerates the index, and carries a description per note.

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
