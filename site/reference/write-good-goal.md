<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// write-good-goal turns vague intent into a single agent-evaluable completion
// condition, shaped then checked against six quality criteria.
const scene: Scene = {
  width: 880,
  height: 300,
  nodes: [
    { id: 'intent', x: 20, y: 120, w: 162, h: 48, shape: 'pill', label: 'vague intent' },
    { id: 'shape', x: 228, y: 106, w: 224, h: 72, shape: 'round', accent: true, fontSize: 14, label: 'shape the condition', sub: 'Achieve · Prove · Preserve · Stop' },
    { id: 'check', x: 508, y: 96, w: 184, h: 96, shape: 'diamond', fontSize: 14, label: '6 criteria pass?' },
    { id: 'goal', x: 712, y: 108, w: 152, h: 72, shape: 'round', accent: true, label: '/goal', sub: 'agent-evaluable' },
  ],
  edges: [
    { from: 'intent', to: 'shape' },
    { from: 'shape', to: 'check', fromSide: 'right', toSide: 'left' },
    { from: 'check', to: 'goal', fromSide: 'right', toSide: 'left', label: 'pass', labelAt: { x: 702, y: 128 } },
    {
      from: 'check', to: 'shape', fromSide: 'bottom', toSide: 'bottom',
      via: [{ x: 585, y: 250 }, { x: 340, y: 250 }], dashed: true,
      label: 'tighten', labelAt: { x: 462, y: 250 },
    },
  ],
}
</script>

# Write Good Goal

Invoke as `/afk:write-good-goal`. Use it when you need to draft, tighten, validate, or repair a `/goal` command, completion condition, or success criteria for long-running agent work.

<RoughDiagram :scene="scene" caption="write-good-goal turns vague intent into a single agent-evaluable completion condition — shaped, then checked against six quality criteria." />

## What it does

Write Good Goal turns vague intent into a single, agent-evaluable completion condition. It identifies the intended outcome, converts it to a measurable condition an agent can verify from its own transcript, and presents the result without starting the work. For frontend outcomes it includes real browser verification via `agent-browser`; for backend, CLI, or docs work it uses the narrowest contract, test, or artifact proof that fits.

- Uses the shape: `Achieve [specific outcome]. Prove it by [verification]. Preserve [constraints]. Stop if [limit].`
- Checks the result against six quality criteria: specific, measurable, agent-observable, evidence-shaped, bounded, non-ambiguous.
- Presents the recommended `/goal` and explains the assumptions; offers a tighter variant when a safer bounded alternative exists.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/write-good-goal/SKILL.md)
