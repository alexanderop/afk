<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// simplify fans the diff out to four independent cleanup angles in parallel,
// then the lead dedupes and applies only behavior-preserving fixes.
const scene: Scene = {
  width: 820,
  height: 360,
  groups: [
    { x: 200, y: 20, w: 300, h: 320, label: '4 parallel angles' },
  ],
  nodes: [
    { id: 'diff', x: 20, y: 150, w: 150, h: 46, shape: 'pill', label: 'the diff' },
    { id: 'reuse', x: 220, y: 52, w: 260, h: 52, shape: 'round', fontSize: 14, label: 'reuse' },
    { id: 'simpl', x: 220, y: 124, w: 260, h: 52, shape: 'round', fontSize: 14, label: 'simplification' },
    { id: 'eff', x: 220, y: 196, w: 260, h: 52, shape: 'round', fontSize: 14, label: 'efficiency' },
    { id: 'alt', x: 220, y: 268, w: 260, h: 52, shape: 'round', fontSize: 14, label: 'altitude' },
    { id: 'lead', x: 560, y: 148, w: 200, h: 64, shape: 'round', accent: true, fontSize: 13, label: 'lead', sub: 'dedupe → apply safe fixes' },
  ],
  edges: [
    { from: 'diff', to: 'reuse', fromSide: 'right', toSide: 'left' },
    { from: 'diff', to: 'simpl', fromSide: 'right', toSide: 'left' },
    { from: 'diff', to: 'eff', fromSide: 'right', toSide: 'left' },
    { from: 'diff', to: 'alt', fromSide: 'right', toSide: 'left' },
    { from: 'reuse', to: 'lead', fromSide: 'right', toSide: 'left' },
    { from: 'simpl', to: 'lead', fromSide: 'right', toSide: 'left' },
    { from: 'eff', to: 'lead', fromSide: 'right', toSide: 'left' },
    { from: 'alt', to: 'lead', fromSide: 'right', toSide: 'left' },
  ],
}
</script>

# Simplify

Invoke as `/afk:simplify`. Use it after `afk:implement` lands, or when you want changed code cleaned up, deduplicated, or made DRY without hunting for bugs.

<RoughDiagram :scene="scene" caption="Four cleanup angles run in parallel over the diff; the lead dedupes their findings and applies only the fixes that preserve behavior." />

## What it does

Simplify reviews the current diff (or a supplied PR, branch, or file path) from four independent cleanup angles, run in parallel by four subagents: **reuse** (flags new code that reimplements something already in the codebase), **simplification** (flags redundant state, copy-paste, deep nesting, dead code), **efficiency** (flags wasted computation, repeated I/O, sequential independent operations, long-lived closures), and **altitude** (flags fixes that are fragile bandaids instead of generalizations of the underlying mechanism).

- Agents return findings; the lead deduplicates, then applies only fixes that preserve intended behavior.
- Findings whose fix would change behavior, require edits outside the reviewed diff, or are false positives are skipped and noted.
- This is not a correctness review: bugs and out-of-scope changes are explicitly out of scope.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/simplify/SKILL.md)
