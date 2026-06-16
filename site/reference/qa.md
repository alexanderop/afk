<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// qa classifies the change, then gathers real evidence on the matching branch
// (browser screenshots or API transcripts) and judges ship/no-ship on intent.
const scene: Scene = {
  width: 860,
  height: 320,
  nodes: [
    { id: 'change', x: 20, y: 130, w: 150, h: 46, shape: 'pill', fontSize: 12, label: 'implemented change' },
    { id: 'classify', x: 200, y: 110, w: 150, h: 88, shape: 'diamond', label: 'classify system' },
    { id: 'browser', x: 400, y: 30, w: 200, h: 58, shape: 'round', accent: true, fontSize: 13, label: 'agent-browser', sub: 'screenshots · console' },
    { id: 'api', x: 400, y: 200, w: 200, h: 58, shape: 'round', accent: true, fontSize: 13, label: 'exercise contract', sub: 'req/resp transcripts' },
    { id: 'verdict', x: 650, y: 110, w: 180, h: 84, shape: 'round', fontSize: 13, label: 'SHIP / NO-SHIP', sub: 'on stated intent' },
  ],
  edges: [
    { from: 'change', to: 'classify' },
    { from: 'classify', to: 'browser', fromSide: 'right', toSide: 'left', label: 'frontend' },
    { from: 'classify', to: 'api', fromSide: 'right', toSide: 'left', label: 'backend' },
    { from: 'browser', to: 'verdict', fromSide: 'right', toSide: 'left' },
    { from: 'api', to: 'verdict', fromSide: 'right', toSide: 'left' },
  ],
}
</script>

# QA

Invoke as `/afk:qa`. Use it after implementation is done, before shipping, or whenever you need observed behavior (not just passing tests) to make a ship/no-ship call.

<RoughDiagram :scene="scene" caption="Classify the change, gather real evidence — browser screenshots or API transcripts — then judge ship/no-ship on stated intent, not just a green suite." />

## What it does

QA classifies the changed system (frontend, backend, or hybrid), then exercises it with direct evidence. For frontend work it drives a real browser session via `agent-browser`, capturing screenshots at each state transition and checking for console errors, uncaught exceptions, and correct persisted state. For backend/API/CLI work it exercises the contract directly (health check, happy path, validation failures, auth failures, persistence round-trip, and side effects), capturing request/response transcripts.

- Evidence is written to `qa/evidence/<slug>/` for browser screenshots and `qa/evidence/<slug>/api/` for API transcripts.
- QA judges whether the change delivers its **stated intent**, not just that it runs without errors. A chart that renders but hides the trend fails even with no console errors.
- QA cannot substitute tests for observed behavior; if the app cannot run locally, QA reports the exact blocker.

**Output artifact:** `qa/<slug>.md` with verdict (`SHIP`, `DO NOT SHIP`, or `SHIP WITH CAVEATS`), test cases, and observations.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/qa/SKILL.md)
