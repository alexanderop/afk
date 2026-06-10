---
name: qa
description: Use when implementation and refactoring are done but no human has seen the feature run — drives the real app in a real browser with agent-browser, walks the happy path and negative paths from the spec, and writes a screenshot-backed QA report.
---

# QA: Agentic Browser Verification

## Overview

Tests prove the units work. They don't prove a user can finish the flow. The gap
between "tests pass" and "the wizard actually completes" is where AFK features
quietly fail — and it's exactly the gap a real browser walk closes.

You act as a QA engineer: drive the UI, observe what actually renders, and
report with evidence. **A claim without a screenshot is not a finding.**

## Setup

1. Read `.afk/config.json` for the dev command and `devUrl`. Start the app;
   wait until it responds.
2. Check `agent-browser --help` works. If not installed, tell the user how to
   install it and offer to fall back to the project's e2e runner. Do not
   silently skip QA.
3. Create `qa/` and a `qa/screenshots/<slug>/` directory.

## Test Plan

Derive test cases from the PRD — not from the implementation:

1. **Happy path** — the PRD's "Happy path" section, step by step, with valid data.
2. **Acceptance criteria** — every numbered criterion from the PRD becomes a test case, verbatim.
3. **Negative paths** — from the PRD's "Validation & error states": invalid input at each step, and at least one failure mid-flow (declined payment, server error if mockable).
4. **One hostile pass** — refresh mid-flow, browser back button, double-click submit, empty-everything submit.

For each case: use agent-browser snapshots to find elements (stable `@e1` refs,
not CSS selectors), act, screenshot every state transition, and read the
console/network for errors even when the UI looks right. A rendered success
screen with a 500 in the console is a FAIL.

## Report

Write `qa/<slug>.md`:

```markdown
# QA Report: <feature> — <date>

## Verdict: PASS | FAIL (N of M cases failed)

## TC-01: <name>  — PASS/FAIL
Steps taken:        (numbered, exactly what you did)
Expected:           (from the PRD)
Actual:             (what happened, console errors included)
Evidence:           qa/screenshots/<slug>/tc01-*.png
```

Failures must be reproducible from the report alone — a developer (or the next
pipeline phase) fixes from your steps, not from your memory. If anything is red,
hand the failing cases back to **afk:ralph** as fix tasks before review.

## Red Flags

| Thought | Reality |
|---------|---------|
| "The e2e tests cover this, browser QA is redundant" | The e2e tests were written by the same loops that wrote the bugs. Independent eyes, real browser. |
| "The page looks right, mark it PASS" | Check the console and network tab. Looking right and being right differ by one swallowed 500. |
| "I'll test what was implemented" | Test what was SPECIFIED. The difference between the two is the bug. |
| "Skip the hostile pass, users won't do that" | Users do exactly that, within the first hour. |
| "Screenshot at the end is enough" | Every state transition. The bug is always in the transition you didn't capture. |

## Integration

- Input: PRD acceptance criteria (**afk:spec**), running app (**afk:setup** dev command).
- Failures route back to **afk:ralph**; a clean report unblocks **afk:review**.
- Called by **afk:pipeline** as phase 5.
