# PRD: Import existing team docs into the brain

## Goal

Teams adopting afk usually already have docs — a `docs/` folder, ADRs, a fat
`ARCHITECTURE.md`, a wiki export. Today `afk:setup` Part 3 stands up an empty
brain and forbids pre-writing notes, so that existing knowledge never reaches
the session-start index. This feature adds a **per-doc triage** to `afk:setup`
Part 3: when existing docs are found, the agent proposes a verdict per doc,
the user approves the plan, and approved content is distilled into
`.afk/brain/` notes. Success: a team with existing docs finishes `afk:setup`
with a brain that carries the high-signal parts of those docs, without the
originals being touched.

## Users & context

- Team leads / first adopters running `afk:setup` on an established repo.
- Runs inside the interactive `afk:setup` session (Claude Code or Copilot
  CLI) — the user is present to approve the triage plan.
- The product is skill prose: this changes `skills/setup/SKILL.md`
  (and its frontmatter description), nothing executable.

## Happy path

1. User runs `afk:setup` on a repo that has existing docs.
2. Parts 1–2 run as today (backpressure audit, CLAUDE.md).
3. Part 3: before creating the brain, the agent looks for existing docs —
   any readable files in the repo (`docs/`, `adr/`, README sections,
   CONTRIBUTING, onboarding guides) plus any path the user points at
   (e.g. a dropped-in Notion/Confluence export).
4. The agent reads the candidates and builds a **triage plan**: one row per
   doc with a verdict, a destination, and a one-line reason. Verdicts use
   `afk:reflect`'s full routing law (structure beats memory, first match
   wins):
   - **lint/config** — mechanically checkable rules → Part 1's lint config / `.afk/config.json`
   - **CLAUDE.md line** — universal, true-in-every-session facts → Part 2's CLAUDE.md (sparingly)
   - **distill** — task-specific know-how, architectural reasoning, gotchas → a one-topic brain note
   - **skip** — low-signal, one-off, or redundant with the code
5. The plan shows the projected brain index size and warns if it is getting
   big (the index is injected into every session).
6. User approves or edits the plan. **Nothing is written before approval.**
7. Agent writes the approved brain notes — one topic per file,
   lowercase-hyphen names, `[[wikilinks]]`, each note citing its source doc
   path (`Source: docs/adr/0007.md`). lint/CLAUDE.md verdicts flow through
   the Parts 1–2 mechanisms (user approval as those parts already require).
8. The index regenerates via the PostToolUse hook; where hooks don't fire
   (Copilot CLI), the skill instructs the agent to regenerate `index.md`
   manually in the same format.
9. Originals are left exactly as they were. The skill tells the user that
   retiring or redirecting the old docs is their cleanup to do.

## Edge cases

- **No existing docs** → Part 3 behaves exactly as today (empty brain; the
  "notes earn their way in" rule stands).
- **Large doc set (50+ files)** → no numeric cap; the reflect quality bar
  (high-signal / recurring / high-impact, all three) filters candidates, and
  the plan's projected-index-size warning gives the user the volume signal.
- **One doc, many topics** → split into multiple one-topic notes; the plan
  shows the split.
- **Several docs, same topic (or conflicting)** → merge into one note; the
  plan flags the conflict for the user to resolve at approval time.
- **Brain already has notes (setup re-run)** → update existing notes rather
  than writing near-duplicates (reflect's existing rule).
- **Non-markdown sources** (rst, txt, html export) → in scope; anything
  readable on disk.
- **Unreadable/binary files** → verdict `skip` with reason.
- **Stale docs** → converted as-written. The triage does NOT verify doc
  claims against the codebase; staleness is the team's problem. The
  `Source:` line preserves traceability.

## Validation & error states

- The triage plan approval is the only gate: no brain note, CLAUDE.md line,
  or config change is written before the user approves the plan.
- If the user rejects or edits verdicts, the agent revises the plan and
  re-presents; there is no partial write on rejection.
- afk never modifies or deletes a source doc, under any verdict.

## Data & integrations

- **Changed**: `skills/setup/SKILL.md` — Part 3 grows the triage branch; the
  "don't pre-write empty placeholder notes" rule is reworded so it doesn't
  contradict imports (placeholders ≠ distilled existing knowledge). The
  frontmatter `description` gains the existing-docs trigger (e.g. "…or when
  a team's existing docs should be imported into the brain") so the skill
  fires on "we already have docs, convert them".
- **Reused, unchanged**: `afk:reflect`'s routing law and three-part quality
  bar (referenced by pointer, not copied — instruction-budget rule);
  `hooks/auto-index-brain.sh` (index format unchanged); brain note format.
- **New**: nothing executable. No new skill, no new hook, no config keys.

## Out of scope

- A standalone `afk:import` skill (lives inside `afk:setup` only).
- Fetching from external systems (Confluence/Notion/Google Docs APIs or
  URLs) — the skill says "export it to a file first", nothing more.
- Touching originals: deleting, stubbing, or redirecting imported docs.
- Verifying doc claims against the codebase before import.
- Numeric caps or user-set note budgets.
- Auto-syncing brain notes when source docs later change.

## Acceptance criteria

1. `skills/setup/SKILL.md` Part 3 contains the import branch: detect
   existing docs (repo files + user-pointed paths), build a per-doc triage
   plan with the four verdicts (lint/config, CLAUDE.md, distill, skip), and
   gate ALL writes on user approval of the plan.
2. The skill text states that originals are never modified and that brain
   notes cite their source doc path.
3. Volume control in the skill text is the reflect quality bar plus a
   projected-index-size warning — no numeric cap appears anywhere.
4. The skill text contains no doc-verification step (docs are trusted
   as-written).
5. The skill text includes the manual index-regeneration fallback for
   harnesses without hooks (Copilot parity rule).
6. The "no empty placeholder notes" rule still exists and reads consistently
   next to the import branch.
7. `skills/setup/SKILL.md` frontmatter description mentions importing
   existing docs.
8. `tests/hooks/run-hook-tests.sh` and shellcheck pass (zero-token suite).
9. (Deliberate, token-costing, optional at review time) one
   `tests/skill-triggering/` case: "our team already has an architecture
   doc, can afk use it?" routes to `afk:setup`.

## Open questions

(none)
