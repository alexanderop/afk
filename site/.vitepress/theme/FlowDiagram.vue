<script setup lang="ts">
import RoughDiagram from './RoughDiagram.vue'
import type { Scene } from './rough/render'

// The four-step AFK flow as a vertical hand-drawn spine. batch hangs off
// implement as the dashed fan-out alternative; the flow ends at the SHIP /
// NO-SHIP verdict (ship itself stops at local evidence).
const SX = 150 // spine left x
const SW = 200 // spine box width

const scene: Scene = {
  width: 660,
  height: 632,
  nodes: [
    { id: 'idea', x: SX, y: 24, w: SW, h: 44, label: 'unclear intent', shape: 'pill' },
    { id: 'grill', x: SX, y: 100, w: SW, label: 'grill', sub: 'plan interview', shape: 'round', accent: true },
    { id: 'implement', x: SX, y: 186, w: SW, label: 'implement', sub: 'bounded TDD slices', shape: 'round', accent: true },
    { id: 'simplify', x: SX, y: 272, w: SW, label: 'simplify', sub: 'parallel cleanup', shape: 'round', accent: true },
    { id: 'review', x: SX, y: 358, w: SW, h: 84, label: 'afk:review', sub: 'quality gate', shape: 'diamond' },
    { id: 'qa', x: SX, y: 474, w: SW, label: 'qa', sub: 'evidence verification', shape: 'round', accent: true },
    { id: 'verdict', x: SX, y: 560, w: SW, h: 48, label: 'SHIP / NO-SHIP', shape: 'pill' },
    { id: 'batch', x: 440, y: 186, w: 170, label: 'batch', sub: 'parallel PRs', shape: 'round' },
  ],
  edges: [
    { from: 'idea', to: 'grill' },
    { from: 'grill', to: 'implement' },
    { from: 'implement', to: 'simplify' },
    { from: 'simplify', to: 'review' },
    { from: 'review', to: 'qa' },
    { from: 'qa', to: 'verdict' },
    { from: 'implement', to: 'batch', fromSide: 'right', toSide: 'left', dashed: true, label: 'fan-out' },
  ],
}
</script>

<template>
  <RoughDiagram :scene="scene" caption="The AFK flow — grill → implement → simplify → qa, with batch as the parallel fan-out." />
</template>
