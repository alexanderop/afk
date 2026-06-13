---
name: implement
description: Implement a plan through bounded orchestration — the lead owns architecture and contracts, then delegates independent TDD slices to subagents, agent teams, or dynamic workflows. Use after afk:grill produced a plan, or when the user says "implement the plan" or hands you a worked-out design to build.
---

# Implement

You are the lead architect. You own cross-slice decisions: boundaries,
interfaces, file ownership, data flow, error handling, and integration order.
Workers may run local TDD inside the slice you assign them, but they must not
change the architecture or renegotiate shared contracts.

The economics: your context and reasoning are expensive — spend them on
reading code, deciding contracts, and reviewing diffs. Local TDD loops and
keystrokes are cheap — delegate them to sonnet/haiku via the Agent tool
(`Task` in older Claude Code configs). For larger fan-out, use an agent team
or a dynamic workflow; do not rely on subagents spawning subagents.

## Step 1: Plan (you, no subagents)

1. Read the plan — `docs/plans/<slug>.md` from **afk:grill** if it exists,
   otherwise whatever the user gave you.
2. Read every file the change will touch and the neighbours they integrate
   with. You cannot brief what you have not read.
3. Decide everything contestable NOW: file layout, names, function signatures,
   types, error handling, which existing helpers to reuse. If two tasks share
   a boundary, write the interface down before splitting them.
4. Cut the work into slices. A good slice has fixed boundaries and contracts:
   "implement X behind this interface, with these behaviours and tests" —
   never "figure out the architecture…". If you can't write the brief without
   hedging on shared design, the thinking isn't done; go back to the code.

## Step 2: Dispatch via Agent, teams, or workflows

Subagents start with **zero context** — they haven't seen this conversation,
the plan, or your reasoning. Each brief must be self-contained:

- Exact file paths to create or edit, and which files to read first.
- The contract: signatures, types, expected behaviour, error cases.
- Code conventions to follow (point at a concrete existing file to mimic).
- The TDD loop to run: write failing tests, implement the smallest passing
  change, refactor locally, then report test evidence.
- The verify command (test/typecheck/lint) and the instruction to run it
  before reporting back.
- What NOT to do: no refactoring of neighbouring code, no new dependencies,
  no renaming beyond the brief.

Pick the model per task:

| Model | Use for |
|-------|---------|
| `haiku` | Truly mechanical: boilerplate, wiring, config, repetitive edits across files, tests from a given spec |
| `sonnet` | Multi-file features within a decided design, non-trivial logic with a clear contract, local TDD for one slice |

Dispatch **independent tasks in parallel** (multiple Agent/Task calls in one
message). Dependent tasks run sequentially — never let two subagents edit the
same file concurrently.

### Orchestration options

Use the smallest orchestration primitive that fits:

- **Plain subagents:** a few self-contained workers that report back to you.
  Best for focused tests, implementation slices, and review passes.
- **Agent teams:** several long-running peers that need a shared task list,
  direct communication, or plan approval before edits.
- **Dynamic workflows:** dozens to hundreds of repeatable agents coordinated
  by a script, useful for repo-wide audits, migrations, and cross-checked
  research.

Subagents cannot spawn subagents. If you want hierarchical work, keep the lead
as the orchestrator and chain subagents from the main conversation, create an
agent team, or ask Claude Code to write a dynamic workflow. The supported
shape is lead -> workers, not worker -> nested workers.

For implementation work, make every worker run local red-green-refactor:

- Write or update the failing test for its assigned behaviour.
- Implement the smallest passing change inside its file boundary.
- Refactor locally without changing the public contract.
- Run the slice verify command and report the TDD evidence: failing test
  observed, passing test observed, refactor verification.

Do **not** fan out work when tasks share unsettled interfaces, need
architectural choices, involve data migrations/security-sensitive logic, or a
mistake would be hard to see in diff review. In those cases, work in the main
conversation or require plan approval before edits.

## Step 3: Review every result (you)

A subagent's "done" report is a claim, not a fact. After each task:

1. Read the actual diff (`git diff`), not the summary.
2. Run the verify command yourself.
3. If it's wrong: re-dispatch **once** with the diff quoted and the specific
   correction. If it's wrong twice, the brief was the problem or the task was
   too hard for the tier — fix it yourself, in your context.

When all tasks land, run the full test suite and read the complete diff
end-to-end for integration seams the per-task reviews couldn't see.

## Red flags

| Thought | Reality |
|---------|---------|
| "The subagent can explore and decide the approach" | Then you've delegated the thinking. Decisions made in a haiku context are decisions made badly. Decide first, brief second. |
| "The brief is getting long, I'll just say 'follow the plan'" | The subagent has never seen the plan. Paste what it needs, verbatim. |
| "It reported success and tests pass" | Whose tests? Read the diff. Subagents delete failing tests, hardcode fixtures, and stub the hard part with a TODO. |
| "The parent subagent will spawn nested workers" | Claude Code subagents cannot spawn subagents. Chain from the lead, use an agent team, or use a dynamic workflow. |
| "This task is too hard for sonnet, I'll write a smarter prompt" | If it needs a smarter prompt, it needs a smarter model: do it yourself. |
| "I'll dispatch all ten tasks at once" | Tasks 4–10 depend on the interfaces 1–3 create. Parallelism only across genuinely independent files. |

When everything is green, suggest **afk:simplify** as the next step.
