# Write Evals

Invoke as `/afk:write-evals`. Use it when you want to add behavioral evals for a skill, agent, prompt, or feature, especially to write a failing eval before implementing (the AFK eval-first pattern).

## What it does

Write Evals locates or scaffolds an eval harness, then writes one case per observable behavior: a fixture, a prompt, and machine-checkable assertions with an optional LLM judge for behaviors substrings cannot express. The invariant it enforces is **write the eval red first**: a case that cannot fail proves nothing. If no harness exists, it scaffolds one from `run-evals.template.ts`.

- Each case pins one behavior in `expected_output`; two-part requirements become two assertions.
- Deterministic assertions (`required_files`, `required_file_substrings`, `required/forbidden_substrings`) come first; LLM judge only when string checks cannot capture the behavior.
- Pure route checks use `kind:"routing"`: code-graded, no judge, strict-majority scored.
- After writing, runs only the new case to confirm it is red for the right reason, then hands off to the implementing skill.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/write-evals/SKILL.md)
