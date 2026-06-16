# Reflect

Invoke as `/afk:reflect`. Use it when wrapping up a session, after a correction, or when significant codebase knowledge was gained — to persist learnings where they will actually change future behavior.

## What it does

Reflect scans the current conversation for mistakes and corrections, user preferences, codebase knowledge (architecture, gotchas, patterns), tool/library quirks, decisions and their rationale, and friction in skill execution. Each learning is routed to the right destination rather than defaulting everything to the brain.

- **Structural check first:** if a learning can be encoded as a lint rule, script, or metadata flag, it goes there — not the brain.
- **Brain (`brain/`)** gets durable codebase knowledge, principles, and gotchas that would inform a future session.
- **Skill files** get learnings about how a specific skill's process, prompts, or edge cases should change.
- **Backlog** gets follow-up work that cannot be done during reflection.

Anything trivial or already captured is skipped. `brain/index.md` is rebuilt automatically by the PostToolUse hook.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/reflect/SKILL.md)
