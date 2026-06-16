# Work

Invoke as `/afk:work`. Use it after a QA verdict, when a verified `afk:implement` diff is ready to ship out — commit, push, open a PR, or add a post-deploy monitoring plan.

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
