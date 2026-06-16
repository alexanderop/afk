# afk — a simple coding flow for Claude Code

One help router, one optional end-to-end orchestrator, focused workflow skills,
a packaged implementation agent pair, and a persistent `brain/` memory vault the
flow reads before acting and writes back to as it learns. Just the steps that
matter.

**Full documentation: https://alexanderop.github.io/afk/**

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

## Skills

The five-step coding flow: **grill → implement → simplify → qa → work**. Use
`/afk:ship` to drive the planning-through-verdict loop, or grab any skill
standalone. `/afk:work` is the ship-out closer for the implement path: after a
QA verdict it runs the residual-findings gate, then commits, pushes, and opens a
PR with a post-deploy monitoring plan (`/afk:ship` stops at local evidence).
`/afk:batch` is the fan-out alternative to implement: one PR per independent
unit, run in parallel worktrees. `/afk:prototype` builds a throwaway exploration
before committed planning.

The `brain/` vault skills (`init-brain`, `brain`, `reflect`, `ruminate`,
`meditate`, `plan`, `review`) keep a persistent Obsidian-compatible store of
your project's principles, gotchas, and decisions — wired into the flow
automatically.

For per-skill detail see the [Reference](https://alexanderop.github.io/afk/reference/help) section of the docs.

### If the skills don't auto-trigger

Invoke directly: `/afk:help`, `/afk:ship`, `/afk:grill`, `/afk:implement`,
`/afk:batch`, `/afk:simplify`, `/afk:qa`, `/afk:work`, `/afk:prototype`,
`/afk:write-good-goal`, `/afk:research`, and the brain skills `/afk:brain`,
`/afk:init-brain`, `/afk:reflect`, `/afk:ruminate`, `/afk:meditate`,
`/afk:plan`, `/afk:review`.
Run `/doctor` to check plugin loading.

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

See [docs/testing-strategy.md](docs/testing-strategy.md) for the full approach.

```bash
bun run test              # zero-token unit + integration checks (run on every edit)
bun run test:e2e          # one cheap headless turn (~$0.01): plugin actually loads
bun run test:evals        # model-backed behavioral evals via claude -p
```

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
