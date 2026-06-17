<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// implement triages first: simple changes run inline; anything needing a test
// goes orchestrator → parallel TDD workers → integration.
const scene: Scene = {
  width: 1000,
  height: 330,
  groups: [
    { x: 628, y: 96, w: 196, h: 202, label: 'workers · parallel' },
  ],
  nodes: [
    { id: 'change', x: 20, y: 187, w: 134, h: 48, shape: 'pill', label: 'code change' },
    { id: 'triage', x: 176, y: 163, w: 168, h: 96, shape: 'diamond', label: 'needs a test?' },
    { id: 'simple', x: 384, y: 24, w: 196, h: 60, shape: 'round', fontSize: 15, label: 'main conversation', sub: 'docs · config · 1-liner' },
    { id: 'orch', x: 432, y: 178, w: 168, h: 66, shape: 'round', accent: true, label: 'orchestrator', sub: 'architecture + slices' },
    { id: 'w1', x: 644, y: 130, w: 164, h: 46, shape: 'round', accent: true, fontSize: 15, label: 'TDD slice' },
    { id: 'w2', x: 644, y: 188, w: 164, h: 46, shape: 'round', accent: true, fontSize: 15, label: 'TDD slice' },
    { id: 'w3', x: 644, y: 246, w: 164, h: 46, shape: 'round', accent: true, fontSize: 15, label: 'TDD slice' },
    { id: 'integrate', x: 848, y: 178, w: 152, h: 66, shape: 'round', accent: true, label: 'integrate', sub: 'diff + full suite' },
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
- Each slice is a **vertical tracer bullet**: one behavior with its test *and* its implementation owned by one worker. The orchestrator never splits a tests-only slice from an implementation-only slice (no horizontal slicing), and sequences the thinnest end-to-end path first as a tracer bullet.
- Every worker test must clear a **test-quality bar**: verify observable behavior through the public interface; mock only at system boundaries (external APIs, database, time, randomness), never internal collaborators; and never assert on call counts/order or verify through a side channel. The reviewer rejects green-but-implementation-coupled tests.
- Independent slices run in parallel; dependent slices run sequentially. Two workers never edit the same file concurrently.
- After workers complete, the main conversation reads the actual diff, runs the full test suite, and verifies integration.

When everything is green, the natural next step is `afk:simplify`.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/implement/SKILL.md)
