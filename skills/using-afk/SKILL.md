---
name: using-afk
description: The ticket-sizing gate and skill router. Injected automatically at session start by the plugin's SessionStart hook — never invoked by the model. In harnesses where plugin hooks don't fire (e.g. Copilot CLI), the user loads it once per session via the slash-command picker; afk:setup also embeds the sizing gate in CLAUDE.md as a backstop.
disable-model-invocation: true
---

# Using AFK

## Overview

AFK coding means: human judgment at the edges, agent execution in the middle.
You align on the spec, the agents ship it, you review the PR.

The single most important decision happens BEFORE any code: **how big is this task?**
Most AI coding failures are sizing failures — a 5-point ticket pasted into one chat
overflows context, skips tests, and never refactors.

## The Ticket-Sizing Gate

Before implementing ANY feature or fix, classify it:

| Size | Signals | What to do |
|------|---------|------------|
| **Small (1–3 points)** | One concern, few files, clear requirements, you can hold the whole change in your head | Just do it in this session. TDD still applies. No pipeline ceremony. |
| **Big (5+ points)** | Frontend + backend, multi-step flows, several API calls, vague requirements, "wizard", "dashboard", "system" | STOP. Do not implement. Route to `afk:pipeline` (or `afk:spec` if no spec exists). |
| **Unclear** | User gave one sentence for something that smells big | Ask one sizing question, or start `afk:spec` in interview mode. |

**Iron Law: NO BIG TICKET GETS IMPLEMENTED IN A SINGLE PASS.**
Big tickets get a spec, vertical slices, fresh-context implementation loops,
a refactor pass, QA, and review. That is what the pipeline skills are for.

## Skill Router

| Situation | Skill |
|-----------|-------|
| New project, or agents keep making the same mistakes here | `afk:setup` — backpressure audit (tests, lint, types, commands) |
| Big/vague feature request, no written spec | `afk:spec` — interview-mode PRD |
| Spec exists, needs to become tickets | `afk:slice` — vertical slice tickets |
| Tickets exist, time to implement | `afk:ralph` — fresh-subagent TDD loop per slice |
| Implementation done, code is messy | `afk:refactor-pass` — the step that always gets skipped |
| Feature works in tests, unverified in browser | `afk:qa` — agent-browser walkthrough + report |
| Branch ready for human eyes | `afk:review` — risk-tiered multi-agent review |
| "Build this whole thing for me" with a spec | `afk:pipeline` — runs all of the above end to end |
| After a pipeline run or notable session | `afk:reflect` — capture learnings into .afk/brain/ |

If there is even a 1% chance one of these applies, invoke it via the Skill tool
BEFORE responding or writing code.

**In Copilot CLI:** use the `skill` tool — skills are auto-discovered from
installed plugins and it works the same as Claude Code's Skill tool. afk skills
use Claude Code tool names; see `references/copilot-tools.md` for the
platform equivalents (subagent dispatch via `task`, etc.).

## Red Flags — STOP if you think any of these

| Thought | Reality |
|---------|---------|
| "I'll just paste the whole ticket in and start coding" | Context fills halfway through. The refactor never happens. Size it first. |
| "This 5-pointer is basically a few small tasks, I can do it in one go" | That IS the pipeline — you're just doing it without the safety rails. |
| "The user is in a hurry, skip the spec" | A flawed spec cascades into hundreds of bad lines. 30 minutes of spec is the cheapest part. |
| "Tests are failing, I'll delete/skip the test" | A deleted test is a silently shipped bug. Fix the bug or report BLOCKED. |
| "No need for the refactor pass, the code looks fine" | LLM code appends, never restructures. The pass exists because 'looks fine' is how hoarder garages start. |
| "Tests pass, so the feature works" | Tests prove units work, not that a user can finish the flow. That's what `afk:qa` is for. |
| "I'll run the loop on the main branch, it's faster" | Implementation loops run in worktrees/branches. Never on main. |

## Backpressure Check

The pipeline only works when wrongness is loud: failing tests, type errors, lint
errors. If the project has no one-command test/lint/typecheck, run `afk:setup`
FIRST. An agent without backpressure can't tell when it's wrong — and neither
can you, from the beach.
