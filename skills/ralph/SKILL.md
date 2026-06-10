---
name: ralph
description: Use when slice tickets exist and it's time to implement — runs a fresh-context subagent loop per slice with forced TDD (red-green-refactor), then verifies each slice against its ticket with an independent reviewer before moving on.
---

# Ralph: Fresh-Context Implementation Loops

## Overview

Context windows degrade as they fill. The fix is not a bigger window — it's a
smaller scope: one fresh agent per slice, reading one self-contained ticket,
shipping it, and exiting. You aren't aiming for one perfect run; you're aiming
for many cheap runs that converge, with the ticket file as the ratchet.

This skill is the orchestrator. It stays in the main session and dispatches
subagents; it does NOT implement anything itself.

**Iron Laws:**
- **NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST** (inside every loop).
- **NEVER ON MAIN.** All work happens on a feature branch (or worktree for parallel slices).
- **DO NOT TRUST THE IMPLEMENTER'S REPORT.** Every slice gets an independent spec review that reads the actual code.

## Per-Slice Loop

For each ticket in `docs/tickets/`, in dependency order:

1. **Prepare** — read the ticket fully. Create/checkout the feature branch. Read `.afk/config.json` for the test/lint/typecheck commands. Record `git rev-parse HEAD` as the **slice-start sha** — the reviewer scopes its diff to it.
2. **Dispatch the implementer** — spawn the plugin's `implementer` agent. Its dispatch prompt must contain: the FULL ticket text (paste it verbatim), the check commands, the branch name, and any context the ticket doesn't say (decisions from earlier slices, gotchas from `.afk/brain/`, answers to previous NEEDS_CONTEXT questions). Never make the subagent go find its own context.
3. **Handle the report** — the implementer ends with a status:
   - `DONE` → proceed to review.
   - `NEEDS_CONTEXT` → answer its questions (read code/PRD yourself if needed), re-dispatch.
   - `BLOCKED` → do not push through. Surface to the user if it's a requirements problem; fix the environment if it's an environment problem.
4. **Dispatch the spec reviewer** — spawn the plugin's `spec-reviewer` agent with the ticket text, the implementer's report, the slice-start sha, and the check commands. It reads THIS slice's diff (`{slice-start}..HEAD`, not the whole branch) and verifies every checkbox, every acceptance criterion, and that tests are real (assert behavior, not `expect(true)`).
5. **Fix loop** — reviewer found issues → re-dispatch the implementer with the issue list. Re-review. Repeat until clean (cap at 3 rounds, then escalate to the user).
6. **Gate** — run test + typecheck + lint yourself. All green → mark the ticket's boxes, commit if the implementer hasn't, move to the next slice.

**Parallel slices:** only when slices share no files and no dependency edges.
Use one git worktree per slice, dispatch implementers concurrently, merge in
ticket order. When in doubt, run sequentially — a merge conflict between two
agents costs more than the parallelism saves.

## Progress Tracking

The tickets ARE the state. Checked boxes = done. If the session dies, the next
session reads `docs/tickets/`, sees which boxes are unchecked, and resumes.
Never hold progress only in conversation memory.

## Red Flags

| Thought | Reality |
|---------|---------|
| "I'll implement this slice myself, dispatching is overhead" | Your context is full of orchestration. Fresh context per slice is the entire point. |
| "The implementer says DONE, next slice" | Implementers overreport. The spec reviewer reads the code. Always. |
| "The test won't pass, I'll have the implementer skip it" | A skipped test is a shipped bug with a paper trail. Fix or BLOCKED. |
| "Three slices in parallel will be 3x faster" | Only if they're truly disjoint. Shared files = merge hell. Check first. |
| "Small fix, no need for red-green-refactor this time" | The loop's discipline is what makes AFK safe. No exceptions inside the pipeline. |

## Integration

- Input: tickets from **afk:slice**, commands from `.afk/config.json` (**afk:setup**).
- Subagents: the plugin's `implementer` and `spec-reviewer` agents (TDD iron laws, attempt caps, and report formats are baked into their definitions — the dispatch prompt only carries the slice-specific context).
- Next: **afk:refactor-pass** on the completed branch — do NOT skip it.
- Called by **afk:pipeline** as phase 3.
