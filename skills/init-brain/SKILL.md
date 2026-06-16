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
   bash "${CLAUDE_PLUGIN_ROOT}/skills/init-brain/scripts/init-brain.sh"
   ```

   It creates, only if missing:
   - `brain/` — the vault root (an Obsidian vault)
   - `brain/index.md` — the index the SessionStart hook injects
   - `brain/principles.md` + `brain/principles/` — the principles the flow reads
     before acting (starts empty; grown by `afk:reflect` and `afk:meditate`)
   - `brain/context.md` — the domain glossary `afk:grill` grows as terms resolve
   - `brain/decisions/` + `brain/decisions/index.md` — ADRs `afk:grill` records
     for hard-to-reverse, trade-off-driven decisions
   - `brain/plans/` + `brain/plans/index.md` — where `afk:grill` and the `plan`
     skill write plans
   - `brain/sources.md` + `brain/sources/<name>.md` — **only when the project
     already has a doc site** (VitePress, VuePress, Docusaurus, Astro Starlight,
     Nextra, MkDocs, Sphinx). The script seeds one stub note per detected site
     so the brain *points at* the docs rather than absorbing them. The team
     keeps their docs where they are — nothing in the repo moves.

2. **Refine the seeded source stubs.** If the script printed a "Detected doc
   sites" report, open each detected docs root (its landing page / sidebar
   config), and in that site's `brain/sources/<name>.md` replace the
   `Scope: _TODO …_` line with a real one-line scope of what those docs cover
   (e.g. "Public SDK API reference and guides", "Deployment runbooks"). Keep the
   "authoritative — don't duplicate into the brain" line. Skip any stub whose
   docs you can't read; leave its TODO for next time.

3. Report the vault path to the user. The PostToolUse hook keeps
   `brain/index.md` in sync — including the `## Sources` section — as files are
   added or removed from then on.

## Stop and Ask

STOP and ask the user only if the project root is ambiguous (e.g. a monorepo
where the vault could belong to more than one package). Otherwise just run.

## Output

A scaffolded `brain/` vault. Report the created paths (or "already present"),
the vault root location, and — if any doc sites were detected — which ones were
registered under `brain/sources/` and which still need a Scope line.

## References

- [scripts/init-brain.sh](./scripts/init-brain.sh) — the idempotent scaffold
  script; run it, don't reimplement it.
