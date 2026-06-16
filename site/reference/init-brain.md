# Init Brain

Invoke as `/afk:init-brain`. Use it to scaffold a `brain/` vault in a project for the first time, so the hooks and memory skills have somewhere to read and write.

## What it does

Init Brain runs an idempotent scaffold script that creates the `brain/` directory structure if it is missing — never overwriting existing content. After scaffolding, it refines any auto-detected doc site stubs by replacing placeholder scope lines with real one-line descriptions of what those docs cover.

- Creates (only if missing): `brain/`, `brain/index.md`, `brain/principles.md`, `brain/principles/`, `brain/plans/`, and `brain/plans/index.md`.
- If the project already has a doc site (VitePress, Docusaurus, MkDocs, etc.), also seeds `brain/sources/<name>.md` stubs pointing at those docs rather than copying their content.
- The vault is also created lazily by `afk:reflect` and `afk:brain` on demand; `init-brain` is the explicit up-front path.

**Output artifact:** a scaffolded `brain/` vault at the project root. The PostToolUse hook keeps `brain/index.md` in sync from that point on.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/init-brain/SKILL.md)
