<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// map-codebase dispatches bounded read-only scouts, verifies their leads against
// the files itself, then writes a neutral, commit-pinned map to brain/codebase/.
const scene: Scene = {
  width: 880,
  height: 360,
  groups: [
    { x: 250, y: 20, w: 230, h: 320, label: 'read-only scouts' },
  ],
  nodes: [
    { id: 'area', x: 20, y: 150, w: 150, h: 56, shape: 'pill', fontSize: 14, label: 'one area' },
    { id: 'locator', x: 270, y: 44, w: 190, h: 46, shape: 'round', fontSize: 14, label: 'locator' },
    { id: 'analyzer', x: 270, y: 156, w: 190, h: 46, shape: 'round', fontSize: 14, label: 'analyzer' },
    { id: 'pattern', x: 270, y: 268, w: 190, h: 46, shape: 'round', fontSize: 14, label: 'pattern scout' },
    { id: 'verify', x: 520, y: 144, w: 170, h: 68, shape: 'round', accent: true, fontSize: 14, label: 'synthesize', sub: 'verify vs files' },
    { id: 'map', x: 730, y: 100, w: 130, h: 56, shape: 'cylinder', accent: true, fontSize: 13, label: 'brain/codebase/' },
    { id: 'pin', x: 730, y: 200, w: 130, h: 46, shape: 'round', fontSize: 13, label: 'commit pin' },
  ],
  edges: [
    { from: 'area', to: 'locator', fromSide: 'right', toSide: 'left' },
    { from: 'area', to: 'analyzer', fromSide: 'right', toSide: 'left' },
    { from: 'area', to: 'pattern', fromSide: 'right', toSide: 'left' },
    { from: 'locator', to: 'verify', fromSide: 'right', toSide: 'left' },
    { from: 'analyzer', to: 'verify', fromSide: 'right', toSide: 'left' },
    { from: 'pattern', to: 'verify', fromSide: 'right', toSide: 'left' },
    { from: 'verify', to: 'map', fromSide: 'right', toSide: 'left', label: 'writes' },
    { from: 'verify', to: 'pin', fromSide: 'right', toSide: 'left', dashed: true },
  ],
}
</script>

# Map Codebase

Invoke as `/afk:map-codebase`. Use it when you want a durable, reusable map of how an existing area of the codebase works as-is — "map the codebase", "document how auth is wired today", "survey this module" — persisted to `brain/codebase/` for future sessions.

<RoughDiagram :scene="scene" caption="map-codebase dispatches bounded read-only scouts, verifies their leads against the files itself, then writes a neutral, commit-pinned map to brain/codebase/." />

## What it does

Map Codebase turns a read of one existing area into a durable, prescription-free note at `brain/codebase/<area>.md`, pinned to the git commit it was read at. The invariant it protects is **document what IS, not what SHOULD BE**: it records where code lives, how it flows, and the gotchas it carries, but recommends nothing. That neutrality is the whole point — an opinionated map serves one task and rots, while a descriptive one is reusable by every future task.

- Grounds in the brain first, then dispatches bounded read-only scouts in parallel (the same pattern `grill` uses): a **locator** for where the area lives, an **analyzer** for how it flows, and a **pattern scout** for concrete conventions to mimic — each carrying the documentarian constraint verbatim.
- Synthesizes and **verifies the load-bearing claims against the actual files itself** before they enter the map; a scout report is a lead, not a fact.
- Captures a commit pin (`git rev-parse --short HEAD`, branch, covered paths) as the note's last line so a future reader can tell whether the map is stale.
- Writes one area per file (`# <Area>`, summary line, then `## Map`, `## How it works`, `## Patterns in use`, `## Gotchas observed`), deferring the write conventions to the [brain](/reference/brain) skill.

It is the internal counterpart to `research`, which writes `brain/sources/` for external prior art; map-codebase is internal-only (`brain/codebase/`). It is the **deliberate** producer of `brain/codebase/` notes — [reflect](/reference/reflect) maintains them opportunistically between mapping passes. Once written, `grill` and the [implement orchestrator](/reference/implement) read the map as observed ground before forming questions and contracts, scoping their own reading to the gaps and carrying its gotchas forward.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/map-codebase/SKILL.md)
