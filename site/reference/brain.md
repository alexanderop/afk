<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// brain applies a durability test before writing: only prompt-worthy knowledge
// becomes a one-topic note; the hook keeps index.md in sync.
const scene: Scene = {
  width: 820,
  height: 300,
  nodes: [
    { id: 'knowledge', x: 20, y: 120, w: 160, h: 46, shape: 'pill', fontSize: 13, label: 'candidate note' },
    { id: 'test', x: 230, y: 96, w: 180, h: 96, shape: 'diamond', fontSize: 13, label: 'prompt-worthy?' },
    { id: 'write', x: 500, y: 40, w: 200, h: 56, shape: 'cylinder', accent: true, fontSize: 13, label: 'brain/ note', sub: 'one topic / file' },
    { id: 'index', x: 500, y: 122, w: 200, h: 48, shape: 'round', fontSize: 12, label: 'index.md (auto)' },
    { id: 'discard', x: 500, y: 200, w: 200, h: 46, shape: 'pill', fontSize: 12, label: 'stays in plan / skill' },
  ],
  edges: [
    { from: 'knowledge', to: 'test' },
    { from: 'test', to: 'write', fromSide: 'right', toSide: 'left', label: 'yes' },
    { from: 'test', to: 'discard', fromSide: 'bottom', toSide: 'left', label: 'no' },
    { from: 'write', to: 'index', fromSide: 'bottom', toSide: 'top', dashed: true, label: 'hook rebuilds' },
  ],
}
</script>

# Brain

Invoke as `/afk:brain`. Use it when a task needs to read or write the persistent `brain/` vault directly: adding a principle, recording a codebase gotcha, or grounding work in existing memory.

<RoughDiagram :scene="scene" caption="brain applies a durability test before writing — durable notes become one-topic files, and the PostToolUse hook keeps index.md in sync." />

## What it does

Brain is the direct read/write interface to the project's persistent Obsidian vault at `brain/`. Before writing, it applies a durability test: "Would I include this in a prompt for a different task?" Only content that passes is written: durable knowledge such as principles, gotchas, and decisions. Plan-specific notes belong in the plan's docs; skill process fixes go in the skill file directly.

- Reads `brain/index.md` and the relevant entrypoint before writing; prefers editing existing notes over creating new ones.
- One topic per file, lowercase hyphenated names, bullets over prose after the summary line.
- Every brain file must be reachable from `brain/index.md` (auto-rebuilt by the PostToolUse hook on writes, so do not hand-edit it).
- Notes stay under ~50 lines; longer content is split into separate files with a linking index.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/brain/SKILL.md)
