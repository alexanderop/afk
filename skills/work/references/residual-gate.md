# Residual Work Gate

Run this gate when `afk:review` or `afk:qa` left actionable findings unresolved
before ship-out — high- or medium-severity review findings, or the caveats
behind a `SHIP WITH CAVEATS` verdict. Do not open the PR over unresolved
findings silently; the user decides how each is handled.

## How to run it

1. Collect the unresolved findings: read the `afk:review` verdict's numbered
   findings and the `qa/<slug>.md` caveats. Keep only the actionable ones
   (something a maintainer would act on), with severity and `file:line`.
2. If the set is empty, skip the gate and continue ship-out.
3. Otherwise, present the count and ask the user how to proceed, using the
   harness's blocking question tool (`AskUserQuestion` in Claude Code — load it
   via `ToolSearch select:AskUserQuestion` if needed). Never default a choice
   silently.

Stem: `Review/QA left N actionable finding(s) unresolved. How should afk:work
proceed?`

Options (self-contained labels):

- **Fix now** — resolve the findings before committing. For non-trivial fixes,
  route back to `afk:implement`; for cleanup, `afk:simplify`. Re-run the
  project verification afterward, then continue ship-out.
- **File tickets** — record each finding in the project's issue tracker (or via
  `gh issue create`). Link the issues, then continue ship-out.
- **Accept and record** — the user accepts the risk. Record the findings
  verbatim in the PR body's **Known Residuals** section (severity, `file:line`,
  title) so they live in a durable place, not just the session. Then continue.
- **Stop — do not ship** — abort ship-out. The user handles the findings before
  re-invoking `afk:work`.

## Rules

- A `DO NOT SHIP` QA verdict is not a residual to negotiate — STOP ship-out
  entirely and route back to fix the defect.
- On **Accept and record**, do not proceed past this gate until the findings are
  actually written into the PR's Known Residuals section. Acceptance that lives
  only in the transient session is not acceptance.
- Carry the gate outcome into the final `afk:work` report's `Residuals:` line.
