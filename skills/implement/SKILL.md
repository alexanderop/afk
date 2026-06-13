---
name: implement
description: Use when the agent is about to implement, edit code, execute a plan, fix a bug, build a feature, or make repo changes, especially when task complexity or orchestration needs are unclear.
---

# Implement

Load this skill before implementation starts. First decide whether the work is
simple enough to do directly or complex enough to justify orchestration.

Simple local changes belong in the main conversation. Complex work uses the
lead-orchestrated shape: you decide the architecture, contracts, boundaries,
file ownership, data flow, error handling, and integration order; workers run
bounded local TDD slices inside those decisions.

## When to Use

Use this skill before any repo-changing implementation work, including:

- Implementing a written plan or a plan from `afk:grill`.
- Editing code, tests, workflows, configuration, docs-as-product, or generated
  artifacts.
- Fixing bugs, building features, refactoring, or wiring integrations.

Do not wait until the task feels complicated. This skill is the gate before
touching files.

## Process

### 1. Triage Complexity

Before editing, classify the task.

Do the work directly when all of these are true:

- The change is small, localized, and easy to review end-to-end.
- It touches one or two files with no unsettled shared interface.
- The expected behavior and verification command are clear.
- A mistake would be obvious in the diff or test output.

Use lead-orchestrated slices when any of these are true:

- The work spans multiple files, modules, packages, workflows, or UI states.
- The task needs architecture decisions, contracts, sequencing, or integration
  planning.
- Independent slices can be assigned with fixed boundaries and verified
  separately.
- The task involves migrations, security-sensitive code, data flow, external
  APIs, complex tests, or risk that is hard to see in one diff.
- A plan from `afk:grill` exists or the user provides a worked-out design.

### 2. Direct Implementation

For simple work:

1. Read the target file and its immediate neighbors.
2. Make the smallest behavior-preserving or behavior-adding change that
   satisfies the request.
3. Run the narrowest meaningful verification command.
4. Read the diff before reporting completion.

Do not create fake slices, dispatch subagents, or write a heavyweight plan for
genuinely local work.

### 3. Orchestrated Implementation

For complex work, you are the lead architect. Your expensive context is for
reading code, deciding contracts, and reviewing diffs. Workers are for local
TDD loops and bounded edits.

Plan in the lead context before dispatching:

1. Read the plan, usually `docs/plans/<slug>.md` from `afk:grill`, or the
   plan/design the user provided.
2. Read every file the change will touch and the neighboring code it integrates
   with. You cannot brief what you have not read.
3. Decide everything contestable now: file layout, names, function signatures,
   types, error handling, existing helpers to reuse, shared boundaries, and
   integration order.
4. Cut the work into slices with fixed contracts: implement this behavior
   behind this interface, in these files, with these tests.

Never brief a worker to "figure out the architecture." If a slice brief needs
hedging on shared design, return to the code and decide the contract first.

### 4. Dispatch Workers

Use the smallest orchestration primitive that fits:

| Primitive | Use for |
|-----------|---------|
| Plain subagents | A few self-contained implementation, test, or review slices that report back to you |
| Agent teams | Several long-running peers that need a shared task list, direct communication, or plan approval before edits |
| Dynamic workflows | Dozens to hundreds of repeatable agents for repo-wide audits, migrations, or cross-checked research |

Subagents start with zero context. Each brief must include:

- Exact file paths to create or edit and files to read first.
- The contract: signatures, types, expected behavior, and error cases.
- Code conventions to follow, with a concrete existing file to mimic.
- The local TDD loop: write the failing test, implement the smallest passing
  change, refactor locally, and report evidence.
- The verification command to run before reporting back.
- Hard boundaries: no neighboring refactors, no new dependencies, no renames,
  and no work outside the brief unless explicitly allowed.

Pick the model by slice:

| Model | Use for |
|-------|---------|
| `haiku` | Mechanical boilerplate, wiring, config, repetitive edits, or tests from a given spec |
| `sonnet` | Multi-file features inside a decided design, non-trivial logic with a clear contract, or local TDD for one slice |

Dispatch independent tasks in parallel. Run dependent tasks sequentially. Never
let two workers edit the same file concurrently.

Subagents cannot spawn subagents. If work needs hierarchy, keep the lead as
the orchestrator and chain workers from the main conversation, create an agent
team, or ask Claude Code to write a dynamic workflow. The supported shape is
lead -> workers, not worker -> nested workers.

### 5. Require Local TDD Evidence

For implementation slices, every worker must run red-green-refactor inside its
boundary:

1. Write or update the failing test for the assigned behavior.
2. Implement the smallest passing change.
3. Refactor locally without changing the public contract.
4. Run the slice verification command.
5. Report evidence: failing test observed, passing test observed, and refactor
   verification.

### 6. Review Every Result

A worker's "done" report is a claim, not a fact.

After each worker returns:

1. Read the actual diff with `git diff`, not just the summary.
2. Run the verification command yourself.
3. If the result is wrong, re-dispatch once with the relevant diff and a
   specific correction.
4. If it is wrong twice, treat the brief or model choice as the problem and
   finish the fix in the lead context.

When all slices land, run the full relevant test suite and read the complete
diff end-to-end for integration issues that slice reviews could not see.

## Stop and Ask

STOP before dispatching workers when:

- Shared interfaces, ownership, or integration order are undecided.
- Two workers would need to edit the same file at the same time.
- The requested change depends on product intent, credentials, private data,
  or an external source of truth that is not available.
- The task is a migration, security-sensitive change, or destructive action
  and the safe boundary is unclear.

Ask only for the missing decision or permission. Otherwise, decide in the lead
context and keep moving.

## Red Flags

| Thought | Reality |
|---------|---------|
| "I'll start coding and load the skill if it gets complicated" | This skill is the gate before implementation. Triage first, then act. |
| "Any implementation task should use subagents" | Simple local work is faster and safer in the main conversation. Orchestrate only when complexity justifies it. |
| "The subagent can explore and decide the approach" | Then the lead has delegated architecture. Decide first, brief second. |
| "The brief is getting long, I'll just say 'follow the plan'" | The subagent has never seen the plan. Paste what it needs, verbatim. |
| "It reported success and tests pass" | Whose tests? Read the diff. Workers can delete failing tests, hardcode fixtures, or stub the hard part with a TODO. |
| "The parent subagent will spawn nested workers" | Claude Code subagents cannot spawn subagents. Chain from the lead, use an agent team, or use a dynamic workflow. |
| "This task is too hard for sonnet, I'll write a smarter prompt" | If it needs a smarter prompt, it needs a smarter model: do it yourself. |
| "I'll dispatch all tasks at once" | Parallelism only belongs across genuinely independent files and contracts. |

## Output

Final responses after implementation should include:

- Changed files.
- What changed and why.
- Verification commands and results.
- Any known gaps, follow-up risks, or blocked checks.

When everything is green, suggest `afk:simplify` as the next step.
