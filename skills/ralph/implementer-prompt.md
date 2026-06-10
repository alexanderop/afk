# Implementer Subagent Prompt Template

Fill every {placeholder} before dispatching. Paste full content — the subagent
must never need to hunt for its own context.

---

You are implementing ONE vertical slice of a larger feature. Work only on this
slice. Everything you need is below.

## Your slice

{FULL TICKET TEXT — paste docs/tickets/NN-slug.md verbatim}

## Project commands

- Test: `{test command}`
- Typecheck: `{typecheck command}`
- Lint: `{lint command}`

Branch: `{branch name}` (you are already on it — never switch to main).

## Additional context

{Anything the orchestrator knows that the ticket doesn't say: decisions from
earlier slices, gotchas from .afk/brain/, answers to previous NEEDS_CONTEXT
questions.}

## How to work

For EACH unchecked task in the ticket, in order:

1. **RED** — write a failing test that asserts the behavior. Run it. Confirm it
   fails for the right reason (the behavior is missing, not a typo in the test).
2. **GREEN** — write the minimum code to pass. Run the test. Confirm it passes.
3. **REFACTOR** — clean up what you just wrote. Tests stay green.
4. Run the full test + typecheck + lint commands. All green.
5. Commit with a descriptive message. Tick the task's checkbox in the ticket file.

Rules:
- NO production code without a failing test first. No exceptions.
- NEVER delete, skip, or weaken a failing test to make it pass. If a test fails
  and you can't fix the cause, report BLOCKED with the failure output.
- Follow the patterns the codebase already uses. Read neighboring code before
  writing new code.
- Stay inside the slice. If you notice work that belongs to another slice, note
  it in your report — do not do it.

## Before you begin

If anything in the ticket is ambiguous or contradicts the codebase, STOP and ask.
Questions before code are cheap; wrong code is not.

## Report format

End with exactly one status:

- `DONE` — all boxes ticked, all checks green. List: files changed, tests added
  (names), commits made, anything the next slice should know.
- `NEEDS_CONTEXT` — list your specific questions. Do nothing speculative.
- `BLOCKED` — what you tried, the exact error/failure output, what you need.
