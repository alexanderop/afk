<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// batch decomposes a plan into non-overlapping units, then runs one worktree
// worker per unit in parallel — each opening its own PR.
const scene: Scene = {
  width: 920,
  height: 380,
  groups: [
    { x: 410, y: 20, w: 490, h: 340, label: 'parallel worktrees — one PR each' },
  ],
  nodes: [
    { id: 'plan', x: 20, y: 170, w: 140, h: 46, shape: 'pill', label: 'plan / spec' },
    { id: 'fallback', x: 190, y: 50, w: 170, h: 50, shape: 'round', fontSize: 13, label: '→ afk:implement' },
    { id: 'decompose', x: 190, y: 164, w: 170, h: 60, shape: 'round', accent: true, label: 'decompose', sub: 'independent units' },
    { id: 'u1', x: 430, y: 50, w: 180, h: 50, shape: 'round', fontSize: 13, label: 'unit 1 worker' },
    { id: 'u2', x: 430, y: 128, w: 180, h: 50, shape: 'round', fontSize: 13, label: 'unit 2 worker' },
    { id: 'u3', x: 430, y: 206, w: 180, h: 50, shape: 'round', fontSize: 13, label: 'unit 3 worker' },
    { id: 'u4', x: 430, y: 284, w: 180, h: 50, shape: 'round', fontSize: 13, label: 'unit 4 worker' },
    { id: 'pr1', x: 660, y: 50, w: 160, h: 50, shape: 'round', accent: true, label: 'PR' },
    { id: 'pr2', x: 660, y: 128, w: 160, h: 50, shape: 'round', accent: true, label: 'PR' },
    { id: 'pr3', x: 660, y: 206, w: 160, h: 50, shape: 'round', accent: true, label: 'PR' },
    { id: 'pr4', x: 660, y: 284, w: 160, h: 50, shape: 'round', accent: true, label: 'PR' },
  ],
  edges: [
    { from: 'plan', to: 'decompose' },
    { from: 'decompose', to: 'fallback', fromSide: 'top', toSide: 'bottom', dashed: true, label: 'no clean split' },
    { from: 'decompose', to: 'u1', fromSide: 'right', toSide: 'left' },
    { from: 'decompose', to: 'u2', fromSide: 'right', toSide: 'left' },
    { from: 'decompose', to: 'u3', fromSide: 'right', toSide: 'left' },
    { from: 'decompose', to: 'u4', fromSide: 'right', toSide: 'left' },
    { from: 'u1', to: 'pr1', fromSide: 'right', toSide: 'left' },
    { from: 'u2', to: 'pr2', fromSide: 'right', toSide: 'left' },
    { from: 'u3', to: 'pr3', fromSide: 'right', toSide: 'left' },
    { from: 'u4', to: 'pr4', fromSide: 'right', toSide: 'left' },
  ],
}
</script>

# Batch

Invoke as `/afk:batch`. Use it when a plan splits into 5–30 units that are each independently mergeable as their own PR: a codebase-wide migration, rename, dependency bump, or the same pattern change repeated across many files.

<RoughDiagram :scene="scene" caption="batch decomposes the plan into non-overlapping units, then runs one worktree worker per unit in parallel — each committing, pushing, and opening its own PR." />

## What it does

Batch is the parallel, PR-per-unit alternative to `afk:implement`. It decomposes the work into non-overlapping independent units, presents the decomposition for user approval, then spawns one background worker per unit in its own git worktree. Each worker implements, runs tests, optionally runs `afk:simplify` on substantial diffs, commits, pushes, and opens a PR, reporting back a single `PR: <url>` line.

- Units must be independently mergeable (no shared interface still being designed) and non-overlapping (no two units touch the same file).
- If a clean independent split is not possible, Batch stops and routes to the `afk:implement` freeze-then-fan-out recipe instead.
- Workers run concurrently; the lead tracks progress in a live status table and triages any failures.

**Output artifact:** a status table of all units, and a final summary: `Batch: N/total units as PRs`, list of PR URLs, and any failed/blocked units.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/batch/SKILL.md)
