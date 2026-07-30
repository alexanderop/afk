# afk

A Claude Code plugin: a help router plus a four-step coding flow — grill
(plan interview) → implement (orchestrator plans, workers run bounded TDD slices) →
simplify (parallel 4-angle cleanup pass) → qa (frontend/backend evidence verification).
`batch` is the fan-out alternative to implement: many
independent units run as parallel worktree workers, one PR each. The product is the
markdown itself.

It also ships a persistent `brain/` memory vault (the `brain`, `init-brain`,
`reflect`, `ruminate`, `meditate`, `plan`, and `review` skills, plus two hooks):
the flow reads the brain's principles before acting (grill, the implement
orchestrator, qa) and writes learnings back via `reflect` after a run (ship).
The brain skills are derived from brainmaxxing by Lauren Tan (MIT) — see
`LICENSE`.

## Stack

Markdown skills + YAML frontmatter (Claude Code plugin format), with a Vitest
test suite (Bun as package manager; vitest runs under Node). No build step for
the plugin itself.

## Map

- `skills/` — the skills, one directory each (`SKILL.md` + supporting files)
- `hooks/` — `hooks.json` plus the brain hooks: `inject-brain.sh` (SessionStart, injects `brain/index.md`) and `auto-index-brain.sh` (PostToolUse, rebuilds the index on `brain/` writes). Auto-discovered from `hooks/hooks.json` at plugin root
- `tests/unit/` — file-level checks; `tests/integration/` — cross-file checks; `tests/e2e/` — model-backed smoke and evals; `tests/lib/` — shared test helpers (frontmatter/lint rules, skill/agent catalog, claude CLI runner, the eval harness: `harness.ts` for tasks and graders, `trials.ts` for trials and the LLM judge, `report.ts` for the run rollup)
- `.claude-plugin/` — plugin manifest (version lives here) and marketplace manifest

## Commands

- Test: `bun run test` (zero tokens, run on every edit)
- Watch mode: `bun run test:watch` (reruns on skill/agent/hook edits)
- Unit only: `bun run test:unit`
- Integration only: `bun run test:integration`
- Single test: `bun run test -- -t "<name>"` (e.g. `-t grill`)
- Audit judge verdicts from the latest eval run: `bun run eval:audit`
- Run the plugin: `claude --plugin-dir . -p "<prompt>"` (working tree, no install)

## Rules

- `bun run test:e2e`, `bun run test:evals`, and `bun run test:triggers` make real LLM calls — run them before release,
  not on every edit. `bun run test` is the every-edit check.
- Skill prose is the product: instruction-budget rules apply. Tight scope, no
  redundant instructions, pointers over copies. SKILL.md stays under 500 lines;
  descriptions under 1024 chars (the lint enforces both).
- Skill frontmatter `name:` must match its directory name (lint enforces it).
- When creating or revising skills, follow `docs/skill-writing-guide.md` and
  start from `docs/templates/SKILL.md` unless the skill is a pure reference.
- For the frontmatter options available to skills and agents (what's mandatory,
  optional, ignored, or unreliable, and how AFK uses them), see
  `docs/skills-and-agents-reference.md`.
