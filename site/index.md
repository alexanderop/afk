---
layout: home

hero:
  name: afk
  text: A simple coding flow for Claude Code
  tagline: "Grill your plan, implement with bounded TDD workers, simplify with parallel cleanup, and verify with evidence-backed QA, plus a persistent brain/ memory vault the whole flow reads and writes."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: Browse Skills
      link: /reference/help
    - theme: alt
      text: GitHub
      link: https://github.com/alexanderop/afk

features:
  - title: Four-step coding flow
    details: "grill → implement → simplify → qa: interview your plan, run bounded TDD workers, parallel-clean the diff, then verify with real evidence."
  - title: Brain memory vault
    details: A persistent brain/ vault of engineering principles and project learnings that every flow step reads before acting and writes back to after.
  - title: Eval-first QA
    details: qa routes by project shape (dogfood browser QA for frontends, contract-level API checks for backends) and ends with a ship/no-ship verdict.
  - title: Batch fan-out
    details: batch splits an independently-mergeable plan into parallel worktree workers, each opening its own PR, so large feature sets land fast.
---

<FlowDiagram />

## Install

Inside any Claude Code session:

```
/plugin marketplace add alexanderop/afk
/plugin install afk@afk
```

Verify with `/help`: the skills appear under the `afk:` namespace.
