---
name: slice
description: Use when an approved PRD needs to become implementation tickets — cuts the work into vertical slices (UI + API + test, each independently shippable) sized to fit one fresh-context implementation loop.
---

# Slice: Vertical Slice Tickets

## Overview

A PRD is too big for one implementation loop. The right cut is **vertical**:
a thin end-to-end strip of behavior — one endpoint, the one form that consumes
it, the one test that proves it works. Each slice is independently shippable and
survives if its sibling fails.

**Horizontal slices kill agents.** "Frontend task" + "backend task" + "tests
task" means nothing works until everything works, every slice blocks on every
other slice, and context compaction is guaranteed.

## Slicing Rules

1. **Every slice is end-to-end.** It touches whatever layers the behavior needs — UI + API + test for a web feature; endpoint + storage + contract test for a pure backend; subcommand + output + test for a CLI — not one layer across all behaviors.
2. **Every slice is independently shippable.** If the pipeline died after slice 2 of 4, slices 1–2 would still be mergeable and useful.
3. **Every slice is a 1–2 pointer.** It must fit one fresh-context loop: roughly 3–10 tasks, a handful of files. If a slice needs a mid-slice "phase 2", split it.
4. **Order by dependency, minimize dependencies.** Slice 1 is the tracer bullet — the thinnest possible end-to-end path that proves the architecture. Later slices widen it.
5. **Shared infrastructure goes in the slice that first needs it**, not in a "setup" slice that ships nothing observable.

Example — booking wizard PRD becomes:

```
01-guest-info        form + POST /booking/draft + e2e test
02-room-selection    form + GET /rooms + e2e test
03-payment           form + POST /booking/confirm + e2e test
04-wizard-navigation cross-step state machine + e2e test
```

The same cut works with no UI — a webhook-ingestion PRD becomes:

```
01-receive-and-store    POST /webhooks/orders + persistence + contract test
02-signature-check      reject unsigned/replayed payloads + test
03-retry-on-downstream  queue + retry policy + failure-injection test
```

## Recon First

The Context and Files sections need exact paths, existing endpoint shapes, and
test conventions — don't burn the slicing context gathering them. Fan out
parallel read-only subagents (Claude Code: Explore agents; Copilot CLI: `task`
with `"general-purpose"`), one per area the PRD touches, each returning a
compact map of what exists. You keep the whole PRD in view and make the cut
from their maps.

## Ticket Format

Write each slice to `docs/tickets/NN-<slug>.md`. This file is the ONLY context
the implementation loop gets besides the codebase, so it must be self-contained:

```markdown
# Slice NN: <name>
Model: cheap | standard | top — one-line why

## Behavior
One paragraph: what a user can do after this slice that they couldn't before.

## Context
What exists already (files, endpoints, components — concrete paths).
Which PRD sections this implements. What other slices it depends on.

## Files
- Create: `exact/path/to/file.ts` — one-line responsibility
- Modify: `exact/path/to/existing.ts`
- Test: `exact/path/to/file.test.ts`

## Tasks
- [ ] Task 1 — test: <the behavior the test asserts>; introduces `<signature / type / endpoint shape, if any>`
- [ ] Task 2 — test: <...>
...

## Acceptance
How to verify this slice alone works (command to run, URL to click).

## Out of scope
What belongs to other slices — name them.
```

The Files section locks in decomposition: which files exist and what each is
responsible for is decided here, with the whole PRD in view — not improvised
by an implementer mid-loop. Each task names the test that proves it and any
interface it introduces, because a later slice will consume that interface by
exactly the name written down now.

The Model line sizes the implementation loop's model — decided here, where the
whole PRD is in view, not by ralph mid-run: **cheap** for 1–2 files with a
complete spec (most slices, when the ticket is good — mechanical work is what
the format is for); **standard** for multi-file integration or
pattern-matching across the codebase; **top** for design judgment the ticket
can't fully pin down. When in doubt, standard. Planning and review already run
on the most capable model; the tiers spend cheap tokens on well-specified
work. **afk:ralph** maps tiers to harness models at dispatch.

**No placeholders.** These are ticket failures, not shorthand: "TBD"/"TODO",
"add appropriate error handling", "handle edge cases", a task with no named
test, "similar to slice NN" (copy the details in — the loop reads only its
own ticket).

## Ticket Review

You wrote these tickets, so you can't read them with fresh eyes — your head
holds exactly the context they might be missing. Dispatch fresh read-only
subagents (Copilot CLI: `task` with `"general-purpose"`):

1. **Dry-run each ticket** — one subagent per ticket, in parallel. Its prompt
   is ONLY the ticket text plus: "You will implement this with no other
   context. List every fact, path, or interface you'd need that isn't written
   here, and every placeholder failure (TBD, unnamed test, 'similar to slice
   NN')." This reads the ticket exactly the way the implementation loop will.
2. **Cross-check the set** — one subagent with all tickets plus the PRD: point
   each acceptance criterion to the slice that implements it (a criterion with
   no slice is a missing ticket), and verify that names, types, and endpoint
   shapes a later slice consumes match what the earlier slice defines. `POST
   /booking/draft` in slice 01 but `/bookings/draft` in slice 04 is a bug —
   cheap now, expensive three implementation loops later.

Fix what they find inline. Then present the slice list to the user with one
line per slice and **get approval**. This is the last cheap moment to change
direction.

## Red Flags

| Thought | Reality |
|---------|---------|
| "First a backend slice, then a frontend slice" | Horizontal. Nothing ships until both land. Re-cut vertically. |
| "Slice 1: project setup and shared types" | A slice that ships no observable behavior is not a slice. Fold setup into the first real slice. |
| "This slice is big but splitting feels artificial" | A slice that overflows one loop's context produces exactly the mess the pipeline exists to prevent. Split it. |
| "The tickets can reference the PRD for details" | The loop reads the ticket, not your memory. Copy the relevant details in. |
| "I'll review the tickets myself, dispatching is overhead" | You're primed with everything the tickets are missing. Only a fresh reader finds the gaps the implementer will hit. |
| "Every slice gets the top model, to be safe" | A 1–2 file slice with a complete spec is mechanical — making it so is what this skill is for. Cheap is the default, not the exception. |
| "Skip user approval, the slicing is obvious" | Re-slicing after 3 loops have run costs hours. The approval costs one message. |

## Integration

- Input: approved PRD from **afk:spec**.
- Next: **afk:ralph** runs one implementation loop per ticket, on the ticket's model tier.
- Called by **afk:pipeline** as phase 2.
