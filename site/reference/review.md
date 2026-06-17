<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// review reads principles, works six ordered sections, emits numbered
// severity-rated findings, and returns a verdict. It never applies fixes.
const scene: Scene = {
  width: 880,
  height: 300,
  nodes: [
    { id: 'input', x: 20, y: 50, w: 150, h: 46, shape: 'pill', fontSize: 14, label: 'diff / PR / plan' },
    { id: 'brain', x: 20, y: 168, w: 150, h: 58, shape: 'cylinder', accent: true, label: 'principles' },
    { id: 'review', x: 230, y: 100, w: 180, h: 74, shape: 'round', accent: true, fontSize: 14, label: 'review', sub: '6 ordered sections' },
    { id: 'findings', x: 480, y: 102, w: 170, h: 70, shape: 'round', fontSize: 14, label: 'numbered findings', sub: 'severity-rated' },
    { id: 'verdict', x: 710, y: 100, w: 150, h: 74, shape: 'round', fontSize: 14, label: 'Accept /', sub: 'Notes / Revise' },
  ],
  edges: [
    { from: 'input', to: 'review' },
    { from: 'brain', to: 'review', label: 'reads' },
    { from: 'review', to: 'findings', fromSide: 'right', toSide: 'left' },
    { from: 'findings', to: 'verdict', fromSide: 'right', toSide: 'left' },
  ],
}
</script>

# Review

Invoke as `/afk:review`. Use it when you want a principle-grounded read on code changes, a PR, or a plan, producing numbered findings and a verdict without making any changes.

<RoughDiagram :scene="scene" caption="review reads principles, works six ordered sections (scope, architecture, quality, tests, performance, principles), emits numbered findings, and returns a verdict." />

## What it does

Review reads the brain's principles fresh, determines the scope of the change (small: read directly; big: delegates to exploration subagents), then works through six assessment sections in order: scope check (files changed outside the phase's stated scope), architecture, code quality, tests, performance, and principle compliance. Every finding is numbered, severity-rated (high / medium / low), mapped to a principle, and offered with 2–3 lettered options so the user can act on it.

- Verdict is **Accept**, **Accept with notes** (low-severity issues only), or **Revise** (high-severity issues present).
- Review only diagnoses; it never applies fixes. For cleanup use `afk:simplify`; for behavior changes use `afk:implement`.
- `afk:ship` runs review after simplify so it judges the cleaned-up diff before QA.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/review/SKILL.md)
