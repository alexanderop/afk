<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// ship is the orchestrator: it drives each step in sequence (dashed = drives),
// the steps chain left to right to a verdict, then reflect persists learnings.
const scene: Scene = {
  width: 940,
  height: 320,
  nodes: [
    { id: 'ship', x: 390, y: 20, w: 160, h: 58, shape: 'round', accent: true, label: 'afk:ship', sub: 'orchestrator' },
    { id: 'grill', x: 40, y: 150, w: 120, h: 56, shape: 'round', label: 'grill' },
    { id: 'implement', x: 180, y: 150, w: 120, h: 56, shape: 'round', fontSize: 13, label: 'implement' },
    { id: 'simplify', x: 320, y: 150, w: 120, h: 56, shape: 'round', fontSize: 13, label: 'simplify' },
    { id: 'review', x: 460, y: 138, w: 120, h: 80, shape: 'diamond', label: 'review' },
    { id: 'qa', x: 600, y: 150, w: 120, h: 56, shape: 'round', label: 'qa' },
    { id: 'verdict', x: 760, y: 150, w: 160, h: 56, shape: 'pill', fontSize: 13, label: 'SHIP verdict' },
    { id: 'reflect', x: 760, y: 244, w: 160, h: 54, shape: 'round', accent: true, fontSize: 13, label: 'reflect → brain' },
  ],
  edges: [
    { from: 'ship', to: 'grill', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'ship', to: 'implement', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'ship', to: 'simplify', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'ship', to: 'review', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'ship', to: 'qa', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'grill', to: 'implement', fromSide: 'right', toSide: 'left' },
    { from: 'implement', to: 'simplify', fromSide: 'right', toSide: 'left' },
    { from: 'simplify', to: 'review', fromSide: 'right', toSide: 'left' },
    { from: 'review', to: 'qa', fromSide: 'right', toSide: 'left' },
    { from: 'qa', to: 'verdict', fromSide: 'right', toSide: 'left' },
    { from: 'verdict', to: 'reflect', fromSide: 'bottom', toSide: 'top', dashed: true, label: 'persist' },
  ],
}
</script>

# Ship

Invoke as `/afk:ship`. Use it when you want to run the full AFK flow (from idea or plan through to a verified, evidence-backed verdict), or to resume a partly completed AFK workflow.

<RoughDiagram :scene="scene" caption="ship orchestrates each step in sequence — grill → implement → simplify → review → qa → verdict — then reflects durable learnings into the brain." />

## What it does

Ship is an orchestrator. It inspects the current repo state, chooses the planning route, then drives `afk:grill` (if needed), `afk:implement`, `afk:simplify`, `afk:review`, and `afk:qa` in sequence without replacing any of their detailed instructions. After QA it calls `afk:reflect` to persist durable learnings into `brain/`.

- If a plan path is supplied or one clearly matches the work, Ship skips grill and proceeds to implementation.
- Simplify and review are skipped only for tiny, mechanical, or documentation-only changes; the reason is always stated.
- QA must produce a `qa/<slug>.md` report with a `SHIP`, `DO NOT SHIP`, or `SHIP WITH CAVEATS` verdict for any behavior-bearing change.

**Output artifact:** `qa/<slug>.md` with the final verdict, plus a summary covering Route, Plan, Changed, Verification, Review, QA, and Memory fields.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/ship/SKILL.md)
