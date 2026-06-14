# afk — a simple coding flow for Claude Code

One help router, one optional end-to-end orchestrator, focused workflow skills,
a packaged implementation agent pair, and a persistent `brain/` memory vault the
flow reads before acting and writes back to as it learns. Just the steps that
matter:

```
/afk:help        Inspects the current repo state and recommends the next AFK
                 skill to run, with a short explanation.

/afk:ship        Runs the AFK loop to evidence: plans when needed, implements,
                 simplifies when useful, QA-checks behavior, and ends with a
                 ship/no-ship verdict.

/afk:write-good-goal
                 Turns a vague objective into a concrete /goal condition with
                 verification evidence, constraints, and optional stop bounds.

/afk:prototype   Builds a throwaway logic TUI or UI variant route to answer
                 design uncertainty before committed planning or implementation.

/afk:grill       AI interviews YOU about the plan, one question at a time,
                 challenging it against your domain glossary and ADRs.
                 Output: docs/plans/<slug>.md

/afk:implement   The lead classifies the work. Simple edits stay local;
                 complex plans route through an Opus read-only orchestrator
                 and Sonnet implementation workers, then every diff is
                 reviewed.

/afk:batch       The fan-out alternative to implement: splits an
                 independently-mergeable plan into many units and runs one
                 parallel worktree worker per unit, each opening its own PR.

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

## Memory: the brain vault

AFK keeps a persistent `brain/` vault — an Obsidian-compatible markdown store of
your project's engineering principles, codebase gotchas, and decisions. Two
hooks run the plumbing: a SessionStart hook injects `brain/index.md` so every
session knows what's there, and a PostToolUse hook rebuilds the index when
`brain/` files change. The flow is wired to use it: `/afk:grill`, the implement
orchestrator, and `/afk:qa` read the brain's principles before acting, and
`/afk:ship` calls `/afk:reflect` to persist learnings afterward.

```
/afk:init-brain  Scaffold the brain/ vault in a project (optional — the vault
                 is also created on demand the first time something writes to it).

/afk:brain       Read or write the vault directly.

/afk:reflect     Capture this session's learnings into the brain. Most brain
                 content comes from here.

/afk:ruminate    Mine past Claude Code conversations for patterns reflect missed.

/afk:meditate    Audit and prune the vault; distill cross-cutting principles.

/afk:plan        Break a medium-to-large task into phased, principle-grounded
                 plans under brain/plans/. Planning only.

/afk:review      Principle-grounded review of code or plans, ending in a verdict.
                 Review only — no changes.
```

The brain skills and hooks are derived from
[brainmaxxing](https://github.com/poteto/brainmaxxing) by Lauren Tan (MIT) and
rewritten to AFK's skill conventions.

AFK also ships two Claude Code subagents for implementation:

- `afk:implement-orchestrator`: read-only Opus planner for complex contracts,
  slice boundaries, and worker delegation.
- `afk:implementation-worker`: Sonnet worker for one bounded TDD slice with
  edit and verification tools.

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

### If the skills don't auto-trigger

AFK works by letting Claude pick a skill from its description. If a skill
doesn't fire on its own (some Claude Code versions don't auto-discover plugin
skills, and crowded installs can drop less-used ones from the listing), invoke
it directly: `/afk:help`, `/afk:prototype`, `/afk:grill`, `/afk:implement`,
`/afk:batch`, `/afk:simplify`, `/afk:qa`, `/afk:ship`,
`/afk:write-good-goal`, and the memory skills `/afk:brain`, `/afk:init-brain`,
`/afk:reflect`, `/afk:ruminate`,
`/afk:meditate`, `/afk:plan`, `/afk:review`. Run `/doctor` to check plugin
loading, and raise `skillListingBudgetFraction` in settings to keep more skill
descriptions listed.

## What lands in your repo

```
CONTEXT.md            # domain glossary, grown by /afk:grill
docs/adr/NNNN-*.md    # decisions worth recording, offered sparingly by grill
docs/plans/<slug>.md  # the agreed plan, input to /afk:implement
docs/prototypes/      # prototype verdict notes for throwaway exploration
qa/                   # QA reports + screenshots (gitignored)
brain/                # persistent memory vault: principles, gotchas, plans
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
- The `brain/` memory vault — its skills (`brain`, `init-brain`, `reflect`,
  `ruminate`, `meditate`, `plan`, `review`) and hooks — is derived from
  [brainmaxxing](https://github.com/poteto/brainmaxxing) by Lauren Tan (MIT),
  rewritten to AFK's skill conventions.
