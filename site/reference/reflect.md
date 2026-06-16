<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// reflect scans the session and routes each learning to where it changes
// behavior: a structural fix first, else brain, skill file, or backlog.
const scene: Scene = {
  width: 880,
  height: 380,
  nodes: [
    { id: 'convo', x: 20, y: 160, w: 150, h: 46, shape: 'pill', label: 'conversation' },
    { id: 'reflect', x: 220, y: 150, w: 160, h: 66, shape: 'round', accent: true, label: 'reflect', sub: 'classify learnings' },
    { id: 'structural', x: 470, y: 30, w: 260, h: 50, shape: 'round', accent: true, fontSize: 12, label: 'lint / script / metadata' },
    { id: 'brain', x: 470, y: 100, w: 260, h: 54, shape: 'cylinder', accent: true, label: 'brain/' },
    { id: 'skill', x: 470, y: 174, w: 260, h: 50, shape: 'round', fontSize: 13, label: 'SKILL.md' },
    { id: 'backlog', x: 470, y: 244, w: 260, h: 50, shape: 'round', fontSize: 13, label: 'backlog' },
    { id: 'skip', x: 470, y: 314, w: 260, h: 44, shape: 'round', fontSize: 12, label: 'skip (trivial)' },
  ],
  edges: [
    { from: 'convo', to: 'reflect' },
    { from: 'reflect', to: 'structural', fromSide: 'right', toSide: 'left', label: 'first' },
    { from: 'reflect', to: 'brain', fromSide: 'right', toSide: 'left' },
    { from: 'reflect', to: 'skill', fromSide: 'right', toSide: 'left' },
    { from: 'reflect', to: 'backlog', fromSide: 'right', toSide: 'left' },
    { from: 'reflect', to: 'skip', fromSide: 'right', toSide: 'left', dashed: true },
  ],
}
</script>

# Reflect

Invoke as `/afk:reflect`. Use it when wrapping up a session, after a correction, or when significant codebase knowledge was gained, to persist learnings where they will change future behavior.

<RoughDiagram :scene="scene" caption="reflect scans the session and routes each learning to where it changes behavior — a structural fix first, otherwise the brain, a skill file, or the backlog." />

## What it does

Reflect scans the current conversation for mistakes and corrections, user preferences, codebase knowledge (architecture, gotchas, patterns), tool/library quirks, decisions and their rationale, and friction in skill execution. Each learning is routed to the right destination rather than defaulting everything to the brain.

- **Structural check first:** if a learning can be encoded as a lint rule, script, or metadata flag, it goes there, not the brain.
- **Brain (`brain/`)** gets durable codebase knowledge, principles, and gotchas that would inform a future session.
- **Skill files** get learnings about how a specific skill's process, prompts, or edge cases should change.
- **Backlog** gets follow-up work that cannot be done during reflection.

Anything trivial or already captured is skipped. `brain/index.md` is rebuilt automatically by the PostToolUse hook.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/reflect/SKILL.md)
