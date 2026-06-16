# Meditate

Invoke as `/afk:meditate`. Use it to audit and evolve the brain vault — pruning stale or low-value notes, surfacing unstated cross-cutting principles, and checking skills against the brain's principles.

## What it does

Meditate builds snapshots of the `brain/` directory and the `skills/` directory, then runs two subagents. The **auditor** checks notes for staleness, redundancy, low-value content, verbosity, and orphans — if it finds fewer than 3 actionable items, the reviewer step is skipped. The **reviewer** handles synthesis (missing wikilinks, principle tensions), distillation (recurring patterns revealing unstated principles — must be independent, evidenced by 2+ notes, and actionable), and skill review (contradictions between skills and brain principles, missed structural enforcement).

- The quality bar to keep a note: high-signal (Claude would get it wrong without it), high-frequency (comes up in most sessions), or high-impact (getting it wrong causes real damage).
- Everything below that bar is pruned. A lean, precise brain outperforms a comprehensive but bloated one.
- Changes are applied directly; the user reviews the diff. `brain/index.md` is rebuilt by the hook.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/meditate/SKILL.md)
