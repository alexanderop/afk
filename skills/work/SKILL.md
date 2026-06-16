---
name: work
description: Use when implementation is verified locally and the user asks to ship it out — commit, push, open a PR, turn a diff into a pull request, or add a post-deploy monitoring plan. The closer for the afk:implement path, after afk:qa.
---

# Work

Turn a verified local change into a committed, pushed pull request with an
operational-validation plan. This is the ship-out closer for the
`afk:implement` lane — it picks up where `afk:qa` leaves off and is the one AFK
skill that creates PRs for single-diff work.

Core principle: a PR ships *verified* work, not hoped-for work. Do not open a PR
until the local evidence exists — passing verification, a QA verdict (or an
explicit, justified skip), and review findings resolved or recorded. `afk:work`
does not re-run `afk:simplify`, `afk:review`, or `afk:qa`; it confirms they ran
and ships their result.

## When to Use

Use this skill when:

- `afk:implement` produced a working-tree diff that has been simplified,
  reviewed, and QA'd, and the user wants it committed and opened as a PR.
- The user says "ship this out", "open a PR", "create a pull request", "commit
  and push", "turn this into a PR", or asks for a post-deploy / operational
  monitoring plan on a change.

Do not use this skill for:

- A diff that has not been verified. Route to `afk:qa` first for behavior-bearing
  work; `afk:work` ships evidence, it does not manufacture it.
- Fan-out work — `afk:batch` already commits, pushes, and opens one PR per unit.
  `afk:work` is the closer for the single-diff `afk:implement` path.
- The full lifecycle from plan to verdict — that is `afk:ship` (which stops at
  local evidence; `afk:work` is the step you run after its SHIP verdict).
- Deployment, release management, or production monitoring execution — `afk:work`
  prepares the validation plan in the PR; it does not deploy or watch dashboards.

## Process

1. Orient on shippable state.
   - Read `git status --short`, `git diff --stat`, and the current branch.
     Confirm there is real work to ship (an uncommitted diff, or a feature
     branch already ahead of base).
   - Locate the supporting artifacts: the plan (`brain/plans/<slug>.md` from
     `afk:grill` or `brain/plans/<slug>/` from `afk:plan`), the QA report
     (`qa/<slug>.md`) and its verdict, and any `afk:review` verdict from the
     session.
   - Confirm the gates ran. For behavior-bearing work with no `qa/<slug>.md`,
     STOP and route to `afk:qa` — do not ship unverified. If the QA verdict is
     `DO NOT SHIP`, STOP. If `SHIP WITH CAVEATS`, carry the caveats into the
     Residual Work Gate and the PR body.
   - If the vault has principles, skim `brain/principles.md` for any evidence or
     review bar that should gate the ship-out.

2. Make the branch safe to ship from.
   - Determine the default branch:

     ```bash
     default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
     [ -z "$default_branch" ] && default_branch=$(git rev-parse --verify origin/main >/dev/null 2>&1 && echo main || echo master)
     ```

   - If on the default branch, STOP — never commit or PR from it. Create a
     feature branch first, naming it from the plan slug or work
     (`git checkout -b feat/<slug>`).
   - If the current branch name is opaque or auto-generated (e.g.
     `worktree-jolly-raven`), suggest a meaningful rename
     (`git branch -m feat/<slug>`) before continuing.

3. Run the Residual Work Gate.
   - If `afk:review` or `afk:qa` left unresolved actionable findings (high- or
     medium-severity, or `SHIP WITH CAVEATS` caveats), do not silently ship over
     them. Load `references/residual-gate.md` and run the decision flow:
     fix now / file tickets / accept-and-record / stop.
   - Skip the gate only when review and QA reported no unresolved findings.

4. Final validation before commit.
   - Run the project's test command and linter (from `CLAUDE.md` / `AGENTS.md`
     or package scripts). Green is required — a red tree is a blocker, not a
     caveat.
   - Confirm the plan's requirements are satisfied and any
     `Deferred to Implementation` questions were resolved.

