<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// work picks up the verified state, clears the residual-work gate, then commits,
// pushes, and opens a PR with a monitoring plan. DO NOT SHIP blocks the gate.
const scene: Scene = {
  width: 1040,
  height: 320,
  groups: [
    { x: 20, y: 40, w: 180, h: 230, label: 'verified state' },
  ],
  nodes: [
    { id: 'diff', x: 35, y: 70, w: 150, h: 44, shape: 'round', fontSize: 13, label: 'diff' },
    { id: 'qa', x: 35, y: 128, w: 150, h: 44, shape: 'round', fontSize: 13, label: 'qa verdict' },
    { id: 'review', x: 35, y: 186, w: 150, h: 44, shape: 'round', fontSize: 12, label: 'review findings' },
    { id: 'gate', x: 250, y: 105, w: 160, h: 92, shape: 'diamond', fontSize: 13, label: 'residuals resolved?' },
    { id: 'stop', x: 250, y: 235, w: 160, h: 46, shape: 'pill', fontSize: 11, label: 'DO NOT SHIP → stop' },
    { id: 'commit', x: 460, y: 120, w: 140, h: 62, shape: 'round', accent: true, label: 'commit', sub: 'logical units' },
    { id: 'push', x: 640, y: 120, w: 140, h: 62, shape: 'round', accent: true, label: 'push branch' },
    { id: 'pr', x: 820, y: 112, w: 210, h: 78, shape: 'round', accent: true, fontSize: 14, label: 'gh pr create', sub: '+ monitoring plan' },
  ],
  edges: [
    { from: 'diff', to: 'gate', fromSide: 'right', toSide: 'left' },
    { from: 'qa', to: 'gate', fromSide: 'right', toSide: 'left' },
    { from: 'review', to: 'gate', fromSide: 'right', toSide: 'left' },
    { from: 'gate', to: 'commit', fromSide: 'right', toSide: 'left', label: 'resolved' },
    { from: 'gate', to: 'stop', fromSide: 'bottom', toSide: 'top', dashed: true, label: 'blocked' },
    { from: 'commit', to: 'push', fromSide: 'right', toSide: 'left' },
    { from: 'push', to: 'pr', fromSide: 'right', toSide: 'left' },
  ],
}
</script>

# Work

Invoke as `/afk:work`. Use it after a QA verdict, when a verified `afk:implement` diff is ready to ship out — commit, push, open a PR, or add a post-deploy monitoring plan.

<RoughDiagram :scene="scene" caption="work picks up the verified diff and QA verdict, clears the residual-work gate, then commits in logical units, pushes, and opens a PR with a monitoring plan." />

## What it does

Work is the ship-out closer for the single-diff `afk:implement` lane. It picks up where `afk:qa` leaves off and turns verified local evidence into a pull request. It does **not** re-run `afk:simplify`, `afk:review`, or `afk:qa` — it confirms they ran and ships their result.

- **Orients on shippable state:** reads the diff, the plan, the `qa/<slug>.md` verdict, and any `afk:review` findings. It refuses to open a PR for behavior-bearing work with no QA evidence, and stops on a `DO NOT SHIP` verdict.
- **Makes the branch safe:** never commits or PRs from the default branch; suggests a meaningful rename for opaque worktree branch names.
- **Runs the Residual Work Gate:** unresolved review/QA findings are fixed, filed as tickets, accepted-and-recorded in the PR's Known Residuals, or block the ship — never silently shipped over.
- **Commits in logical units** with conventional messages, then pushes and opens the PR via `gh pr create`.
- **Writes a Post-Deploy Monitoring & Validation section** into every PR body (log queries, metrics, healthy/failure signals, rollback trigger, validation window) — or an explicit "no runtime impact" line.

`afk:work` is the step you run after `afk:ship` returns a SHIP verdict (ship stops at local evidence). For fan-out work, `afk:batch` already opens one PR per unit.

**Output artifact:** a pull request with a summary, testing notes, linked QA evidence, and a post-deploy monitoring plan.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/work/SKILL.md)
