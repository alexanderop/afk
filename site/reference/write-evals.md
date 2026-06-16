<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// write-evals finds or scaffolds a harness, writes one red-first case per
// behavior, confirms it fails for the right reason, then hands off to implement.
const scene: Scene = {
  width: 1000,
  height: 340,
  nodes: [
    { id: 'behavior', x: 20, y: 138, w: 150, h: 46, shape: 'pill', fontSize: 12, label: 'one behavior' },
    { id: 'harness', x: 200, y: 116, w: 150, h: 90, shape: 'diamond', label: 'harness exists?' },
    { id: 'scaffold', x: 205, y: 20, w: 180, h: 50, shape: 'round', fontSize: 13, label: 'scaffold harness' },
    { id: 'write', x: 400, y: 124, w: 180, h: 66, shape: 'round', accent: true, fontSize: 11, label: 'write case', sub: 'fixture · prompt · asserts' },
    { id: 'run', x: 620, y: 112, w: 160, h: 94, shape: 'diamond', fontSize: 11, label: 'red for the right reason?' },
    { id: 'handoff', x: 820, y: 124, w: 160, h: 66, shape: 'round', accent: true, label: 'hand off', sub: '→ implement' },
  ],
  edges: [
    { from: 'behavior', to: 'harness' },
    { from: 'harness', to: 'scaffold', fromSide: 'top', toSide: 'bottom', label: 'no' },
    { from: 'scaffold', to: 'write', fromSide: 'right', toSide: 'top' },
    { from: 'harness', to: 'write', fromSide: 'right', toSide: 'left', label: 'yes' },
    { from: 'write', to: 'run', fromSide: 'right', toSide: 'left' },
    { from: 'run', to: 'handoff', fromSide: 'right', toSide: 'left', label: 'red ✓' },
    {
      from: 'run', to: 'write', fromSide: 'bottom', toSide: 'bottom',
      via: [{ x: 700, y: 300 }, { x: 490, y: 300 }], dashed: true,
      label: 'not red — fix', labelAt: { x: 595, y: 300 },
    },
  ],
}
</script>

# Write Evals

Invoke as `/afk:write-evals`. Use it when you want to add behavioral evals for a skill, agent, prompt, or feature, especially to write a failing eval before implementing (the AFK eval-first pattern).

<RoughDiagram :scene="scene" caption="write-evals finds or scaffolds a harness, writes one red-first case per behavior, confirms it fails for the right reason, then hands off to the implementing skill." />

## What it does

Write Evals locates or scaffolds an eval harness, then writes one case per observable behavior: a fixture, a prompt, and machine-checkable assertions with an optional LLM judge for behaviors substrings cannot express. The invariant it enforces is **write the eval red first**: a case that cannot fail proves nothing. If no harness exists, it scaffolds one from `run-evals.template.ts`.

- Each case pins one behavior in `expected_output`; two-part requirements become two assertions.
- Deterministic assertions (`required_files`, `required_file_substrings`, `required/forbidden_substrings`) come first; LLM judge only when string checks cannot capture the behavior.
- Pure route checks use `kind:"routing"`: code-graded, no judge, strict-majority scored.
- After writing, runs only the new case to confirm it is red for the right reason, then hands off to the implementing skill.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/write-evals/SKILL.md)
