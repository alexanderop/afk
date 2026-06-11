---
name: reflect
description: Use after a pipeline run, a correction from the user, or any session with notable friction — captures learnings into structural enforcement (lint rules, AGENTS.md) first, and into the project's .afk/brain/ memory only when a rule can't encode it.
---

# Reflect: Bank What the Run Taught

## Overview

Every pipeline run teaches something: a shortcut an agent took, a codebase
gotcha that cost a fix cycle, a convention the spec reviewer kept flagging.
Unbanked, the next run pays for the same lesson again.

**Routing law: structure beats memory.** A lint rule fires every time; a brain
note only helps if the next agent reads it. Always try to encode the lesson as
enforcement first.

## Step 1: Scan the Session

Look for:

- **Corrections** — the user or a reviewer said "no, do it this way."
- **Fix cycles** — what did QA/review send back, and what would have prevented it?
- **Shortcuts caught** — deleted tests, `any`s, swallowed errors an agent tried.
- **Codebase gotchas** — things an agent had to discover the hard way (quirky build step, non-obvious module boundary, flaky test).
- **Friction** — repeated manual steps, commands that needed three attempts.

## Step 2: Route Each Learning

In strict order — first match wins:

1. **Lint rule / typecheck config / test** → add it (or propose it). The lesson now enforces itself. Done; no note needed.
2. **Script or command** → if the lesson is "this 5-step dance must happen in order," make it one script and reference it from CLAUDE.md or a brain note.
3. **CLAUDE.md line** → ONLY if it's universal — true in every session regardless of task ("we use bun, never npm"). CLAUDE.md is instruction-budget-constrained: one line in, consider one line out. Non-universal lines teach the model to ignore the whole file.
4. **Brain note** → everything else worth keeping: task-specific know-how ("how we add a migration"), architectural reasoning, gotcha explanations, "we tried X and it failed because Y." For high-traffic how-to notes, also add a one-line pointer in CLAUDE.md's "Go deeper" section.
5. **Skip** → one-off incidents. Apply the frequency test: would this come up in a DIFFERENT task? No → don't save it.

## Step 3: Write Brain Notes

`.afk/brain/<topic-slug>.md` — one topic per file, lowercase-hyphen names:

```markdown
# <Topic>

<2–6 sentences: the fact, the why, and what to do about it.
Link related notes as [[other-note]].>
```

Quality bar — all three or it doesn't go in:
- **High-signal**: an agent gets it wrong WITHOUT this note.
- **Recurring**: it will come up again in different tasks.
- **High-impact**: getting it wrong costs a fix cycle or worse.

Update existing notes rather than writing near-duplicates; delete notes the
codebase has outgrown. The index regenerates automatically on write; the
SessionStart hook injects it into every future session.

## Step 4: Prune While You're Here

Memory compounds only while it stays true — a note recommending what the
codebase now contradicts is worse than no note. For each existing brain note
touching the areas this session worked in:

- **Verify its references** — file paths, commands, named symbols, `[[links]]`.
  Cosmetic drift (moved file, renamed symbol) with the advice still right →
  fix in place.
- **Check the recommendation** — if the note's advice now contradicts how the
  code actually works, an in-place touch-up isn't enough. The boundary: when
  you're rewriting what the note *recommends*, that's a replace — rewrite it
  from current reality, or delete it.
- **Delete, don't archive** — git history is the archive.

## Red Flags

| Thought | Reality |
|---------|---------|
| "I'll write a brain note about always running lint" | That's a hook or a CI step, not a memory. Structure first. |
| "Better to save everything, storage is free" | Context isn't. Every injected note taxes every future session. Three-part quality bar. |
| "This correction was one-off, but just in case…" | Frequency test failed → skip. The brain is for patterns, not incidents. |
| "I'll append to one big LEARNINGS.md" | One topic per file, or recall becomes grep-and-pray. |
| "This how-to belongs in CLAUDE.md so it's never missed" | Task-specific content in CLAUDE.md gets the whole file ignored. Brain note + a "Go deeper" pointer instead. |
| "That old note is probably still fine" | Verify, don't assume. A stale note injected into every session makes agents confidently wrong at scale. |

## Integration

- Run after **afk:pipeline** completes (the pipeline suggests it).
- Lint-rule routes land via **afk:setup**'s config; recurring smells arrive from **afk:refactor-pass**.
- The SessionStart hook injects `.afk/brain/index.md`; the PostToolUse hook keeps the index current.
