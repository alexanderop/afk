---
name: setup
description: Use when a project is new to AFK coding, when agents keep making the same mistakes, before the first pipeline run, or when a team's existing docs should be imported into the brain — audits and fixes the project's backpressure (tests, lint, types), crafts a proper CLAUDE.md, and stands up the .afk/ brain structure (importing existing docs into it) so agents can self-correct and remember.
---

# Setup: Backpressure, CLAUDE.md, and the Brain

## Overview

Setup produces three things, in this order:

1. **Backpressure** — one-command test/lint/typecheck, recorded in `.afk/config.json`, so wrongness is loud.
2. **A good CLAUDE.md** — the only file in every session; it onboards the agent to the codebase.
3. **The brain** — `.afk/brain/`, the project's docs AND memory in one vault: deliberate how-to notes plus earned learnings, auto-indexed, injected at session start.

This is an audit-and-fix skill, not a scaffolder. Work with what the project
has. Only add tooling the user approves.

## Part 1: The Backpressure Audit

Check each item. Record the exact command that works, or RED if none exists.

| # | Check | How to verify |
|---|-------|---------------|
| 1 | **Tests run in one command** | Find the test script (package.json, Makefile, pyproject, etc.). Run it. Must exit non-zero on failure. |
| 2 | **Typecheck in one command** | `tsc --noEmit`, `mypy`, etc. Run it. |
| 3 | **Lint in one command** | ESLint, ruff, clippy, etc. Run it. Must fail on violations, not just warn. |
| 4 | **Dev server / run command** | How does the app/service start? What URL? Needed by `afk:qa`. |
| 5 | **Git hygiene** | Clean default branch? Can worktrees/branches be created? Does CI run the checks? |
| 6 | **QA surface** | What does this project actually expose — a browser UI, an HTTP API, a CLI? Record it as `qa.mode` (browser / api / cli). browser mode wants agent-browser installed; api mode just needs the service to start; cli mode needs the build command. |

Run the commands yourself. Documented ≠ working — a test command that errors
out is RED, not GREEN.

For each RED item, propose the smallest fix and apply after user approval:
- No test runner → ecosystem default plus ONE example test exercising real behavior (the template the next agent copies).
- Lint warns but never fails → promote the rules that encode past mistakes to errors.
- Style opinions floating around in docs → move them into lint/formatter config. **Never make an agent do a linter's job.**

Write `.afk/config.json`:

```json
{
  "commands": { "test": "...", "typecheck": "...", "lint": "...", "dev": "..." },
  "devUrl": "http://localhost:3000",
  "qa": { "mode": "browser" },
  "backpressure": "green"
}
```

`backpressure`: `green` (1–3 pass), `yellow` (gaps — pipeline warns), `red`
(no tests — `afk:pipeline` refuses to run AFK). `qa.mode` is `browser`, `api`,
or `cli` — what check 6 found; `afk:qa` drives that surface (omit `devUrl` for
cli mode). One more optional key exists: `pipeline.hooks` (team phase hooks —
Part 4).

## Part 2: Craft the CLAUDE.md

CLAUDE.md is the highest-leverage file in the harness: it shapes every phase of
every session. It is also routinely IGNORED when stuffed with non-universal
instructions — the harness tells the model to skip context that isn't relevant.
So: **few instructions, universally applicable, carefully crafted.**

**Do not auto-generate it and walk away.** Draft it from what you learned in
Part 1, then review it with the user line by line — every line must earn its
place in every future session.

