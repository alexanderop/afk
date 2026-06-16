# Ruminate

Invoke as `/afk:ruminate`. Use it to mine past Claude Code conversation history for patterns, corrections, and knowledge that `reflect` missed and that were never written into the brain.

## What it does

Ruminate reads the existing brain for context, locates past conversation files in `~/.claude/projects/`, extracts them into batches, and spawns one read-only analysis agent per batch in parallel. Each agent extracts: user corrections, recurring preferences, technical learnings, workflow patterns, and skills the user wished for. The lead synthesizes across batches, deduplicates, filters by frequency and impact, then presents findings for user approval before writing anything.

- Filters hard: recurring patterns beat one-off incidents; 3 high-signal findings beat 9 noisy ones.
- Proposes changes in a table (finding, frequency/evidence, proposed action). The user decides what to apply.
- Skill-specific learnings are routed into the relevant SKILL.md, and brain updates follow the `afk:brain` writing conventions.
- The temporary extraction directory is removed after use.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/ruminate/SKILL.md)
