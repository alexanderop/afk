<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// plan reads principles, resolves scope, delegates exploration, then writes an
// ordered overview + phase files. It never implements.
const scene: Scene = {
  width: 780,
  height: 340,
  groups: [
    { x: 455, y: 20, w: 305, h: 300, label: 'brain/plans/NN-slug/' },
  ],
  nodes: [
    { id: 'task', x: 20, y: 50, w: 150, h: 46, shape: 'pill', label: 'medium/large task' },
    { id: 'brain', x: 20, y: 150, w: 150, h: 58, shape: 'cylinder', accent: true, fontSize: 14, label: 'brain principles' },
    { id: 'plan', x: 230, y: 92, w: 160, h: 62, shape: 'round', accent: true, label: 'plan', sub: 'phases, ordered' },
    { id: 'explore', x: 230, y: 230, w: 160, h: 54, shape: 'round', fontSize: 14, label: 'explore subagents' },
    { id: 'overview', x: 478, y: 52, w: 260, h: 48, shape: 'round', accent: true, fontSize: 14, label: 'overview.md' },
    { id: 'p1', x: 478, y: 120, w: 260, h: 44, shape: 'round', fontSize: 14, label: '01 · phase' },
    { id: 'p2', x: 478, y: 180, w: 260, h: 44, shape: 'round', fontSize: 14, label: '02 · phase' },
    { id: 'p3', x: 478, y: 240, w: 260, h: 44, shape: 'round', fontSize: 14, label: '03 · phase' },
  ],
  edges: [
    { from: 'task', to: 'plan' },
    { from: 'brain', to: 'plan', label: 'reads' },
    { from: 'plan', to: 'explore', fromSide: 'bottom', toSide: 'top', label: 'delegates' },
    { from: 'plan', to: 'overview', label: 'writes' },
    { from: 'overview', to: 'p1', fromSide: 'bottom', toSide: 'top' },
    { from: 'p1', to: 'p2', fromSide: 'bottom', toSide: 'top' },
    { from: 'p2', to: 'p3', fromSide: 'bottom', toSide: 'top' },
  ],
}
</script>

# Plan

Invoke as `/afk:plan`. Use it to break a medium-to-large task (new features, multi-file refactors, or architectural changes) into phased, principle-grounded plans written to `brain/plans/`. Plan never implements; the plan is the deliverable.

<RoughDiagram :scene="scene" caption="Plan reads principles fresh, resolves scope, delegates exploration, then writes an ordered overview plus phase files — ready for implement." />

## What it does

Plan reads the brain's principles fresh, resolves scope and constraints with the user, delegates large-scale codebase exploration to subagents, checks for installed domain skills, then writes plan files under `brain/plans/`. Plans use small phases (one function/type + tests, or one bug fix per phase; 1–2 files max), ordered with shared types and infrastructure first and features after.

- For 3+ phases, creates a directory: `brain/plans/NN-slug/overview.md` + phase files.
- Overview files include: Context, Scope, Constraints, Applicable skills, Phases (ordered wikilinks), and Verification commands.
- Phase files include: back-link, Goal, Changes, Data structures (one-line sketch), and Verification (static + runtime).
- Applies a redesign-from-first-principles check for changes to existing code, and sketches 2–3 architectural alternatives for major decisions.

**Output artifact:** plan files under `brain/plans/` and an updated `brain/plans/index.md`. Hand off to `afk:implement` for execution.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/plan/SKILL.md)
