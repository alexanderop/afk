# AFK Skill Writing Guide

Use this guide when creating or revising AFK skills. The goal is not to make
every skill sound identical; it is to make every skill easy for an agent to
discover, load, follow, and verify under pressure.

This format is inspired by `obra/superpowers` and adapted to AFK's own voice:
concise, operational, and strict where skipping a step would break the
workflow.

## The one principle: predictability

A skill exists to wrangle determinism out of a stochastic system. The thing you
are fixing is the *process* — the agent taking the same path every run — not the
output (a brainstorming skill should predictably diverge). Every rule below is a
lever on that one goal. When an edit is unclear, ask the deciding question: *does
this make the agent behave more predictably, or does it just look tidier?* Only
the first earns its place.

Two consequences worth internalising before you write a line:

- **Skill prose is executable.** A literal-minded machine will do exactly what
  the steps say. A wrong instruction is not a typo, it is a runtime defect — a
  worker told to verify in a mode that silently skips verification will ship
  broken work and report success. Read every step as if it will be obeyed to the
  letter, because it will.
- **The `description` is permanent rent.** It sits in the agent's context on
  every turn whether the skill fires or not. So the body earns ordinary pruning;
  the description earns *harder* pruning. Every word there must do invocation
  work.

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

For the full list of frontmatter fields (the optional `context: fork`, every
agent option, and which ones are ignored or unreliable in AFK's plugin context),
see [skills-and-agents-reference.md](./skills-and-agents-reference.md).

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

## Failure modes to hunt when revising

Most skill rot is one of a few named shapes. Learn to see them and you can hunt
them across a whole skill suite. Each has a cheap test.

- **No-op** — a line the model already obeys by default, so you pay context for
  nothing. Test: *does this change behaviour versus the default?* "Track progress
  step by step" or a bare "Be thorough" usually fails — the agent already does
  it. The fix is deletion, or a stronger, concrete bound — never a synonym.
- **Description restated in the body** — a `## When to Use` section that re-lists
  the frontmatter triggers adds no decision value once the skill has loaded.
  Keep `When to Use` for what the description *cannot* carry: the negative
  boundary (`Do not use this for…`) and cross-skill disambiguation. (The lint
  still requires the heading to exist — fill it with the boundary, do not delete
  it.)
- **Duplication** — the same meaning in more than one place. State an invariant
  once, at its natural risk point. If it is tempting to violate, add *one* Red
  Flag — and word that flag as the *rationalisation* ("it ran with no errors, so
  ship"), not a second copy of the rule. A Red Flag row that merely repeats a
  Process step is duplication; cut it.
- **Sediment** — stale lines that accumulate because adding feels safe and
  removing feels risky. Hand-copied inventories of a script's output are the
  classic case: they drift the moment the source changes. Point at the source of
  truth instead of transcribing it.
- **Sprawl** — a skill that is simply too long, even when every line is live.
  The cure is the hierarchy: push reference into sibling files behind a pointer,
  and split branch-specific material so each path carries only what it needs.
- **Premature completion** — ending a step before it is truly done. The defence
  is a *checkable* completion criterion ("every mined finding is promoted or
  dismissed with a reason"), not a vague one ("synthesis reached"). Sharpen the
  bound first; only hide later steps (by splitting) if a sharp bound still rushes.

Three judgement calls the tests do not settle for you:

- **Not all repetition is duplication.** Repeating a *meaning* is duplication;
  repeating a *token* on purpose to recruit attention is a technique. Several Red
  Flag rows that look alike but each name a *distinct* rationalisation converging
  on one wrong action are doing real work — keep them.
- **Co-locate what is used together.** Put a definition next to the step that
  consumes it. Reviewer angles defined in an aggregation step, away from the
  dispatch that needs them, read as a phantom second review and invite mistakes.
- **Know when not to optimise.** Do not risk a routing regression on the
  most-fired skill to save a few description tokens. The marginal token is rarely
  worth the variance.

## Leading words

A leading word is a compact concept already in the model's pretraining that the
agent can think *with* — *lesson*, *fog of war*, *tracer bullets*, *red/green*,
a *tight* loop. One token recruits a whole region of behaviour for free, where a
spelled-out triad ("fast, deterministic, low-overhead") spends three. Repeat the
*word*, never the sentence — that is the deliberate inverse of duplication. When
revising, hunt for restated phrases that collapse into one pretrained word: you
win fewer tokens *and* a sharper hook for the agent's reasoning. Coining your own
works only if you define it clearly; a made-up word recruits no priors, so reach
for an existing one first.

## Discoverability

Agents find skills through names and descriptions first, then body text. Include
the words a future agent or user is likely to use:

- User phrases: `implement the plan`, `what now`, `verify this`, `goal`.
- Symptoms: `vague`, `blocked`, `missing plan`, `unexpected behavior`.
- Artifacts: `brain/plans/`, `brain/context.md`, `qa/`, `git diff`.
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
