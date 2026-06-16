<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// init-brain runs an idempotent scaffold that creates the brain/ skeleton only
// where missing, and seeds source stubs from a detected doc site.
const scene: Scene = {
  width: 880,
  height: 320,
  groups: [
    { x: 430, y: 20, w: 430, h: 280, label: 'brain/ (created only if missing)' },
  ],
  nodes: [
    { id: 'project', x: 20, y: 140, w: 140, h: 46, shape: 'pill', label: 'project root' },
    { id: 'scaffold', x: 190, y: 136, w: 170, h: 62, shape: 'round', accent: true, fontSize: 13, label: 'scaffold', sub: 'never overwrites' },
    { id: 'index', x: 450, y: 52, w: 180, h: 46, shape: 'round', accent: true, fontSize: 13, label: 'index.md' },
    { id: 'principles', x: 450, y: 108, w: 180, h: 46, shape: 'round', fontSize: 13, label: 'principles.md' },
    { id: 'plans', x: 650, y: 52, w: 190, h: 46, shape: 'round', fontSize: 13, label: 'plans/' },
    { id: 'prindir', x: 650, y: 108, w: 190, h: 46, shape: 'round', fontSize: 12, label: 'principles/' },
    { id: 'sources', x: 450, y: 180, w: 390, h: 56, shape: 'round', fontSize: 12, label: 'sources/<name>.md', sub: 'if doc site detected' },
  ],
  edges: [
    { from: 'project', to: 'scaffold' },
    { from: 'scaffold', to: 'index', fromSide: 'right', toSide: 'left', label: 'creates' },
    { from: 'scaffold', to: 'sources', fromSide: 'right', toSide: 'left', label: 'detects docs' },
  ],
}
</script>

# Init Brain

Invoke as `/afk:init-brain`. Use it to scaffold a `brain/` vault in a project for the first time, so the hooks and memory skills have somewhere to read and write.

<RoughDiagram :scene="scene" caption="init-brain runs an idempotent scaffold that creates the brain/ skeleton only where missing, and seeds source stubs from any detected doc site." />

## What it does

Init Brain runs an idempotent scaffold script that creates the `brain/` directory structure if it is missing, never overwriting existing content. After scaffolding, it refines any auto-detected doc site stubs by replacing placeholder scope lines with real one-line descriptions of what those docs cover.

- Creates (only if missing): `brain/`, `brain/index.md`, `brain/principles.md`, `brain/principles/`, `brain/plans/`, and `brain/plans/index.md`.
- If the project already has a doc site (VitePress, Docusaurus, MkDocs, etc.), also seeds `brain/sources/<name>.md` stubs pointing at those docs rather than copying their content.
- The vault is also created lazily by `afk:reflect` and `afk:brain` on demand; `init-brain` is the explicit up-front path.

**Output artifact:** a scaffolded `brain/` vault at the project root. The PostToolUse hook keeps `brain/index.md` in sync from that point on.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/init-brain/SKILL.md)
