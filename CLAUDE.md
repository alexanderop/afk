# afk

A Claude Code plugin: a help router plus a four-step coding flow — grill
(plan interview) → implement (lead plans, workers run bounded TDD slices) →
simplify (parallel 4-angle cleanup pass) → qa (frontend/backend evidence verification).
The product is the markdown itself.

## Stack

Markdown skills + YAML frontmatter (Claude Code plugin format), bash test
harness. No build step, no dependencies beyond `jq` and `shellcheck`.

## Map

- `skills/` — the skills, one directory each (`SKILL.md` + supporting files)
- `tests/lint/` — zero-token structural lint; `tests/smoke/` — headless plugin-load check (~$0.01)
- `.claude-plugin/` — plugin manifest (version lives here) and marketplace manifest

## Commands

- Test: `tests/lint/run-lint-tests.sh` (zero tokens, run on every edit)
- Lint: `find tests -name '*.sh' -print0 | xargs -0 shellcheck -x -P SCRIPTDIR`
- Run the plugin: `claude --plugin-dir . -p "<prompt>"` (working tree, no install)

## Rules

- `tests/smoke/plugin-load.sh` makes a real LLM call — run it before release,
  not on every edit. The lint + shellcheck are the every-edit check.
- Skill prose is the product: instruction-budget rules apply. Tight scope, no
  redundant instructions, pointers over copies. SKILL.md stays under 500 lines;
  descriptions under 1024 chars (the lint enforces both).
- Skill frontmatter `name:` must match its directory name (lint enforces it).
- When creating or revising skills, follow `docs/skill-writing-guide.md` and
  start from `docs/templates/SKILL.md` unless the skill is a pure reference.
