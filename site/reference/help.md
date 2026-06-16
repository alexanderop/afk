# Help

Invoke as `/afk:help`. Use it when you need workflow orientation, want to know which AFK skill to use next, or need an explanation of AFK itself.

## What it does

Help reads the project's observed state (whether a `brain/` vault exists, what plans are present, what diffs exist, what QA reports are available) and routes you to exactly one next step. For fresh projects (no `brain/`), it leads with the eval-first onboarding path: write a failing eval with `afk:write-evals`, then implement against it. For returning users, it classifies your intent (orientation, specific skill question, lifecycle request) and names the skill to run, plus an invocation you can paste directly.

- Reads `brain/`, `docs/plans/`, `qa/`, `git status`, and a built-in catalog to ground its answer.
- Returns: **Where you are**, **Next step** (with invocation), **Why**, **Expected output**.
- Offers to run the recommended skill immediately if one next step is clearly right.
- Lists only relevant skills unless you ask to see everything.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/help/SKILL.md)
