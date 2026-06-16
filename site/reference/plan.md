# Plan

Invoke as `/afk:plan`. Use it to break a medium-to-large task into phased, principle-grounded plans written to `brain/plans/` — new features, multi-file refactors, or architectural changes. Plan never implements; the plan is the deliverable.

## What it does

Plan reads the brain's principles fresh, resolves scope and constraints with the user, delegates large-scale codebase exploration to subagents, checks for installed domain skills, then writes plan files under `brain/plans/`. Plans use small phases (one function/type + tests, or one bug fix per phase; 1–2 files max), ordered with shared types and infrastructure first and features after.

- For 3+ phases, creates a directory: `brain/plans/NN-slug/overview.md` + phase files.
- Overview files include: Context, Scope, Constraints, Applicable skills, Phases (ordered wikilinks), and Verification commands.
- Phase files include: back-link, Goal, Changes, Data structures (one-line sketch), and Verification (static + runtime).
- Applies a redesign-from-first-principles check for changes to existing code, and sketches 2–3 architectural alternatives for major decisions.

**Output artifact:** plan files under `brain/plans/` and an updated `brain/plans/index.md`. Hand off to `afk:implement` for execution.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/plan/SKILL.md)
