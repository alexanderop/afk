# Ship

Invoke as `/afk:ship`. Use it when you want to run the full AFK flow — from idea or plan through to a verified, evidence-backed verdict — or to resume a partly completed AFK workflow.

## What it does

Ship is an orchestrator. It inspects the current repo state, chooses the right planning route, then drives `afk:grill` (if needed), `afk:implement`, `afk:simplify`, `afk:review`, and `afk:qa` in sequence without replacing any of their detailed instructions. After QA it calls `afk:reflect` to persist durable learnings into `brain/`.

- If a plan path is supplied or one clearly matches the work, Ship skips grill and proceeds to implementation.
- Simplify and review are skipped only for tiny, mechanical, or documentation-only changes; the reason is always stated.
- QA must produce a `qa/<slug>.md` report with a `SHIP`, `DO NOT SHIP`, or `SHIP WITH CAVEATS` verdict for any behavior-bearing change.

**Output artifact:** `qa/<slug>.md` with the final verdict, plus a summary covering Route, Plan, Changed, Verification, Review, QA, and Memory fields.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/ship/SKILL.md)
