<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// prototype answers one question with throwaway code, routing to a terminal app
// (logic/state) or toggleable UI variants, then deletes or absorbs the winner.
const scene: Scene = {
  width: 880,
  height: 320,
  nodes: [
    { id: 'question', x: 20, y: 130, w: 160, h: 46, shape: 'pill', fontSize: 13, label: 'one question' },
    { id: 'route', x: 210, y: 108, w: 160, h: 92, shape: 'diamond', label: 'logic or UI?' },
    { id: 'term', x: 420, y: 38, w: 210, h: 58, shape: 'round', accent: true, fontSize: 13, label: 'terminal app', sub: 'over pure module' },
    { id: 'ui', x: 420, y: 200, w: 210, h: 58, shape: 'round', accent: true, fontSize: 13, label: 'UI variants', sub: '?variant= switcher' },
    { id: 'verdict', x: 680, y: 110, w: 180, h: 88, shape: 'round', fontSize: 13, label: 'delete /', sub: 'absorb / continue' },
  ],
  edges: [
    { from: 'question', to: 'route' },
    { from: 'route', to: 'term', fromSide: 'right', toSide: 'left', label: 'state / API' },
    { from: 'route', to: 'ui', fromSide: 'right', toSide: 'left', label: 'visual' },
    { from: 'term', to: 'verdict', fromSide: 'right', toSide: 'left' },
    { from: 'ui', to: 'verdict', fromSide: 'right', toSide: 'left' },
  ],
}
</script>

# Prototype

Invoke as `/afk:prototype`. Use it when you want to answer one observable question (try a UI direction, push a state model through edge cases, or feel out an API shape) before committing to a plan or implementation.

<RoughDiagram :scene="scene" caption="prototype answers one observable question with throwaway code — a terminal app for logic/state or toggleable UI variants — then deletes or absorbs the winner." />

## What it does

Prototype produces throwaway code that answers one question fast. It routes to one of two branches: a logic/state/API prototype (a small interactive terminal app over a portable pure module) or a UI/visual prototype (structurally different variants with a `?variant=` switcher). The artifact is marked throwaway from day one (`prototype` appears in the file, route, or directory name), and it uses the project's existing task runner with no new runtime.

- Prototypes use in-memory state by default; any scratch file is named `PROTOTYPE-WIPE-ME`.
- No production polish: no tests, no broad abstractions, no defensive error handling beyond keeping it runnable.
- After the question is answered, the prototype is deleted or its winning idea is absorbed into real code via `afk:implement`.

**Output artifact:** `brain/prototypes/<slug>.md` with the question, artifact path, run command, verdict, and decision (delete / absorb / continue exploring).

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/prototype/SKILL.md)
