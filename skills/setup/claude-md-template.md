# CLAUDE.md Template

An annotated skeleton. Target under ~60 lines of output; every line must apply
to EVERY session. Comments in {curly braces} are guidance — never copy them
into the real file.

---

# <Project name>

<One or two sentences: what this is and for whom. This is the WHY — it lets the
agent make judgment calls that align with the product, not just the code.>

## Stack

<One line per major technology with the version that matters:
"Astro 5 + React 19, TypeScript strict, Postgres via Drizzle". No prose.>

## Map

<The WHAT. One line per top-level area the agent will actually navigate.
Monorepos: every app and shared package gets a line saying what it's FOR.>

- `src/features/` — feature modules, one directory per domain feature
- `src/shared/` — cross-feature components and utilities
- `server/api/` — HTTP handlers; business logic lives in `server/services/`
- `.afk/brain/` — project docs and learnings; see "Go deeper" below

## Commands

<The HOW. Verification is the agent's permission slip to commit — these four
lines are the most load-bearing in the file. Copy from .afk/config.json.>

- Test: `<command>`
- Typecheck: `<command>`
- Lint: `<command>`
- Dev server: `<command>` → <url>

## Rules

<Hard boundaries only — things that are ALWAYS true and that the agent cannot
infer from reading code. 3–7 bullets. If you're tempted to write more, the
extras are either lint rules (encode them there), task-specific (brain notes),
or one-off hotfixes (delete them). NO style guidelines — the linter owns style.>

- Use `bun`, never `npm` or `node`.
- Never edit files in `migrations/` by hand; use `<generate command>`.
- <…>

## Go deeper

<Progressive disclosure. The brain at .afk/brain/ holds the project's docs and
learnings — its index is injected at session start. List ONLY the high-traffic
notes here, one line each: filename + when to read it. The agent reads these on
demand instead of carrying them in every session. Pointers, not copies;
file:line references inside the notes, not snippets.>

Project docs and learnings live in `.afk/brain/` (index injected at session
start). Before working in an area below, read its note first:

- `.afk/brain/building-the-project.md` — build pipeline, env vars, deploy targets
- `.afk/brain/running-tests.md` — test layout, fixtures, how to run one test
- `.afk/brain/database-schema.md` — schema conventions, how to add a migration
- `.afk/brain/service-architecture.md` — module boundaries, who may import whom

Read any other brain notes from the injected index that are relevant before acting.
