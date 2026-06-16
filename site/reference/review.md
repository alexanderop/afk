# Review

Invoke as `/afk:review`. Use it when you want a principle-grounded read on code changes, a PR, or a plan — producing numbered findings and a verdict without making any changes.

## What it does

Review reads the brain's principles fresh, determines the scope of the change (small: read directly; big: delegates to exploration subagents), then works through six assessment sections in order: scope check (files changed outside the phase's stated scope), architecture, code quality, tests, performance, and principle compliance. Every finding is numbered, severity-rated (high / medium / low), mapped to a principle, and offered with 2–3 lettered options so the user can act deliberately.

- Verdict is **Accept**, **Accept with notes** (low-severity issues only), or **Revise** (high-severity issues present).
- Review only diagnoses — it never applies fixes. For cleanup use `afk:simplify`; for behavior changes use `afk:implement`.
- `afk:ship` runs review after simplify so it judges the cleaned-up diff before QA.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/review/SKILL.md)
