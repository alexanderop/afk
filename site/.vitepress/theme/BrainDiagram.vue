<script setup lang="ts">
import RoughDiagram from './RoughDiagram.vue'
import type { Scene } from './rough/render'

// How the flow reads from and writes back to the brain/ vault. Forward arrows
// (principles → grill/orch/qa → ship) read left-to-right; the reflect loop
// routes over the top and under the bottom so it never crosses the spine.
const scene: Scene = {
  width: 720,
  height: 400,
  groups: [
    { x: 24, y: 64, w: 188, h: 270, label: 'brain/ vault' },
  ],
  nodes: [
    { id: 'principles', x: 40, y: 92, w: 156, h: 58, label: 'principles', shape: 'cylinder', accent: true },
    { id: 'codebase', x: 40, y: 178, w: 156, h: 58, label: 'codebase gotchas', shape: 'cylinder', accent: true, fontSize: 13 },
    { id: 'plans', x: 40, y: 264, w: 156, h: 58, label: 'plans', shape: 'cylinder', accent: true },

    { id: 'grill', x: 312, y: 92, w: 150, h: 54, label: 'grill', shape: 'round', accent: true },
    { id: 'orch', x: 312, y: 174, w: 150, h: 60, label: 'implement', sub: 'orchestrator', shape: 'round', accent: true },
    { id: 'qa', x: 312, y: 268, w: 150, h: 54, label: 'qa', shape: 'round', accent: true },

    { id: 'ship', x: 556, y: 178, w: 138, h: 60, label: 'ship', shape: 'round', accent: true },
  ],
  edges: [
    // reads principles before acting
    { from: 'principles', to: 'grill', fromSide: 'right', toSide: 'left' },
    { from: 'principles', to: 'orch', fromSide: 'right', toSide: 'left', label: 'reads' },
    { from: 'principles', to: 'qa', fromSide: 'right', toSide: 'left' },
    // converge into ship
    { from: 'grill', to: 'ship', fromSide: 'right', toSide: 'left' },
    { from: 'orch', to: 'ship', fromSide: 'right', toSide: 'left' },
    { from: 'qa', to: 'ship', fromSide: 'right', toSide: 'left' },
    // reflect: write learnings back — routed around the spine
    {
      from: 'ship', to: 'principles', fromSide: 'top', toSide: 'top',
      via: [{ x: 625, y: 26 }, { x: 118, y: 26 }],
      label: 'reflect: write learnings', labelAt: { x: 372, y: 18 },
    },
    {
      from: 'ship', to: 'codebase', fromSide: 'bottom', toSide: 'bottom',
      via: [{ x: 625, y: 372 }, { x: 118, y: 372 }],
    },
  ],
}
</script>

<template>
  <RoughDiagram :scene="scene" caption="The flow reads the brain before acting and writes learnings back via reflect." />
</template>
