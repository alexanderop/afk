# AFK Skill Writing Guide

Use this guide when creating or revising AFK skills. The goal is not to make
every skill sound identical; it is to make every skill easy for an agent to
discover, load, follow, and verify under pressure.

This format is inspired by `obra/superpowers` and adapted to AFK's own voice:
concise, operational, and strict where skipping a step would break the
workflow.

## Core Rules

- A skill is reusable process documentation, not a story about how one task was
  solved.
- `SKILL.md` is the always-loaded body. Keep it tight; move long examples,
  prompts, reference docs, and scripts into sibling files.
- Write for the future agent deciding whether to load the skill. Use concrete
  triggers, symptoms, file types, commands, and workflow names.
- Prefer pointers over copies. If another skill or file owns a detail, link to
  it instead of repeating it.
- Use bright-line wording only for behavior that must not be skipped. `MUST`,
  `STOP`, `Never`, and `No exceptions` should protect important invariants,
  not decorate normal advice.

## Frontmatter

Every skill starts with YAML frontmatter:

```markdown
---
name: skill-name
description: Use when [specific trigger, symptom, or user request]
---
```

Rules:

- `name:` must match the directory name exactly.
- `description:` should start with `Use when`.
- Describe only when to use the skill. Do not summarize the workflow.
- Keep the description under 1024 characters; under 500 is better.
- Use third-person trigger language because descriptions are injected into
  agent context.

Good:

```yaml
description: Use when executing a written implementation plan or when the user asks to implement a completed AFK plan
```

Bad:

```yaml
description: Implements plans by reading files, dispatching subagents, reviewing diffs, running tests, and suggesting QA
```

Why: workflow summaries create shortcuts. An agent may follow the description
instead of reading the full skill.

## Recommended Shape

Use this order unless the skill is a pure reference:

1. `# Skill Name`
2. A short overview or core principle.
3. `## When to Use` when triggers need more detail than frontmatter.
4. `## Process` with ordered steps.
5. `## Stop and Ask` for blockers, ambiguity, or unsafe assumptions.
6. `## Red Flags` for common rationalizations and failure modes.
7. `## Output` for the exact final response or artifact shape.
8. `## References` only when supporting files or related skills matter.

Keep sections behavior-level. Avoid inventories of every file unless the file
path is part of the contract.

## Wording Patterns

Use direct imperatives for required actions:

- `Read the actual diff before accepting a subagent report.`
- `STOP if the plan leaves shared interfaces undecided.`
- `Do not invent progress when the expected artifact is missing.`

Make vague advice concrete:

- Replace `be careful with tests` with `Run the plan's verification command
  before reporting completion`.
- Replace `ask clarifying questions` with `Ask only for product intent,
  preferences, credentials, or ambiguous source-of-truth decisions`.
- Replace `keep it concise` with `List only the skills relevant to the current
  state unless the user asks for the full catalog`.

Use red-flag tables when they prevent predictable mistakes:

```markdown
| Thought | Reality |
|---------|---------|
| "The subagent can decide the approach" | Then the lead has delegated architecture. Decide first, brief second. |
```

## Discoverability

Agents find skills through names and descriptions first, then body text. Include
the words a future agent or user is likely to use:

- User phrases: `implement the plan`, `what now`, `verify this`, `goal`.
- Symptoms: `vague`, `blocked`, `missing plan`, `unexpected behavior`.
- Artifacts: `docs/plans/`, `CONTEXT.md`, `qa/`, `git diff`.
- Commands or tools when they are central to the skill.

Prefer verb-first or action-oriented names: `write-good-goal`,
`requesting-code-review`, `systematic-debugging`.

## What Goes in Supporting Files

Split out detail when it would make `SKILL.md` harder to scan:

- Prompt templates longer than a short paragraph.
- Reference formats and examples.
- Scripts, command wrappers, or reusable checklists.
- Background material that only some runs need.

Keep the main skill responsible for routing: say when to open the support file
and what to do with it.

## Mechanical Checks

The lint harness enforces structural rules:

- Frontmatter opens on line 1 and closes.
- `name:` matches the skill directory.
- `description:` exists and stays within the character budget.
- `SKILL.md` stays under 500 lines.
- Internal references from skills resolve.

Do not turn every writing preference into lint. Use lint for mechanical facts;
use this guide for judgment calls like tone, trigger quality, and stop
conditions.
