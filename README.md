# afk — a simple coding flow for Claude Code

One help router, one optional end-to-end orchestrator, and four focused
workflow skills. No config files, no hooks — just the steps that matter:

```
/afk:help        Inspects the current repo state and recommends the next AFK
                 skill to run, with a short explanation.

/afk:ship        Runs the AFK loop to evidence: plans when needed, implements,
                 simplifies when useful, QA-checks behavior, and ends with a
                 ship/no-ship verdict.

/afk:write-good-goal
                 Turns a vague objective into a concrete /goal condition with
                 verification evidence, constraints, and optional stop bounds.

/afk:grill       AI interviews YOU about the plan, one question at a time,
                 challenging it against your domain glossary and ADRs.
                 Output: docs/plans/<slug>.md

/afk:implement   The lead reads the code, fixes architecture and contracts,
                 then delegates independent TDD slices to subagents, agent
                 teams, or dynamic workflows and reviews every diff.

/afk:simplify    4 cleanup agents in parallel review the diff for reuse,
                 simplification, efficiency, and altitude issues — then the
                 fixes get applied. Quality only, no bug hunting.

/afk:qa          Routes by project shape: dogfood-style browser QA for
                 frontend apps, contract-level API/service QA for backend
                 apps, and both for hybrids. Output: evidence-backed report.
```

Each skill works standalone. Run the focused skills in sequence for a feature,
grab one on its own, or use `/afk:ship` when you want the loop driven to a
verified verdict.

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

`/afk:qa` needs Vercel's
[agent-browser](https://github.com/vercel-labs/agent-browser) CLI installed and
available on your PATH when it routes to frontend browser QA.

## What lands in your repo

```
CONTEXT.md            # domain glossary, grown by /afk:grill
docs/adr/NNNN-*.md    # decisions worth recording, offered sparingly by grill
docs/plans/<slug>.md  # the agreed plan, input to /afk:implement
qa/                   # QA reports + screenshots (gitignored)
```

## Testing the plugin

```bash
bun run test              # zero-token unit + integration checks
bun run test:unit         # file-level markdown/manifest checks
bun run test:integration  # cross-file plugin structure checks
bun run test:e2e          # one cheap headless turn (~$0.01): plugin actually loads
bun run test:evals        # model-backed behavioral evals via claude -p
```

The testing approach is split into unit, integration, and end-to-end checks in
[docs/testing-strategy.md](docs/testing-strategy.md). Static lint also validates
behavioral eval specs under `tests/e2e/evals/specs/`.

`bun run test:e2e` and `bun run test:evals` require Claude Code
non-interactive auth, such as `ANTHROPIC_API_KEY` in CI or a local Claude Code
login that works with `claude -p`.

## Credits

- The grilling interview prompt is based on [Matt Pocock](https://www.aihero.dev/)'s
  "interview me about the plan" technique, extended with domain-glossary and
  ADR awareness.
- Skill structure and red-flags tables borrowed from
  [obra/superpowers](https://github.com/obra/superpowers).
