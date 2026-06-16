# Introduction

afk is a Claude Code plugin that gives you one help router, a five-step coding
flow, a fan-out batch mode, and a persistent memory vault: the steps that
matter for going from idea to shipped.

## The five-step flow

```
grill → implement → simplify → qa → work
```

**grill** interviews you about the plan one decision at a time, challenges it
against your domain glossary and ADRs, and writes an agreed plan to
`docs/plans/` (or `brain/plans/` when the vault exists).

**implement** triages complexity and routes accordingly: simple local edits stay
in the main conversation; everything else goes through a read-only Opus
orchestrator that decides architecture and slice boundaries, then fans work out
to bounded Sonnet TDD workers.

**simplify** runs four cleanup agents in parallel (reuse, simplification,
efficiency, and altitude), deduplicates the findings, then applies only
behavior-preserving fixes.

**qa** routes by project shape: browser QA for frontend, contract-level checks
for backend, both for hybrids. It ends with a SHIP / DO NOT SHIP / SHIP WITH
CAVEATS verdict backed by direct evidence.

**work** ships that verdict out. After QA, it runs a residual-findings gate,
then commits in logical units, pushes, and opens a PR with a post-deploy
monitoring plan. It is the closer for the single-diff implement path (`ship`
stops at local evidence; `batch` opens its own PRs).

**batch** is the fan-out alternative to implement: it splits an
independently-mergeable plan into many units and runs one parallel worktree
worker per unit, each opening its own PR.

**ship** drives the whole loop to a verdict automatically: it plans when needed,
implements, simplifies, runs `afk:review` as a quality gate, QA-checks
behavior, and ends with a ship/no-ship decision.

## The brain vault

afk keeps a persistent `brain/` vault, an Obsidian-compatible markdown store
of your project's engineering principles, codebase gotchas, and decisions. The
flow is wired to use it: grill, the implement orchestrator, and qa read the
brain's principles before acting; ship calls reflect to persist learnings
afterward. Two hooks run the plumbing automatically.

---

Ready to install? See [Quickstart](/guide/quickstart).

Want the full picture of each step? See [The AFK Flow](/concepts/the-afk-flow).
