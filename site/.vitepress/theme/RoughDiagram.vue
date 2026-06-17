<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { renderScene, type Scene, type Palette } from './rough/render'

const props = defineProps<{ scene: Scene; caption?: string }>()

const { isDark } = useData()
const svgRef = ref<SVGSVGElement | null>(null)
const modalSvgRef = ref<SVGSVGElement | null>(null)
const isOpen = ref(false)

const FONT = "'Excalifont', 'Comic Sans MS', cursive"

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
  if (isOpen.value && modalSvgRef.value)
    renderScene(modalSvgRef.value, props.scene, palette(isDark.value), FONT)
}

function openModal() {
  if (isOpen.value) return
  isOpen.value = true
  if (typeof document !== 'undefined') document.body.style.overflow = 'hidden'
  nextTick(paint)
}

function closeModal() {
  if (!isOpen.value) return
  isOpen.value = false
  if (typeof document !== 'undefined') document.body.style.overflow = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") closeModal()
}

onMounted(() => {
  paint()
  // Excalifont loads async; repaint once it's ready so SVG text uses the real
  // hand-drawn glyphs instead of the fallback's metrics on first paint.
  if (typeof document !== 'undefined' && 'fonts' in document) {
    document.fonts.ready.then(paint)
  }
  if (typeof window !== 'undefined') window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})

watch(isDark, paint)
watch(() => props.scene, paint, { deep: true })
</script>

<template>
  <figure class="rough-diagram">
    <button
      type="button"
      class="rough-diagram__trigger"
      :aria-label="caption ? `${caption} — click to view full screen` : 'View diagram full screen'"
      @click="openModal"
    >
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${scene.width} ${scene.height}`"
        :style="{ aspectRatio: `${scene.width} / ${scene.height}` }"
        role="img"
        :aria-label="caption"
        preserveAspectRatio="xMidYMid meet"
      />
      <span class="rough-diagram__hint" aria-hidden="true">⤢ full screen</span>
    </button>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>

  <Teleport to="body">
    <div
      v-if="isOpen"
      class="rough-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="caption || 'Diagram'"
      @click.self="closeModal"
    >
      <button type="button" class="rough-modal__close" aria-label="Close full screen" @click="closeModal">
        ✕
      </button>
      <figure class="rough-modal__figure" @click.self="closeModal">
        <svg
          ref="modalSvgRef"
          :viewBox="`0 0 ${scene.width} ${scene.height}`"
          role="img"
          :aria-label="caption"
          preserveAspectRatio="xMidYMid meet"
        />
        <figcaption v-if="caption">{{ caption }}</figcaption>
      </figure>
    </div>
  </Teleport>
</template>

<style scoped>
.rough-diagram {
  margin: 1.75rem 0;
}

.rough-diagram__trigger {
  display: block;
  position: relative;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
  border-radius: 8px;
}

.rough-diagram__trigger:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
}

.rough-diagram svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.rough-diagram__hint {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  font-family: 'Excalifont', cursive;
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.rough-diagram__trigger:hover .rough-diagram__hint,
.rough-diagram__trigger:focus-visible .rough-diagram__hint {
  opacity: 1;
}

.rough-diagram figcaption {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  font-family: 'Excalifont', cursive;
}

.rough-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 4vw, 3rem);
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(3px);
}

.rough-modal__figure {
  margin: 0;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--vp-c-bg);
  border-radius: 12px;
  padding: clamp(1rem, 3vw, 2rem);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
  overflow: auto;
}

.rough-modal__figure svg {
  width: 100%;
  max-height: 78vh;
  height: auto;
  display: block;
  overflow: visible;
}

.rough-modal__figure figcaption {
  text-align: center;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  font-family: 'Excalifont', cursive;
}

.rough-modal__close {
  position: absolute;
  top: clamp(0.75rem, 2vw, 1.5rem);
  right: clamp(0.75rem, 2vw, 1.5rem);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  cursor: pointer;
}

.rough-modal__close:hover {
  background: var(--vp-c-bg-mute);
}

.rough-modal__close:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
