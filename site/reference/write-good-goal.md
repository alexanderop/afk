# Write Good Goal

Invoke as `/afk:write-good-goal`. Use it when you need to draft, tighten, validate, or repair a `/goal` command, completion condition, or success criteria for long-running agent work.

## What it does

Write Good Goal turns vague intent into a single, agent-evaluable completion condition. It identifies the intended outcome, converts it to a measurable condition an agent can verify from its own transcript, and presents the result without starting the work. For frontend outcomes it includes real browser verification via `agent-browser`; for backend, CLI, or docs work it uses the narrowest contract, test, or artifact proof that fits.

- Uses the shape: `Achieve [specific outcome]. Prove it by [verification]. Preserve [constraints]. Stop if [limit].`
- Checks the result against six quality criteria: specific, measurable, agent-observable, evidence-shaped, bounded, non-ambiguous.
- Presents the recommended `/goal` and explains the assumptions; offers a tighter variant when a safer bounded alternative exists.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/write-good-goal/SKILL.md)
