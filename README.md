# afk — AFK Coding Pipeline for Claude Code

A Claude Code plugin that makes the AFK coding pipeline the path of least
resistance: **human judgment at the edges, agent execution in the middle.**
You align on the spec, the agents ship it, you review the PR.

Built for developers who haven't yet found a good workflow with AI coding
agents. Install it, and the failure modes that ruin big AI-built features —
context overflow, skipped tests, never-happening refactors, unreviewed
slop — get caught by the pipeline instead of by your users.

## The pipeline

```
1. Align on spec        ── HITL ──  AI interviews YOU, writes the PRD
2. Slice the ticket     ── HITL ──  vertical slices, you approve the cut
3. Implement per slice  ── AFK  ──  fresh-context TDD loop + spec review per slice
4. Refactor pass        ── AFK  ──  the step LLMs always skip
5. Agentic QA           ── AFK  ──  agent-browser drives the real UI
6. Review               ── AFK  ──  risk-tiered multi-agent review
7. PR + handoff         ── HITL ──  you review, business does UAT
```

Small tickets (1–3 points) skip all of this — the plugin's session-start
bootstrap teaches Claude to size the ticket first and only reach for the
pipeline at 5 points and up.

## Install

Installation differs by harness: [Claude Code](#claude-code) or [GitHub Copilot CLI](#github-copilot-cli). If you use both, install afk separately for each one.

### Claude Code

Prerequisite: [Claude Code](https://code.claude.com/docs/en/quickstart) installed and authenticated. If `/plugin` doesn't exist in your session, update Claude Code first.

**1. Add this repo as a plugin marketplace** (one-time, inside any Claude Code session):

```
/plugin marketplace add alexanderop/afk
```

**2. Install the plugin:**

```
/plugin install afk@afk
```

**3. Verify it's loaded** — run `/help`; you should see the skills listed under the `afk:` namespace. The session-start bootstrap (ticket sizing + skill routing) is active from your next session onward.

**4. First run in a project:**

```
/afk:setup
```

Updates ship via the marketplace: `/plugin marketplace update afk`.

### GitHub Copilot CLI

Copilot CLI reads the same plugin format. In your terminal:

**1. Add this repo as a plugin marketplace** (one-time):

```bash
copilot plugin marketplace add alexanderop/afk
```

**2. Install the plugin:**

```bash
copilot plugin install afk@afk
```

**3. Verify it's loaded:**

```bash
copilot plugin list
```

Skills written for afk use Claude Code tool names; Copilot CLI maps them automatically via `skills/using-afk/references/copilot-tools.md`. Update later with `copilot plugin update afk`.

One difference: the ticket-sizing bootstrap is injected by a Claude Code SessionStart hook. If your Copilot session doesn't show the sizing gate, load the `using-afk` skill once at the start of the session — it's the same content.

### Try it without installing

```bash
git clone https://github.com/alexanderop/afk
claude --plugin-dir ./afk
```

This loads the plugin for that session only — useful for kicking the tires or hacking on the plugin itself (edit + `/reload-plugins` to pick up changes).

## Quickstart

In any project:

```
/afk:setup                      # one-time: backpressure audit (tests, lint, types)
/afk:pipeline build a multi-step booking wizard
```

Claude interviews you for the spec, proposes vertical slices, and after your
approval runs implementation, refactoring, QA, and review without you —
then opens a PR with the QA and review reports attached.

## Skills

| Skill | What it does |
|-------|--------------|
| `/afk:setup` | Audits & fixes backpressure, crafts a lean WHAT/WHY/HOW CLAUDE.md, stands up the `.afk/brain/` knowledge vault |
| `/afk:spec` | Interview-mode PRD — AI asks, you answer, one question at a time |
| `/afk:slice` | PRD → vertical slice tickets (UI + API + test, each shippable) |
| `/afk:ralph` | Fresh-context TDD subagent loop per slice, with independent spec review |
| `/afk:refactor-pass` | Dedicated cleanup pass: duplication, dead code, type holes |
| `/afk:qa` | agent-browser walks happy + negative paths, screenshot-backed report |
| `/afk:review` | Risk-tiered review: security/quality/performance/docs specialists + judge pass |
| `/afk:pipeline` | The meta-skill — runs all of the above end to end |
| `/afk:reflect` | Banks learnings: lint rule → script → CLAUDE.md → `.afk/brain/` note → skip |

## How it stays safe

- **Backpressure gate**: the pipeline refuses to run AFK in a project with no
  tests — an agent without failing tests can't know it's wrong.
- **Iron laws** in every loop: no production code without a failing test first;
  never delete a failing test; never work on main.
- **Don't trust the report**: every slice gets an independent reviewer that
  reads the actual diff, not the implementer's claims.
- **Capped fix cycles**: loops that don't converge stop and report instead of
  thrashing.
- **Blocked slices get skipped, not guessed**: vertical slices survive their
  siblings; invented requirements don't ship.

## Project memory

The brain at `.afk/brain/` is the project's docs AND memory in one vault:
deliberate how-to notes (how to build, test, add a migration) plus earned
learnings (gotchas, failed approaches). CLAUDE.md points to the high-traffic
notes; the index is injected at session start and auto-reindexed on write, so
every pipeline run starts smarter than the last.

`/afk:reflect` routes session learnings with a strict hierarchy: lint rule →
script → CLAUDE.md line (universal only) → `.afk/brain/` note → skip.
Structure beats memory — a rule fires every time, a note only when read.

## What lands in your repo

```
CLAUDE.md                 # lean WHAT/WHY/HOW onboarding (~60 lines, crafted not generated)
.afk/config.json          # check commands + backpressure status
.afk/brain/               # docs + memory vault — how-tos and learnings, auto-indexed
.afk/pipeline/<slug>.md   # resumable pipeline state
docs/specs/prd-*.md       # PRDs
docs/tickets/NN-*.md      # slice tickets (checkboxes = progress)
qa/*.md + qa/screenshots/ # QA + review reports
```

Everything is plain markdown on disk — a dead session resumes from the files,
and humans can read every artifact the agents produced.

## Testing the plugin

The test suite (modeled on superpowers) runs real headless Claude Code
sessions against the working tree and asserts on the transcript — see
[tests/README.md](tests/README.md):

```bash
tests/hooks/run-hook-tests.sh          # zero-token: hook JSON output + brain indexing
tests/skill-triggering/run-all.sh      # naive prompts trigger the right skill,
                                       # and a typo fix does NOT enter the pipeline
tests/claude-code/run-skill-tests.sh   # fast behavioral checks on skill content
```

The hook tests are pure bash — run them on every edit. The other two suites
make real Claude calls (tokens + a few minutes) — use them as a pre-release
check.

## Credits

Patterns borrowed with gratitude from
[obra/superpowers](https://github.com/obra/superpowers) (skill structure,
red-flags tables, subagent prompt templates),
[poteto/brainmaxxing](https://github.com/poteto/brainmaxxing) (memory vault +
structural-enforcement-first routing), and Cloudflare's
[Orchestrating AI Code Review at scale](https://blog.cloudflare.com/) (risk
tiers, specialist reviewers, what-NOT-to-flag prompting).