5. Commit in logical units.
   - Stage only the files for each logical unit (never `git add .` blindly).
     Write conventional commit messages (`feat(scope): …`, `fix(scope): …`)
     describing complete, valuable changes — never `WIP` or `partial X`.
   - Split a large diff into multiple focused commits when it spans distinct
     units; keep one unit per commit where it reads cleanly.

6. Push and open the PR.
   - Push the branch (`git push -u origin <branch>`).
   - Open the PR with `gh pr create`, building the body from
     `references/pr-description.md`: summary and key decisions (from the plan),
     testing notes, a link to the QA report and `qa/evidence/<slug>/`, any
     accepted **Known Residuals**, and the required **Post-Deploy Monitoring &
     Validation** section (or an explicit "no runtime impact" reason).
   - Report only the PR URL `gh` actually returned — never invent a link or
     assume CI is green.

7. Hand off to memory.
   - Suggest `afk:reflect` to persist durable learnings from the run. Do not
     duplicate it here; `afk:work` ships the PR, it does not write the brain. The
     ship-out never changes the QA verdict.

## Stop and Ask

STOP and ask the user when:

- The change is behavior-bearing and has no `qa/<slug>.md` evidence, or the QA
  verdict is `DO NOT SHIP`.
- You are on the default branch, or the remote, base branch, or PR target
  depends on a convention the repo does not state.
- `gh` is unavailable or not authenticated, so the PR cannot be created.
- The user wants deployment, release management, or production monitoring
  execution — that is outside `afk:work`'s scope.
- The action would be destructive, push to a protected branch, or send real
  external communications.

Decide branch names, commit boundaries, and PR body content yourself from the
plan, diff, and repo conventions. Ask only for the missing decision, the missing
evidence, or permission for an unsafe action.

## Red Flags

| Thought | Reality |
|---------|---------|
| "Tests pass, so it's ready to PR." | Tests are verification. Behavior-bearing work also needs a `qa/<slug>.md` SHIP verdict before ship-out. |
| "I'll re-run simplify and review here to be safe." | Those are owned skills already in the flow. `afk:work` confirms they ran and ships the result — it does not duplicate them. |
| "Review left a finding, but it's probably fine to ship." | Run the Residual Work Gate. Unresolved findings get fixed, filed, or recorded — never silently shipped over. |
| "I'll `git add .` and commit everything." | Stage per logical unit with conventional messages. A `WIP` message means the unit isn't ready to commit. |
| "The PR doesn't need a monitoring section — it's just code." | Every PR gets a Post-Deploy Monitoring & Validation section, even if it's an explicit "no runtime impact" line. |
| "`gh` probably opened the PR." | Report only the URL `gh` returned. Don't invent links or assume green CI. |
| "I'm on main, but it's a small change." | Never commit or PR from the default branch. Create a feature branch first. |

## Output

Return this compact shape:

```markdown
Shipped: PR <url>
Branch: <branch> -> <base>
Commits: <n logical commits, conventional messages>
QA: qa/<slug>.md verdict (SHIP | SHIP WITH CAVEATS) or "skipped, reason"
Residuals: <fixed | filed (links) | accepted (recorded where) | none>
Monitoring: included | "no runtime impact, reason"
Memory: suggest afk:reflect, or "reflected, summary"
```

If ship-out cannot complete, report the exact blocker (missing QA evidence,
default branch, `gh` not authenticated) and the next step to unblock it.

## References

- `references/pr-description.md` — the PR body template (summary, testing,
  evidence, Post-Deploy Monitoring section, attribution).
- `references/residual-gate.md` — the unresolved-findings decision flow.
- `afk:qa` — produces the `qa/<slug>.md` verdict `afk:work` requires before
  ship-out.
- `afk:review` — the principle-grounded review whose findings feed the Residual
  Work Gate.
- `afk:batch` — the fan-out alternative that already commits, pushes, and opens
  one PR per unit.
- `afk:reflect` — persists learnings after the PR is open.
