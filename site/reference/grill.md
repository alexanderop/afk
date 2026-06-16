<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// grill reads grounding sources, runs a one-question-at-a-time interview, and
// writes a decided plan. Sources feed in from the top; idea in, plan out.
const scene: Scene = {
  width: 720,
  height: 240,
  nodes: [
    { id: 'sources', x: 235, y: 20, w: 250, h: 58, shape: 'cylinder', accent: true, fontSize: 12, label: 'CONTEXT · ADRs · brain · live docs' },
    { id: 'idea', x: 20, y: 132, w: 150, h: 46, shape: 'pill', label: 'vague idea' },
    { id: 'grill', x: 255, y: 124, w: 170, h: 62, shape: 'round', accent: true, label: 'grill', sub: 'one question at a time' },
    { id: 'plan', x: 505, y: 122, w: 195, h: 66, shape: 'round', accent: true, fontSize: 13, label: 'brain/plans/<slug>', sub: 'decisions · contracts' },
  ],
  edges: [
    { from: 'idea', to: 'grill' },
    { from: 'sources', to: 'grill', fromSide: 'bottom', toSide: 'top', label: 'reads' },
    { from: 'grill', to: 'plan', label: 'writes' },
  ],
}
</script>

# Grill

Invoke as `/afk:grill`. Use it when you have a vague feature idea, a non-trivial change with unresolved product intent, or when you want to stress-test a plan before implementation starts.

<RoughDiagram :scene="scene" caption="Grill reads the grounding sources, then asks only what they can't answer — one decision at a time — until the plan is settled." />

## What it does

Grill runs a structured planning interview, asking one decision at a time, but only questions the repo, docs, ADRs, or fetched primary sources cannot answer. It opens with a product-owner framing (Background) before asking anything, then works through glossary terms, edge cases, failure modes, and contracts until the decision tree is settled. It fetches live documentation for any libraries or APIs involved rather than relying on training data.

- Reads `brain/context.md`, ADRs in `brain/decisions/`, the brain's principles, and relevant source files before asking.
- Challenges glossary conflicts and proposes canonical terms for overloaded domain words.
- Updates `brain/context.md` immediately when terms are resolved; offers ADRs only for hard-to-reverse trade-off decisions.

**Output artifact:** `brain/plans/<slug>.md` (the vault is created lazily if absent). The plan holds decisions, contracts, wave-sequenced tasks, and an optional `## Acceptance` bar for experience-bearing work. This plan is the direct input to `afk:implement` or `afk:batch`.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/grill/SKILL.md)
