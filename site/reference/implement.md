<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// implement triages first: simple changes run inline; anything needing a test
// goes orchestrator → parallel TDD workers → integration.
const scene: Scene = {
  width: 1000,
  height: 320,
  groups: [
    { x: 625, y: 86, w: 190, h: 196, label: 'workers · parallel' },
  ],
  nodes: [
    { id: 'change', x: 20, y: 142, w: 130, h: 46, shape: 'pill', label: 'code change' },
    { id: 'triage', x: 180, y: 122, w: 140, h: 86, shape: 'diamond', label: 'needs a test?' },
    { id: 'simple', x: 380, y: 26, w: 180, h: 54, shape: 'round', fontSize: 13, label: 'main conversation', sub: 'docs · config · 1-liner' },
    { id: 'orch', x: 430, y: 140, w: 160, h: 64, shape: 'round', accent: true, label: 'orchestrator', sub: 'architecture + slices' },
    { id: 'w1', x: 640, y: 100, w: 160, h: 44, shape: 'round', accent: true, fontSize: 13, label: 'TDD slice' },
    { id: 'w2', x: 640, y: 156, w: 160, h: 44, shape: 'round', accent: true, fontSize: 13, label: 'TDD slice' },
    { id: 'w3', x: 640, y: 212, w: 160, h: 44, shape: 'round', accent: true, fontSize: 13, label: 'TDD slice' },
    { id: 'integrate', x: 850, y: 140, w: 150, h: 64, shape: 'round', accent: true, label: 'integrate', sub: 'diff + full suite' },
  ],
  edges: [
    { from: 'change', to: 'triage' },
    { from: 'triage', to: 'simple', fromSide: 'top', toSide: 'bottom', label: 'simple' },
    { from: 'triage', to: 'orch', fromSide: 'right', toSide: 'left', label: 'needs test' },
    { from: 'orch', to: 'w1', fromSide: 'right', toSide: 'left' },
    { from: 'orch', to: 'w2', fromSide: 'right', toSide: 'left' },
    { from: 'orch', to: 'w3', fromSide: 'right', toSide: 'left' },
    { from: 'w1', to: 'integrate', fromSide: 'right', toSide: 'left' },
    { from: 'w2', to: 'integrate', fromSide: 'right', toSide: 'left' },
    { from: 'w3', to: 'integrate', fromSide: 'right', toSide: 'left' },
  ],
}
</script>

# Implement

Invoke as `/afk:implement`. Load this skill before any repo-changing work: editing code, fixing bugs, building features, wiring integrations, or executing a plan from `afk:grill` or `afk:plan`.

<RoughDiagram :scene="scene" caption="Triage first — simple changes run inline; anything needing a test goes orchestrator → parallel TDD workers → integration." />

## What it does

Implement triages complexity first, then routes accordingly. Simple test-free changes (docs, config, copy, a one-liner) run in the main conversation. Everything else, meaning any change that needs a test, goes through lead-orchestrated slices: a read-only `implement-orchestrator` decides architecture, contracts, slice boundaries, and sequencing, then bounded `implementation-worker` agents run local TDD slices (write failing test → implement smallest passing change → refactor → report evidence).

- The lead does not research or design before delegating; that is the orchestrator's job.
- Independent slices run in parallel; dependent slices run sequentially. Two workers never edit the same file concurrently.
- After workers complete, the main conversation reads the actual diff, runs the full test suite, and verifies integration.

When everything is green, the natural next step is `afk:simplify`.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/implement/SKILL.md)
