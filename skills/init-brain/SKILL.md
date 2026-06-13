---
name: init-brain
description: Use when setting up the brain/ vault in a project for the first time so the hooks and memory skills have somewhere to read and write; triggers include "init brain", "set up the brain", "create the brain vault".
---

# Init Brain

Scaffold an empty `brain/` vault (folder + `index.md`) in the current project.
Run this once before first use, or just let `afk:reflect` and `afk:brain` create
files on demand — the vault is also created lazily.

## When to Use

Use this skill when:

- A project has no `brain/` vault yet and the user wants to set it up up front.
- The user says "init brain", "set up the brain", or "create the brain vault".

Do not use this skill when a `brain/` vault already exists — the script is
idempotent, but there is nothing to do.

## Process

1. Run the scaffold script — it is idempotent and never overwrites existing
   content:

   ```bash
   sh "${CLAUDE_PLUGIN_ROOT}/skills/init-brain/scripts/init-brain.sh"
   ```

   It creates, only if missing:
   - `brain/` — the vault root (an Obsidian vault)
   - `brain/index.md` — the index the SessionStart hook injects
   - `brain/principles.md` + `brain/principles/` — the principles the flow reads
     before acting (starts empty; grown by `afk:reflect` and `afk:meditate`)
   - `brain/plans/` + `brain/plans/index.md` — where the `plan` skill writes

2. Report the vault path to the user. The PostToolUse hook keeps
   `brain/index.md` in sync as files are added or removed from then on.

## Stop and Ask

STOP and ask the user only if the project root is ambiguous (e.g. a monorepo
where the vault could belong to more than one package). Otherwise just run.

## Output

A scaffolded `brain/` vault. Report the created paths (or "already present") and
the vault root location.

## References

- [scripts/init-brain.sh](./scripts/init-brain.sh) — the idempotent scaffold
  script; run it, don't reimplement it.
