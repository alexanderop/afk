# PR Description Template

Build the `gh pr create` body from this template. Fill every section; drop a
section only when it genuinely does not apply, and say why inline rather than
deleting it silently.

```markdown
## Summary

<2-4 sentences: what this change does and why. Pull the intent and key
decisions from the plan (brain/plans/<slug>.md or brain/plans/<slug>/).>

## Key decisions

- <decision and its rationale, from the plan or resolved during implementation>
- <contract, edge case, or scope boundary worth surfacing to a reviewer>

## Testing

- Verification command(s) run and result: `<command>` -> <pass/fail summary>
- Tests added or changed: <files or "none, reason">
- QA: qa/<slug>.md verdict (SHIP | SHIP WITH CAVEATS). Evidence:
  qa/evidence/<slug>/

## Known Residuals

<Only when the Residual Work Gate recorded accepted findings. One line per
finding: severity, file:line, title. Omit this section entirely when there are
none.>

## Post-Deploy Monitoring & Validation

<Required on every PR.>

- **Log queries / search terms:** <what to grep in logs after deploy>
- **Metrics / dashboards:** <what to watch>
- **Healthy signals:** <what "working" looks like>
- **Failure signals + trigger:** <what says it broke, and the rollback or
  mitigation trigger>
- **Validation window / owner:** <how long to watch, who owns it>

If there is genuinely no production or runtime impact, replace the bullets with:
`No additional operational monitoring required — <one-line reason>.`

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Notes

- Keep the summary reviewer-facing: what changed and why, not a commit log.
- The Post-Deploy Monitoring section is never optional. A change with no runtime
  impact still gets the explicit no-impact line — that is the signal a reviewer
  needs, not an empty section.
- Link the QA report and evidence directory so the reviewer can trace the verdict
  to its evidence without re-running QA.
