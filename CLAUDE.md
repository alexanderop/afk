# afk

A Claude Code plugin (also runs on Copilot CLI) implementing the AFK coding
pipeline: spec → vertical slices → TDD loops → refactor pass → agentic QA →
multi-agent review. The product is the markdown itself — skills, agent
definitions, and hooks that steer other agents.

## Stack

Markdown skills + YAML frontmatter (Claude Code plugin format), bash hooks,
bash test harness. No build step, no package manager, no dependencies beyond
`jq` and `shellcheck`.

## Map

- `skills/` — the 9 pipeline skills, one directory each (`SKILL.md` + supporting files)
- `agents/` — 6 subagent definitions (`*.agent.md`) that `ralph` and `review` dispatch
- `hooks/` — SessionStart sizing-gate injection, brain auto-indexer (`hooks.json` wires them)
- `tests/` — four suites with very different costs; read `tests/README.md` before running anything
- `.claude-plugin/` — plugin manifest (version lives here) and marketplace manifest

## Commands

- Test: `tests/hooks/run-hook-tests.sh` (zero tokens, run on every edit)
- Lint: `find hooks tests -name '*.sh' -print0 | xargs -0 shellcheck -x -P SCRIPTDIR`
- Run the plugin: `claude --plugin-dir . -p "<prompt>"` (your working tree, no install needed)

## Rules

- The LLM-in-the-loop suites (`tests/skill-triggering/`, `tests/claude-code/`,
  `tests/parity/`) cost real tokens and minutes — run them deliberately, never
  as a reflex. The hook tests + shellcheck are the every-edit check.
- The severity rubric must stay in sync between `skills/review/reviewer-shared.md`
  and all four reviewer agents — a hook test enforces this; change them together.
- Every skill must work on both Claude Code and Copilot CLI. Don't rely on
  hooks firing (Copilot doesn't execute them); the CLAUDE.md-template backstop
  and parity suite exist for this.
- Skill/agent prose is the product: instruction-budget rules apply to it too.
  Tight scope, no redundant instructions, pointers over copies.

## Ticket-sizing gate (afk)

Before implementing any feature or fix, size it first:

- **Small (1–3 points)** — one concern, few files, clear requirements: implement
  directly in this session. TDD still applies.
- **Big (5+ points)** — frontend + backend, multi-step flows, vague requirements:
  do NOT implement in one pass. Route to the `afk:pipeline` skill (or `afk:spec`
  if no spec exists).
- If `.afk/brain/index.md` exists and is not already in your context, read it
  before acting.

## Go deeper

Project docs and learnings live in `.afk/brain/` (index injected at session
start). Before working in an area below, read its note first:

- `.afk/brain/shellcheck-invocation.md` — before changing the lint command or adding scripts that `source` files
- `tests/README.md` — suite layout, costs, and how to add tests
