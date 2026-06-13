# afk

A Claude Code plugin: a help router plus a four-step coding flow — grill
(plan interview) → implement (lead plans, workers run bounded TDD slices) →
simplify (parallel 4-angle cleanup pass) → qa (frontend/backend evidence verification).
The product is the markdown itself.

## Stack

Markdown skills + YAML frontmatter (Claude Code plugin format), with Bun-based
test runners. No build step for the plugin itself.

## Map

- `skills/` — the skills, one directory each (`SKILL.md` + supporting files)
- `tests/unit/` — file-level checks; `tests/integration/` — cross-file checks; `tests/e2e/` — model-backed smoke and evals; `tests/lib/` — shared Bun test helpers
- `.claude-plugin/` — plugin manifest (version lives here) and marketplace manifest

## Commands

- Test: `bun run test` (zero tokens, run on every edit)
- Unit only: `bun run test:unit`
- Integration only: `bun run test:integration`
- Run the plugin: `claude --plugin-dir . -p "<prompt>"` (working tree, no install)

## Rules

- `bun run test:e2e` and `bun run test:evals` make real LLM calls — run them before release,
  not on every edit. `bun run test` is the every-edit check.
- Skill prose is the product: instruction-budget rules apply. Tight scope, no
  redundant instructions, pointers over copies. SKILL.md stays under 500 lines;
  descriptions under 1024 chars (the lint enforces both).
- Skill frontmatter `name:` must match its directory name (lint enforces it).
- When creating or revising skills, follow `docs/skill-writing-guide.md` and
  start from `docs/templates/SKILL.md` unless the skill is a pure reference.
