<script setup>
const steps = [
  { name: 'grill', desc: 'plan interview' },
  { name: 'implement', desc: 'bounded TDD slices' },
  { name: 'simplify', desc: 'parallel cleanup pass' },
  { name: 'qa', desc: 'evidence verification' },
]
</script>

<template>
  <div class="flow-strip" aria-label="AFK coding flow: grill, implement, simplify, qa">
    <template v-for="(step, i) in steps" :key="step.name">
      <div class="flow-step">
        <span class="flow-step-name">{{ step.name }}</span>
        <span class="flow-step-desc">{{ step.desc }}</span>
      </div>
      <div v-if="i < steps.length - 1" class="flow-arrow" aria-hidden="true">›</div>
    </template>
  </div>
</template>

<style scoped>
.flow-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 120px;
  padding: 0.75rem 1.25rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 8px;
  text-align: center;
}

.flow-step-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono, monospace);
}

.flow-step-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-2, var(--vp-c-text-1));
  white-space: nowrap;
}

.flow-arrow {
  font-size: 1.5rem;
  font-weight: 300;
  color: var(--vp-c-brand-1);
  padding: 0 0.5rem;
  user-select: none;
  line-height: 1;
}

@media (max-width: 640px) {
  .flow-strip {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
    padding: 1rem;
  }

  .flow-step {
    min-width: unset;
    flex-direction: row;
    justify-content: flex-start;
    gap: 0.75rem;
    text-align: left;
  }

  .flow-step-name {
    min-width: 80px;
  }

  .flow-step-desc {
    white-space: normal;
  }

  .flow-arrow {
    text-align: center;
    transform: rotate(90deg);
    display: block;
    padding: 0;
    font-size: 1.25rem;
  }
}
</style>
