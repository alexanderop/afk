# Batch

Invoke as `/afk:batch`. Use it when a plan splits into 5–30 units that are each independently mergeable as their own PR: a codebase-wide migration, rename, dependency bump, or the same pattern change repeated across many files.

## What it does

Batch is the parallel, PR-per-unit alternative to `afk:implement`. It decomposes the work into non-overlapping independent units, presents the decomposition for user approval, then spawns one background worker per unit in its own git worktree. Each worker implements, runs tests, optionally runs `afk:simplify` on substantial diffs, commits, pushes, and opens a PR, reporting back a single `PR: <url>` line.

- Units must be independently mergeable (no shared interface still being designed) and non-overlapping (no two units touch the same file).
- If a clean independent split is not possible, Batch stops and routes to the `afk:implement` freeze-then-fan-out recipe instead.
- Workers run concurrently; the lead tracks progress in a live status table and triages any failures.

**Output artifact:** a status table of all units, and a final summary: `Batch: N/total units as PRs`, list of PR URLs, and any failed/blocked units.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/batch/SKILL.md)
