<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { renderScene, type Scene, type Palette } from './rough/render'

const props = defineProps<{ scene: Scene; caption?: string }>()

const { isDark } = useData()
const svgRef = ref<SVGSVGElement | null>(null)

const FONT = "'Kalam', 'Comic Sans MS', cursive"

function palette(dark: boolean): Palette {
  return dark
    ? {
        stroke: '#cbb8f5',
        accentStroke: '#a78bfa',
        accentFill: 'rgba(124, 58, 237, 0.22)',
        groupStroke: '#5b4a8a',
        groupFill: 'rgba(124, 58, 237, 0.07)',
        text: '#ede9fe',
        subText: '#b9a9e0',
        edgeLabelBg: '#1b1b1f',
      }
    : {
        stroke: '#7c3aed',
        accentStroke: '#7c3aed',
        accentFill: '#ede9fe',
        groupStroke: '#b9a3ee',
        groupFill: 'rgba(124, 58, 237, 0.05)',
        text: '#1e1b4b',
        subText: '#6d5bb0',
        edgeLabelBg: '#ffffff',
      }
}

function paint() {
  if (svgRef.value) renderScene(svgRef.value, props.scene, palette(isDark.value), FONT)
}

onMounted(paint)
watch(isDark, paint)
watch(() => props.scene, paint, { deep: true })
</script>

<template>
  <figure class="rough-diagram">
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${scene.width} ${scene.height}`"
      :style="{ aspectRatio: `${scene.width} / ${scene.height}` }"
      role="img"
      :aria-label="caption"
      preserveAspectRatio="xMidYMid meet"
    />
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.rough-diagram {
  margin: 1.75rem 0;
}

.rough-diagram svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.rough-diagram figcaption {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  font-family: 'Kalam', cursive;
}
</style>
