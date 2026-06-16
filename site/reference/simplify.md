# Simplify

Invoke as `/afk:simplify`. Use it after `afk:implement` lands, or when you want changed code cleaned up, deduplicated, or made DRY without hunting for bugs.

## What it does

Simplify reviews the current diff (or a supplied PR, branch, or file path) from four independent cleanup angles, run in parallel by four subagents: **reuse** (flags new code that reimplements something already in the codebase), **simplification** (flags redundant state, copy-paste, deep nesting, dead code), **efficiency** (flags wasted computation, repeated I/O, sequential independent operations, long-lived closures), and **altitude** (flags fixes that are fragile bandaids instead of generalizations of the underlying mechanism).

- Agents return findings; the lead deduplicates, then applies only fixes that preserve intended behavior.
- Findings whose fix would change behavior, require edits outside the reviewed diff, or are false positives are skipped and noted.
- This is not a correctness review: bugs and out-of-scope changes are explicitly out of scope.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/simplify/SKILL.md)
