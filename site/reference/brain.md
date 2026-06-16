# Brain

Invoke as `/afk:brain`. Use it when a task needs to read or write the persistent `brain/` vault directly — adding a principle, recording a codebase gotcha, or grounding work in existing memory.

## What it does

Brain is the direct read/write interface to the project's persistent Obsidian vault at `brain/`. Before writing, it applies a durability test: "Would I include this in a prompt for a different task?" Only content that passes — durable knowledge such as principles, gotchas, and decisions — is written. Plan-specific notes belong in the plan's docs; skill process fixes go in the skill file directly.

- Reads `brain/index.md` and the relevant entrypoint before writing; prefers editing existing notes over creating new ones.
- One topic per file, lowercase hyphenated names, bullets over prose after the summary line.
- Every brain file must be reachable from `brain/index.md` (auto-rebuilt by the PostToolUse hook on writes — do not hand-edit it).
- Notes stay under ~50 lines; longer content is split into separate files with a linking index.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/brain/SKILL.md)
