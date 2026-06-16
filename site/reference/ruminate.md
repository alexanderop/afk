<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// ruminate reads conversation history in parallel batches, synthesizes and
// filters across them, then (after approval) writes to brain + skills.
const scene: Scene = {
  width: 980,
  height: 360,
  groups: [
    { x: 240, y: 20, w: 260, h: 330, label: 'parallel analysis agents' },
  ],
  nodes: [
    { id: 'history', x: 20, y: 40, w: 170, h: 58, shape: 'cylinder', accent: true, fontSize: 11, label: '~/.claude/projects' },
    { id: 'brain', x: 20, y: 200, w: 170, h: 56, shape: 'cylinder', accent: true, fontSize: 12, label: 'existing brain' },
    { id: 'a1', x: 260, y: 52, w: 220, h: 52, shape: 'round', fontSize: 13, label: 'batch 1' },
    { id: 'a2', x: 260, y: 124, w: 220, h: 52, shape: 'round', fontSize: 13, label: 'batch 2' },
    { id: 'a3', x: 260, y: 196, w: 220, h: 52, shape: 'round', fontSize: 13, label: 'batch 3' },
    { id: 'a4', x: 260, y: 268, w: 220, h: 52, shape: 'round', fontSize: 13, label: 'batch 4' },
    { id: 'synth', x: 560, y: 130, w: 170, h: 64, shape: 'round', accent: true, label: 'synthesize', sub: 'dedupe + filter' },
    { id: 'write', x: 790, y: 130, w: 170, h: 58, shape: 'cylinder', accent: true, fontSize: 12, label: 'brain + SKILL.md' },
  ],
  edges: [
    { from: 'history', to: 'a1', fromSide: 'right', toSide: 'left' },
    { from: 'history', to: 'a2', fromSide: 'right', toSide: 'left' },
    { from: 'history', to: 'a3', fromSide: 'right', toSide: 'left' },
    { from: 'history', to: 'a4', fromSide: 'right', toSide: 'left' },
    { from: 'brain', to: 'synth', fromSide: 'right', toSide: 'bottom', label: 'context' },
    { from: 'a1', to: 'synth', fromSide: 'right', toSide: 'left' },
    { from: 'a2', to: 'synth', fromSide: 'right', toSide: 'left' },
    { from: 'a3', to: 'synth', fromSide: 'right', toSide: 'left' },
    { from: 'a4', to: 'synth', fromSide: 'right', toSide: 'left' },
    { from: 'synth', to: 'write', fromSide: 'right', toSide: 'left', label: 'approved' },
  ],
}
</script>

# Ruminate

Invoke as `/afk:ruminate`. Use it to mine past Claude Code conversation history for patterns, corrections, and knowledge that `reflect` missed and that were never written into the brain.

<RoughDiagram :scene="scene" caption="ruminate reads conversation history in parallel batches, synthesizes and filters across them, and (after you approve) writes findings to the brain and skills." />

## What it does

Ruminate reads the existing brain for context, locates past conversation files in `~/.claude/projects/`, extracts them into batches, and spawns one read-only analysis agent per batch in parallel. Each agent extracts: user corrections, recurring preferences, technical learnings, workflow patterns, and skills the user wished for. The lead synthesizes across batches, deduplicates, filters by frequency and impact, then presents findings for user approval before writing anything.

- Filters hard: recurring patterns beat one-off incidents; 3 high-signal findings beat 9 noisy ones.
- Proposes changes in a table (finding, frequency/evidence, proposed action). The user decides what to apply.
- Skill-specific learnings are routed into the relevant SKILL.md, and brain updates follow the `afk:brain` writing conventions.
- The temporary extraction directory is removed after use.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/ruminate/SKILL.md)