Structure it as WHAT / WHY / HOW (template: `claude-md-template.md` in this
skill's directory):

- **WHAT** — the stack and a map of the codebase. In monorepos: what each app and shared package is for, so the agent knows where to look.
- **WHY** — one or two sentences on what the project does and for whom.
- **HOW** — the verification commands from `.afk/config.json` (the agent's permission slip to commit), plus the few hard boundaries ("bun, never npm", "never touch migrations/ by hand").

Hard rules:

- **Under ~60 lines is the target; 300 is the ceiling.** Frontier models follow ~150–200 instructions total, and the system prompt already spends a third of that budget.
- **No style guidelines.** That's the linter's job (Part 1). Style prose in CLAUDE.md burns instruction budget on something a deterministic tool does better.
- **Progressive disclosure for everything task-specific.** Deep instructions go to `.afk/brain/<topic>.md`; CLAUDE.md carries a one-line pointer per high-traffic note ("Read .afk/brain/database-schema.md before touching the schema"). Pointers, not copies.
- **file:line references, not code snippets.** Snippets rot; pointers stay authoritative.

If a CLAUDE.md already exists: audit it against these rules. Fix the lies first
(stale files make agents confidently wrong), then cut — propose deletions for
every line that is style-prose, task-specific, or a hotfix for a one-off
incident (those belong in lint rules or `.afk/brain/` notes).

## Part 3: Stand Up the Brain

Create the knowledge structure so later skills have somewhere to write:

```
.afk/
  config.json          # from Part 1
  brain/
    index.md           # auto-regenerated by the plugin's hook on every write
```

Set the commit policy now, in `.gitignore`: **commit** `.afk/config.json`,
`.afk/brain/`, and `.afk/reviewers/` (they're the team's shared setup);
**ignore** `.afk/pipeline/` and `qa/` (per-run working state and evidence —
they resume from disk and their verdicts get inlined into the PR body, so
committing them is noise). Teams that want the evidence trail in the repo can
delete the `qa/` line — that's a choice, not the default.

The brain is the project's docs AND memory — one vault, two kinds of notes:

- **How-to notes** — deliberate instructions: how to build, how tests are laid out, how to add a migration, who may import whom. Written here (and by `afk:reflect` later), read on demand via CLAUDE.md's "Go deeper" pointers.
- **Learning notes** — gotchas, failed approaches, architectural reasoning that can't be a rule. Written by `afk:reflect` after runs.

Both follow the same rules: one topic per file, lowercase-hyphen names,
`[[wikilinked]]`, and the index is injected into every session automatically.

Seed it now with what Parts 1–2 actually surfaced:
- A how-to note for anything non-obvious you had to figure out during the audit (quirky build step, test layout, env var dance).
- A learning note for any real gotcha (flaky test, non-obvious boundary).

### Import existing docs

Established repos usually already carry knowledge — a `docs/` tree, ADRs, a fat
`ARCHITECTURE.md`, a `CONTRIBUTING`, an onboarding wiki exported to a file.
Before finishing, fold the high-signal parts into the brain so they reach the
session-start index. (External systems — Confluence, Notion, Google Docs — are
not fetched; ask the user to export to a file on disk first.)

1. **Find candidates.** Scan the repo for readable docs (`docs/`, `adr/`,
   README sections, CONTRIBUTING, onboarding guides — any text format: md, rst,
   txt, html export) plus any path the user points at. **No docs found → skip
   this branch**; the empty brain stands and the "earn their way in" rule below
   holds.
2. **Read and triage in a subagent.** Reading the doc set is bulky
   scan-and-summarize work, not orchestration — dispatch it to a
   general-purpose subagent so it doesn't flood the setup session's context (a
   medium model like Sonnet is plenty; a large doc set means more files, not
   harder judgment). Hand it the candidate paths plus `afk:reflect`'s routing
   law (structure beats memory, first match wins) and three-part quality bar
   (high-signal AND recurring AND high-impact). It returns a proposed plan —
   one row per doc, and for every `distill` row the drafted note body so the
   write step needs no re-read. The main session keeps the approval gate (steps
   3–5). Four verdicts:

   | Verdict | For | Lands in |
   |---------|-----|----------|
   | **lint/config** | mechanically checkable rules | Part 1's lint config / `.afk/config.json` |
   | **CLAUDE.md line** | universal, true-in-every-session facts (sparingly) | Part 2's CLAUDE.md |
   | **distill** | task-specific know-how, architectural reasoning, gotchas | a one-topic brain note |
   | **skip** | low-signal, one-off, redundant with the code, or unreadable/binary | nothing |

   - One doc, many topics → split into several distill notes; show the split.
   - Several docs, one topic (or conflicting) → merge into one note; flag the
     conflict in the plan for the user to resolve at approval time.
   - A topic the brain already covers (setup re-run) → update that note, don't
     write a near-duplicate.
3. **Show the plan with a size signal.** Include the projected brain-index size
   and warn if it is getting big — the index is injected into every session.
   There is no numeric cap; the quality bar is the only filter on volume.
4. **Gate on approval. Nothing — no brain note, CLAUDE.md line, or config
   change — is written before the user approves the plan.** On reject or edit,
   revise and re-present; never a partial write.
5. **Write the approved plan.** distill → brain notes, using the bodies the
   subagent drafted in step 2 (one topic per file, lowercase-hyphen names,
   `[[wikilinks]]`, each citing its origin on a `Source: docs/adr/0007.md` line). lint/config and CLAUDE.md verdicts flow
   through the Part 1 / Part 2 mechanisms (the same user approval those parts
   already require). Then refresh the index: the PostToolUse hook regenerates it
   on write, but where hooks don't fire (Copilot CLI) rewrite `index.md` by hand
   in the same format.

Docs are imported **as-written** — the triage does NOT verify their claims
against the code; staleness is the team's problem, and the `Source:` line keeps
the trail back to the original. afk never modifies or deletes a source doc under
any verdict; retiring or redirecting the old docs afterward is the team's
cleanup to do.

Don't pre-write empty placeholder notes — a distilled import carries real
existing knowledge and earns its place, but a blank "we'll need this later" stub
is noise in every session. The quality bar in `afk:reflect` decides what else
earns its way in later.

## Part 4: Team Extension Points (optional)

afk reads two repo-local extension points. Both are committed files, so the
whole team shares them and they version with the code — no plugin fork needed.
Don't scaffold them unprompted (empty extension dirs are placeholder noise);
tell the user they exist and set one up only when the team has something to
plug in.

**Custom reviewers — `.afk/reviewers/<name>.md`.** One specialist per file;
`afk:review` dispatches each matching one alongside the built-in four:

```markdown
---
name: vue-reviewer
description: Vue SFC patterns, composables misuse, reactivity leaks
paths: ["**/*.vue", "**/composables/**"]   # spawn only when the diff touches these; omit = always
tier: lite                                  # lite = Lite AND Full tiers; full (default) = Full only
---
You review Vue code only. Flag: props mutation, watchers that should be
computed, missing `key` in v-for, ...
Do NOT flag: <the team's what-not-to-flag list>
```

The body needs only the domain rules — `afk:review` appends the shared severity
rubric and output format (`reviewer-shared.md`) automatically (and those win
any conflict with the body), and its judge pass verifies these findings like
any built-in's. Coach the team toward:

- **Tight scope** — what to flag AND what to ignore, concrete and measurable
  ("props mutation", not "write clean Vue").
- **Short bodies** — under ~100 lines. Every AI review tool that accepts team
  rules caps them; long prompts dilute every rule in them.
- **The usual ladder first** — a rule that's mechanically checkable belongs in
  the lint config (Part 1), not in a reviewer prompt. Never send an LLM to do
  a linter's job.

**Pipeline hooks — `pipeline.hooks` in `.afk/config.json`.** Wires project
skills (`.claude/skills/<name>/SKILL.md`) to phase boundaries — schema and
rules in `afk:pipeline`. Two constraints to relay: hooks from `after-implement`
onward must run without user input, and a hook naming a skill that doesn't
resolve fails the pipeline's phase 0 gate.

For assets shared across many repos (an org-wide reviewer, a company Figma
skill), a companion plugin on the team's own marketplace fits better than
copy-pasting `.afk/` files between repos.

## Red Flags

| Thought | Reality |
|---------|---------|
| "The README says `npm test` works, mark it green" | Run it. Documented ≠ working. |
| "I'll put the code style guide in CLAUDE.md" | Never send an LLM to do a linter's job. Config in Part 1, prose nowhere. |
| "More detail in CLAUDE.md = better onboarded agent" | Non-universal content teaches the model to ignore the whole file. Pointers to brain notes, not content. |
| "/init generated a decent draft, ship it" | CLAUDE.md is the highest-leverage file in the harness. Every line gets human review. |
| "I'll pre-create brain notes for topics we'll need" | Empty placeholders are noise injected into every session. Distilled imports and afk:reflect earn their way in; blank stubs don't. |
| "Skip the example test, they'll add tests later" | Without one passing test as a template, the next agent invents its own conventions. |

## Integration

- Supporting file: `claude-md-template.md` (annotated CLAUDE.md skeleton).
- Run before the first **afk:pipeline** in any project; the pipeline's phase 0 gates on `.afk/config.json`.
- Part 4's extension points are consumed by **afk:review** (`.afk/reviewers/`) and **afk:pipeline** (`pipeline.hooks`).
- **afk:reflect** routes learnings into the structure built here: lint rules → Part 1's config, universal conventions → CLAUDE.md (sparingly), everything else → `.afk/brain/` notes.
