---
name: refactor-pass
description: Use after all slices of a feature are implemented and before QA/review — a dedicated cleanup pass over the branch that collapses duplication across slices, removes dead code, and fixes naming, because the implementation loops will not do this on their own.
---

# Refactor Pass: The Step LLMs Always Skip

## Overview

LLMs cheat on refactoring. Even with red-green-refactor forced in every loop,
the "refactor" step shrinks to renaming a variable. The deeper work — extracting
the shared helper, collapsing the duplication that four independent slices each
introduced, killing dead branches — never happens, because each loop only sees
its own slice. This pass sees the whole branch.

**Iron Laws:**
- **DO NOT CHANGE BEHAVIOR. DO NOT ADD FEATURES.**
- **TESTS STAY GREEN AFTER EVERY SINGLE COMMIT.**

## The Pass

Scope: `git diff {base}..HEAD --stat` — only files this branch touched, plus
files they duplicate against.

Work one category at a time. In each category: find ONE offender, fix it, run
the full checks from `.afk/config.json`, commit. Repeat until the category is
dry, then move on:

| Category | What to hunt |
|----------|--------------|
| **Duplication** | The same logic in 2+ slices (each loop solved it independently). Extract to a shared function/composable — in the location the codebase's conventions dictate. |
| **Cross-slice consistency** | Same concept, different names/patterns across slices (one slice's `bookingDraft`, another's `draftBooking`). Pick one, align. |
| **Type holes** | `any`, `as` casts, `@ts-ignore`, untyped boundaries. One unfixed `any` gets copied everywhere by the next agent. |
| **Dead code** | Unused exports, unreachable branches, commented-out blocks, leftover scaffolding from abandoned approaches. |
| **Long units** | Functions/files that grew past the codebase's norm. Split along responsibility lines. |
| **Error handling** | Swallowed errors, generic catch-and-log, inconsistent error shapes across the slices' endpoints. |

Small commits, one concern each — the human reviewer must be able to verify
"behavior unchanged" per commit at a glance.

## Ban the Recurrence

Every smell you fixed more than once is a candidate for backpressure. Before
finishing, list the recurring ones and either:

- add a lint rule that makes it an error (preferred), or
- add a line to AGENTS.md, or
- note it for `afk:reflect` to file into `.afk/brain/`.

Every shortcut you catch the agent taking, ban it with a rule — otherwise the
next pipeline run reintroduces it.

## Red Flags

| Thought | Reality |
|---------|---------|
| "The code looks fine, skip the pass" | Four independent loops just wrote code without seeing each other. There IS duplication. Look. |
| "While I'm here, this function could also do X" | Behavior change. Out. File it as a follow-up instead. |
| "I'll batch all the cleanups into one commit" | One concern per commit, or the reviewer can't verify behavior is unchanged. |
| "This abstraction would be elegant" | Collapse duplication into the dumbest shared thing that works. Speculative elegance is how refactors introduce bugs. |
| "Tests are slow, I'll run them at the end" | After EVERY commit. A refactor that breaks tests at step 9 of 12 is unbisectable. |

## Integration

- Input: completed branch from **afk:ralph**.
- Next: **afk:qa**, then **afk:review**.
- Feeds: recurring smells → **afk:setup** (lint rules) and **afk:reflect** (brain notes).
- Called by **afk:pipeline** as phase 4.
