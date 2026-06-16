# Implement

Invoke as `/afk:implement`. Load this skill before any repo-changing work: editing code, fixing bugs, building features, wiring integrations, or executing a plan from `afk:grill` or `afk:plan`.

## What it does

Implement triages complexity first, then routes accordingly. Simple test-free changes (docs, config, copy, a one-liner) run in the main conversation. Everything else, meaning any change that needs a test, goes through lead-orchestrated slices: a read-only `implement-orchestrator` decides architecture, contracts, slice boundaries, and sequencing, then bounded `implementation-worker` agents run local TDD slices (write failing test → implement smallest passing change → refactor → report evidence).

- The lead does not research or design before delegating; that is the orchestrator's job.
- Independent slices run in parallel; dependent slices run sequentially. Two workers never edit the same file concurrently.
- After workers complete, the main conversation reads the actual diff, runs the full test suite, and verifies integration.

When everything is green, the natural next step is `afk:simplify`.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/implement/SKILL.md)
