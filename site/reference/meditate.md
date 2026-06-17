<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// meditate snapshots brain + skills, audits for low-value notes, and — when
// enough surfaces — distills principles and prunes, writing changes back.
const scene: Scene = {
  width: 900,
  height: 360,
  nodes: [
    { id: 'brain', x: 20, y: 50, w: 160, h: 58, shape: 'cylinder', accent: true, fontSize: 13, label: 'brain/ snapshot' },
    { id: 'skills', x: 20, y: 200, w: 160, h: 58, shape: 'cylinder', accent: true, fontSize: 13, label: 'skills/ snapshot' },
    { id: 'auditor', x: 230, y: 120, w: 160, h: 64, shape: 'round', accent: true, label: 'auditor', sub: 'staleness · orphans' },
    { id: 'gate', x: 440, y: 112, w: 140, h: 84, shape: 'diamond', label: '≥3 items?' },
    { id: 'skip', x: 440, y: 240, w: 140, h: 44, shape: 'pill', fontSize: 13, label: 'skip review' },
    { id: 'reviewer', x: 630, y: 120, w: 170, h: 64, shape: 'round', accent: true, label: 'reviewer', sub: 'distill · prune' },
  ],
  edges: [
    { from: 'brain', to: 'auditor', fromSide: 'right', toSide: 'left' },
    { from: 'skills', to: 'auditor', fromSide: 'right', toSide: 'left' },
    { from: 'auditor', to: 'gate', fromSide: 'right', toSide: 'left' },
    { from: 'gate', to: 'reviewer', fromSide: 'right', toSide: 'left', label: 'yes' },
    { from: 'gate', to: 'skip', fromSide: 'bottom', toSide: 'top', dashed: true, label: '< 3' },
    {
      from: 'reviewer', to: 'brain', fromSide: 'bottom', toSide: 'left',
      via: [{ x: 715, y: 330 }, { x: 8, y: 330 }, { x: 8, y: 79 }],
      label: 'apply changes', labelAt: { x: 360, y: 330 },
    },
  ],
}
</script>

# Meditate

Invoke as `/afk:meditate`. Use it to audit and evolve the brain vault: pruning stale or low-value notes, surfacing unstated cross-cutting principles, and checking skills against the brain's principles.

<RoughDiagram :scene="scene" caption="meditate snapshots the brain and skills, audits for low-value notes, and — when enough surfaces — distills principles and prunes, writing changes back." />

## What it does

Meditate builds snapshots of the `brain/` directory and the `skills/` directory, then runs two subagents. The **auditor** checks notes for staleness, redundancy, low-value content, verbosity, and orphans. If it finds fewer than 3 actionable items, the reviewer step is skipped. The **reviewer** handles synthesis (missing wikilinks, principle tensions), distillation (recurring patterns revealing unstated principles, which must be independent, evidenced by 2+ notes, and actionable), and skill review (contradictions between skills and brain principles, missed structural enforcement).

- The quality bar to keep a note: high-signal (Claude would get it wrong without it), high-frequency (comes up in most sessions), or high-impact (getting it wrong causes real damage).
- Everything below that bar is pruned. A lean, precise brain outperforms a comprehensive but bloated one.
- Changes are applied directly; the user reviews the diff. `brain/index.md` is rebuilt by the hook.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/meditate/SKILL.md)
