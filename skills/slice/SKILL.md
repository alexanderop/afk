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

## Ticket Format

Write each slice to `docs/tickets/NN-<slug>.md`. This file is the ONLY context
the implementation loop gets besides the codebase, so it must be self-contained:

```markdown
# Slice NN: <name>

## Behavior
One paragraph: what a user can do after this slice that they couldn't before.

## Context
What exists already (files, endpoints, components — concrete paths).
Which PRD sections this implements. What other slices it depends on.

## Tasks
- [ ] Task 1 (test-first: name the behavior the test asserts)
- [ ] Task 2
...

## Acceptance
How to verify this slice alone works (command to run, URL to click).

## Out of scope
What belongs to other slices — name them.
```

After writing all tickets, present the slice list to the user with one line per
slice and **get approval**. This is the last cheap moment to change direction.

## Red Flags

| Thought | Reality |
|---------|---------|
| "First a backend slice, then a frontend slice" | Horizontal. Nothing ships until both land. Re-cut vertically. |
| "Slice 1: project setup and shared types" | A slice that ships no observable behavior is not a slice. Fold setup into the first real slice. |
| "This slice is big but splitting feels artificial" | A slice that overflows one loop's context produces exactly the mess the pipeline exists to prevent. Split it. |
| "The tickets can reference the PRD for details" | The loop reads the ticket, not your memory. Copy the relevant details in. |
| "Skip user approval, the slicing is obvious" | Re-slicing after 3 loops have run costs hours. The approval costs one message. |

## Integration

- Input: approved PRD from **afk:spec**.
- Next: **afk:ralph** runs one implementation loop per ticket.
- Called by **afk:pipeline** as phase 2.
