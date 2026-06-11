# native worktree isolation

Why ralph uses manual `git worktree add -b`, not the harness's `isolation: worktree` — native worktrees branch from the default branch, which breaks the feature-branch slice stack. Read before changing how subagents are dispatched or isolated.

Claude Code's Agent tool and agent frontmatter offer `isolation: worktree`,
which looks like a drop-in replacement for the manual worktree handling in
`skills/ralph/SKILL.md` and `skills/pipeline/SKILL.md`. It is not:

- A native worktree branches **from the repo's default branch**, not from the
  parent session's HEAD. Ralph's slices stack on a feature branch — slice 3
  must build on slices 1–2. A native worktree would silently start from main
  and produce a diff missing every earlier slice.
- The native worktree is auto-removed if the agent makes no changes, and
  nothing merges its commits back into the run's feature branch — the
  orchestrator's manual merge-in-ticket-order step has no native equivalent.

Native isolation fits throwaway, independent work (e.g. exploratory spikes),
not the pipeline's sequential slice model. Keep the manual
`git worktree add ../<repo>-afk-<slug> -b <branch>` pattern.
