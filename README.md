# afk — a simple four-skill coding flow for Claude Code

Four skills, one idea each. No pipeline orchestration, no config files, no
hooks — just the four steps that matter, in order:

```
/afk:grill       AI interviews YOU about the plan, one question at a time,
                 challenging it against your domain glossary and ADRs.
                 Output: docs/plans/<slug>.md

/afk:implement   The lead reads the code, fixes architecture and contracts,
                 then delegates independent TDD slices to subagents, agent
                 teams, or dynamic workflows and reviews every diff.

/afk:simplify    4 cleanup agents in parallel review the diff for reuse,
                 simplification, efficiency, and altitude issues — then the
                 fixes get applied. Quality only, no bug hunting.

/afk:qa          Drives the real UI with agent-browser — screenshots,
                 console errors, evidence-backed pass/fail report with a
                 ship recommendation.
```

Each skill works standalone. Run them in sequence for a feature, or grab one
on its own.

## Install

Inside any Claude Code session:

```
/plugin marketplace add alexanderop/afk
/plugin install afk@afk
```

Verify with `/help` — the skills appear under the `afk:` namespace.
Update later with `/plugin marketplace update afk`.

To try it without installing:

```bash
git clone https://github.com/alexanderop/afk
claude --plugin-dir ./afk
```

`/afk:qa` additionally needs the [agent-browser](https://github.com/vercel-labs/agent-browser) CLI on your PATH.

## What lands in your repo

```
CONTEXT.md            # domain glossary, grown by /afk:grill
docs/adr/NNNN-*.md    # decisions worth recording, offered sparingly by grill
docs/plans/<slug>.md  # the agreed plan, input to /afk:implement
qa/                   # QA reports + screenshots (gitignored)
```

## Testing the plugin

```bash
tests/lint/run-lint-tests.sh    # zero-token markdown/manifest lint — run on every edit
tests/smoke/plugin-load.sh      # one cheap headless turn (~$0.01): plugin actually loads
```

## Credits

- The grilling interview prompt is based on [Matt Pocock](https://www.aihero.dev/)'s
  "interview me about the plan" technique, extended with domain-glossary and
  ADR awareness.
- Skill structure and red-flags tables borrowed from
  [obra/superpowers](https://github.com/obra/superpowers).
