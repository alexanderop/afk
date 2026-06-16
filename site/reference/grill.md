# Grill

Invoke as `/afk:grill`. Use it when you have a vague feature idea, a non-trivial change with unresolved product intent, or when you want to stress-test a plan before implementation starts.

## What it does

Grill runs a structured planning interview, asking one decision at a time, but only questions the repo, docs, ADRs, or fetched primary sources cannot answer. It opens with a product-owner framing (Background) before asking anything, then works through glossary terms, edge cases, failure modes, and contracts until the decision tree is settled. It fetches live documentation for any libraries or APIs involved rather than relying on training data.

- Reads `CONTEXT.md`, ADRs in `docs/adr/`, the brain's principles, and relevant source files before asking.
- Challenges glossary conflicts and proposes canonical terms for overloaded domain words.
- Updates `CONTEXT.md` immediately when terms are resolved; offers ADRs only for hard-to-reverse trade-off decisions.

**Output artifact:** `brain/plans/<slug>.md` when a brain vault exists, otherwise `docs/plans/<slug>.md`. The plan holds decisions, contracts, wave-sequenced tasks, and an optional `## Acceptance` bar for experience-bearing work. This plan is the direct input to `afk:implement` or `afk:batch`.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/grill/SKILL.md)
