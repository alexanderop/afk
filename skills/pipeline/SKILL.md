---
name: pipeline
description: "Use when the user hands over a big feature (a spec, a PRD, or a 5+ point request) and wants it shipped end to end — orchestrates the full AFK pipeline: spec → slice → implement → refactor → QA → review → PR, with human gates only at the edges."
---

# Pipeline: The Full AFK Run

## Overview

This is the meta-skill. It chains the other afk skills into one run:

```
0. Backpressure gate   ── check  ──  .afk/config.json exists and is green
1. Align on spec       ── HITL  ──  afk:spec (skipped if approved PRD provided)
2. Slice the ticket    ── HITL gate ─ afk:slice, user approves the cut
3. Implement per slice ── AFK   ──  afk:ralph (TDD loops + spec review)
4. Refactor pass       ── AFK   ──  afk:refactor-pass
5. Agentic QA          ── AFK   ──  afk:qa
6. Review              ── AFK   ──  afk:review
7. PR + handoff        ── HITL  ──  human reviews, business does UAT
```

After the slice approval in phase 2, the user should not need to answer
anything until the PR is open. Front-load every question into phases 1–2.

**Invoke each phase's skill via the Skill tool and follow it** — this skill
defines the order and the gates, not the phase internals.

## Phase Gates

**Phase 0 — Backpressure.** Read `.afk/config.json`. Missing or `red` →
run `afk:setup` first. Then **re-run the test, typecheck, and lint commands
now** — the recorded status is from whenever setup last ran, and documented ≠
working. A recorded green that doesn't reproduce is `red`. **HARD GATE: never
go AFK in a project with no failing tests to fail.** `yellow` → tell the user
what's weak and let them decide.

**Phase 1 — Spec.** If the user provided a spec/PRD: read it critically against
the `afk:spec` template. Gaps in acceptance criteria, error states, or
out-of-scope → ask now (this is the last conversation). No spec → run the
`afk:spec` interview. Either way: explicit user approval of the PRD.

**Phase 2 — Slice.** Run `afk:slice`. Present the slice list. **This approval
is the point of no return — say so.** Also confirm now: PR target branch, and
anything destructive-adjacent (migrations, deletions) the slices imply.

After approval, create a dedicated git worktree for the run (`git worktree add
../<repo>-afk-<slug> -b <branch>`) and do all AFK work there — the user's
checkout stays free while they're away. Record the worktree path in the state
file. Skip only if the user says to work in place.

**Phases 3–6 — AFK.** Run `afk:ralph` → `afk:refactor-pass` → `afk:qa` →
`afk:review` in order. Failure routing:

- QA failures → fix tasks back to `afk:ralph`, then re-run QA. Cap: 2 cycles, then pause and report.
- Review criticals → fixes via `afk:ralph`, then re-review. Cap: 2 cycles.
- A slice BLOCKED on requirements → **skip it, continue the others** (vertical slices survive their siblings), report it in the handoff. Never invent requirements to keep moving.

**Phase 7 — Handoff.** Push the branch, open a PR. Body: what shipped (per
slice), QA verdict with report link, review verdict with report link, skipped/
blocked items, and where the human should focus. Then suggest `afk:reflect`.

## State: Resumable by Design

Maintain `.afk/pipeline/<slug>.md` from phase 0:

```markdown
# Pipeline: <feature>   branch: <name>   base: <ref>   worktree: <path>
- [x] 0 backpressure: green
- [x] 1 spec: docs/specs/prd-<slug>.md (approved)
- [x] 2 slices: 4 tickets (approved)
- [ ] 3 implement: 2/4 slices done
- [ ] 4 refactor  - [ ] 5 qa  - [ ] 6 review  - [ ] 7 pr
## Log
<one line per significant event: blocked slices, fix cycles, decisions>
```

Update it after every phase transition. If a session dies mid-run, the next
session reads this file plus the ticket checkboxes and resumes exactly where it
stopped. Progress lives on disk, never only in conversation memory.

Compaction is survival, not failure: after the conversation gets compacted
mid-run, re-read `.afk/pipeline/<slug>.md` AND re-invoke the current phase's
skill before continuing — the summarized version of a skill is not the skill.

## Red Flags

| Thought | Reality |
|---------|---------|
| "The spec phase is done enough, start slicing" | Every ambiguity you carry past phase 2 becomes a wrong guess made at 3 a.m. with nobody to ask. |
| "Slice 2 is blocked, I'll interpret the requirement myself" | Skip it, ship the rest, report it. Invented requirements are how AFK gets banned at companies. |
| "QA failed twice, third fix cycle will do it" | Two cycles, then stop and report. Loops that don't converge need a human, not persistence. |
| "I'll keep the pipeline state in my head" | The session WILL die at slice 3 of 4. Disk or it didn't happen. |
| "Skip review, QA already passed" | QA proves the user can finish the flow. Review catches the injection in the endpoint QA happily used. |

## Integration

- Chains: **afk:setup** → **afk:spec** → **afk:slice** → **afk:ralph** → **afk:refactor-pass** → **afk:qa** → **afk:review**.
- After the PR: **afk:reflect** to bank what the run taught.
- Small tickets don't belong here — the sizing gate in `using-afk` decides.
