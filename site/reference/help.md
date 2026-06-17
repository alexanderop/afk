<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// help reads the project's observed state, then routes to exactly one next step
// with a paste-ready invocation.
const scene: Scene = {
  width: 840,
  height: 360,
  groups: [
    { x: 20, y: 20, w: 210, h: 320, label: 'observed state' },
  ],
  nodes: [
    { id: 'brain', x: 40, y: 52, w: 170, h: 46, shape: 'round', fontSize: 14, label: 'brain/ ?' },
    { id: 'plans', x: 40, y: 110, w: 170, h: 46, shape: 'round', fontSize: 14, label: 'brain/plans' },
    { id: 'diff', x: 40, y: 168, w: 170, h: 46, shape: 'round', fontSize: 14, label: 'git status' },
    { id: 'qa', x: 40, y: 226, w: 170, h: 46, shape: 'round', fontSize: 14, label: 'qa reports' },
    { id: 'catalog', x: 40, y: 284, w: 170, h: 46, shape: 'round', fontSize: 14, label: 'skill catalog' },
    { id: 'router', x: 310, y: 150, w: 180, h: 70, shape: 'round', accent: true, label: 'help', sub: 'classify intent' },
    { id: 'next', x: 560, y: 150, w: 250, h: 70, shape: 'round', accent: true, fontSize: 14, label: 'one next step', sub: 'skill + paste-ready cmd' },
  ],
  edges: [
    { from: 'brain', to: 'router', fromSide: 'right', toSide: 'left' },
    { from: 'plans', to: 'router', fromSide: 'right', toSide: 'left' },
    { from: 'diff', to: 'router', fromSide: 'right', toSide: 'left' },
    { from: 'qa', to: 'router', fromSide: 'right', toSide: 'left' },
    { from: 'catalog', to: 'router', fromSide: 'right', toSide: 'left' },
    { from: 'router', to: 'next', fromSide: 'right', toSide: 'left' },
  ],
}
</script>

# Help

Invoke as `/afk:help`. Use it when you need workflow orientation, want to know which AFK skill to use next, or need an explanation of AFK itself.

<RoughDiagram :scene="scene" caption="help reads the project's observed state and routes you to exactly one next step, with a paste-ready invocation." />

## What it does

Help reads the project's observed state (whether a `brain/` vault exists, what plans are present, what diffs exist, what QA reports are available) and routes you to exactly one next step. For fresh projects (no `brain/`), it leads with the eval-first onboarding path: write a failing eval with `afk:write-evals`, then implement against it. For returning users, it classifies your intent (orientation, specific skill question, lifecycle request) and names the skill to run, plus an invocation you can paste directly.

- Reads `brain/` (including `brain/plans/`), `qa/`, `git status`, and a built-in catalog to ground its answer.
- Returns: **Where you are**, **Next step** (with invocation), **Why**, **Expected output**.
- Offers to run the recommended skill immediately if one next step is clearly right.
- Lists only relevant skills unless you ask to see everything.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/help/SKILL.md)
