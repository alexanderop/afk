---
name: spec
description: Use when a feature request is big (5+ points) or vague and no written spec exists — interviews the user one question at a time, then writes a PRD that the rest of the pipeline can execute without the user present.
---

# Spec: Interview-Mode PRD

## Overview

Every downstream pipeline failure starts here. A flawed specification cascades
through hundreds of lines; flawed research generates thousands of bad lines.
The spec is the single artifact every later phase reads — skimp here and the
agents ship the wrong thing five times in parallel.

**You are the interviewer, not the generator.** The user holds the requirements;
your job is to extract them, including the ones they'd forget to mention.

**HARD GATE: do not write code, do not slice, do not start the pipeline until
the user approves the written PRD.**

## The Interview

Ask **one question at a time**. Multiple choice preferred — it's faster to answer
and surfaces options the user hadn't considered (in Claude Code, use the
AskUserQuestion tool). Adapt based on answers; skip questions the context
already answers.

Cover, in roughly this order:

1. **Goal** — what outcome, for whom? What does success look like?
2. **User & context** — who uses this, on what device, how often?
3. **Happy path** — walk through it step by step. Make the user narrate it.
4. **Edge cases** — what happens when data is missing, duplicated, slow, huge?
5. **Validation & error states** — what's invalid input? What does the user see when things fail?
6. **Data & integrations** — what exists already (APIs, tables, components)? What's new?
7. **Out of scope** — explicitly. The agents WILL build anything left ambiguous.
8. **Acceptance** — how will the user verify it's done? These become QA test cases.

Before asking, read the codebase for answers the code already gives (existing
patterns, existing endpoints, naming). Don't waste interview questions on things
you can grep.

If an answer belongs to someone who isn't in the chair — a PM, a designer, the
business — don't let the user guess on their behalf. Collect those into a
sendable list of open questions, let the user forward it, and park the PRD until
the answers come back. Guessed requirements are the most expensive kind.

## Write the PRD

Write to `docs/specs/prd-<slug>.md`:

```markdown
# PRD: <Feature name>

## Goal
## Users & context
## Happy path        (numbered steps)
## Edge cases        (each with expected behavior)
## Validation & error states
## Data & integrations  (existing vs. new, with file/endpoint references)
## Out of scope
## Acceptance criteria  (numbered, testable — afk:qa runs these verbatim)
## Open questions       (must be empty before pipeline starts)
```

Then **self-review**: read it as the implementer. Every "it depends" or "probably"
is an open question. Resolve them with the user. Present the PRD and get explicit
approval.

## Fast Lane (small specs only)

After the PRD is approved — never before — estimate its size with the
sizing-gate rubric: **small = ≤3 points, or it would cut into ≤2 slices**.
When in doubt or borderline, treat it as big. Big estimates get no fast-lane
offer; the next step stays **afk:slice**.

If small, present the lane choice (AskUserQuestion in Claude Code; plain-text
question in Copilot CLI, like the interview), with fast lane recommended:

- **Fast lane (recommended)** — implement the whole PRD in one go: no slicing,
  no per-slice implementer loops.
- **Full pipeline** — afk:slice + afk:ralph as usual.

If the user declines both, end as today: approved PRD on disk, next steps
named, nothing started.

On fast lane, present the context choice, with fresh chat recommended:

- **Fresh chat (recommended)** — print a copy-paste handoff prompt containing
  the PRD's real path (it's already written to `docs/specs/` — never a
  placeholder) plus the fast-lane rules below, so implementation starts on a
  clean context budget.
- **Stay in this chat** — dispatch **one** subagent to implement the entire
  PRD (Copilot CLI: the `task` tool, per using-afk's
  `references/copilot-tools.md`), so this conversation's context isn't burned
  on implementation detail.

Fast-lane rules — include them verbatim in the handoff prompt or subagent prompt:

- Work on a feature branch, never main — if on main, branch first. No worktree needed.
- TDD applies: test-first, red-green.
- Explore-style read-only subagents are fine for research; no slicing, no
  per-slice implementer dispatch.
- Done when the code and its tests are green. Then name **afk:qa** and
  **afk:review** as optional manual follow-ups — neither runs automatically.

## Red Flags

| Thought | Reality |
|---------|---------|
| "The Jira ticket is basically a spec" | A Jira description is a wish, not a spec. Interview anyway. |
| "I'll ask all 8 questions in one message" | One at a time. Walls of questions get one-line answers. |
| "I can fill in the edge cases myself" | Your invented edge cases are the ones the business doesn't care about — and you'll miss the ones they do. |
| "Out of scope is obvious" | Nothing is out of scope to an AFK agent unless it's written down. |
| "The user is impatient, skip to coding" | 30 minutes here is 80% of the value. Say so. |

## Integration

- Next: **afk:slice** turns the approved PRD into vertical slice tickets —
  unless the spec estimated small and the user picked the fast lane above.
- **afk:qa** executes the Acceptance criteria section verbatim — write them as testable steps.
- Called automatically by **afk:pipeline** when no spec exists.
