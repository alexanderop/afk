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
5. Agentic QA           ── AFK  ──  drives the real surface: browser, API, or CLI
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

The plugin's hooks emit Copilot's output format too, but Copilot CLI has a known bug where plugin-shipped hooks are listed at startup yet never execute ([copilot-cli#2540](https://github.com/github/copilot-cli/issues/2540)). Two backstops cover this: `/afk:setup` embeds the ticket-sizing gate in your project's CLAUDE.md (which Copilot reads in every session), and you can load the `using-afk` skill manually — type `/` and pick it from the skill list — to inject the full bootstrap.

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
| `/afk:setup` | Audits & fixes backpressure, records the project's QA surface, crafts a lean WHAT/WHY/HOW CLAUDE.md, stands up the `.afk/brain/` knowledge vault |
| `/afk:spec` | Interview-mode PRD — AI asks, you answer, one question at a time |
| `/afk:slice` | PRD → vertical slice tickets (UI + API + test, each shippable) |
| `/afk:ralph` | Fresh-context TDD subagent loop per slice, with independent spec review |
| `/afk:refactor-pass` | Dedicated cleanup pass: duplication, dead code, type holes |
| `/afk:qa` | Walks happy + negative paths from the spec on the project's real surface — agent-browser for UIs, curl for pure APIs, real invocations for CLIs — evidence-backed report |
| `/afk:review` | Risk-tiered review: security/quality/performance/docs specialists + judge pass |
| `/afk:pipeline` | The meta-skill — runs all of the above end to end |
| `/afk:reflect` | Banks learnings: lint rule → script → CLAUDE.md → `.afk/brain/` note → skip |

## Customizing for your team

Both extension points live in **your repo**, versioned with the code and shared
by everyone on the team — no plugin fork, no reinstall.

**Custom reviewers.** Drop specialist definitions in `.afk/reviewers/*.md` and
`/afk:review` dispatches them alongside the built-in four. Frontmatter scopes
them — `paths` globs decide *when* they run (e.g. only when the diff touches
`*.vue` files), `tier` decides at which review tier:

```markdown
---
name: vue-reviewer
description: Vue SFC patterns, composables misuse, reactivity leaks
paths: ["**/*.vue", "**/composables/**"]
tier: lite
---
You review Vue code only. Flag: props mutation, watchers that should be
computed, ... Do NOT flag: ...
```

The shared severity rubric and output format are appended automatically (and
win any conflict with the body), and the coordinator's judge pass verifies
their findings like everyone else's — a noisy team reviewer gets filtered, not
obeyed, and every finding it produces is tagged with the reviewer's name so you
can tune the file behind it. Keep bodies short (~100 lines) and put
mechanically checkable rules in your linter, not in a prompt.

**Pipeline hooks.** Skills that already live in your repo (say, a `figma-sync`
skill under `.claude/skills/`) can be wired into the pipeline via
`.afk/config.json`:

```json
{
  "pipeline": {
    "hooks": {
      "after-slice": [{ "skill": "figma-sync", "blocking": true }]
    }
  }
}
```

Boundaries: `after-spec`, `after-slice`, `after-implement`, `after-refactor`,
`after-qa`, `after-review`, `before-pr`. Blocking hooks pause the run on any
failure — including the hook erroring out; they never fail open. Non-blocking
failures are logged and reported in the PR handoff.
Hooks from `after-implement` onward must run without user input — they fire
while you're AFK. Unresolvable hook skills fail the phase-0 gate loudly
instead of being skipped mid-run.

For assets shared across many repos, publish a companion plugin on your own
marketplace instead of copy-pasting `.afk/` files around.

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

## Actually going AFK: permissions

The pipeline promises "no questions between slice approval and the PR" — but a
default harness session stops at every permission prompt, which defeats the
point. Decide your permission posture **before** the first run:

- **Allowlist (recommended for teams).** Put the project's own commands in the
  repo's `.claude/settings.json` (`permissions.allow`): the test/lint/typecheck/
  dev commands from `.afk/config.json`, plus `git` and your package manager.
  The run then only pauses on genuinely unusual actions. Committed settings
  mean the whole team shares the same posture.
- **`--permission-mode acceptEdits`** auto-approves file edits but still gates
  shell commands — pair it with the allowlist above.
- **Full bypass only in isolation.** `--dangerously-skip-permissions` (Copilot
  CLI: `--allow-all-tools`) is acceptable inside a devcontainer/VM with nothing
  to lose and no production credentials — never on a developer machine with
  your real keychain and dotfiles.

Two prompts the allowlist can't cover by design: `git push` and opening the PR.
Either allow them deliberately or treat the open-PR step as your "I'm back"
checkpoint.

Parallel slices raise the bar: when `afk:ralph` runs implementers concurrently,
they run as background subagents, and background subagents **auto-deny** any
permission prompt instead of asking — the slice keeps going half-broken. If you
plan to parallelize, the allowlist isn't optional.

One environment-variable gotcha: `CLAUDE_CODE_SUBAGENT_MODEL` overrides the
model pinned in every afk agent definition (the implementer's `sonnet`, the
docs-reviewer's `haiku`). If it's set in your shell, every subagent in the run
silently uses that model instead — unset it for pipeline runs unless that's
deliberate.

## What a run costs

Be honest with your team about the bill before the first big run: phase 3
dispatches one fresh implementer subagent per slice (up to 150 turns each) plus
an independent spec reviewer per slice; refactoring and QA run as forked
contexts; review fans out 2–6 specialist agents plus a judge pass; failed QA or
review adds capped fix cycles on top. A 4-slice feature is easily an
order of magnitude more tokens than an interactive session — that's the trade:
agent tokens are cheap, your evening is not. Start with smaller features and
let the run logs (`.afk/pipeline/<slug>.md` records every cycle) calibrate your
expectations.

## Rolling it out to a team

Don't lead with the full pipeline — trust is built per phase, and every skill
works standalone:

1. **Review first** (`/afk:review` on human-written branches). Zero risk, and
   the team immediately sees the noise-filtered, judge-verified findings. Tune
   `.afk/reviewers/` until the team trusts the output.
2. **Spec + slice next** (`/afk:spec`, `/afk:slice`). The interview and the
   slice cut are useful even when humans implement — and they teach the team
   what a pipeline-ready ticket looks like.
3. **First supervised pipeline run.** Pick a real but low-stakes 5-pointer,
   watch it go, read every artifact it leaves behind.
4. **Then go AFK.** By now the team knows what the artifacts mean, what a
   blocked slice looks like, and where the human attention belongs.

Projects that shouldn't get the bootstrap at all (a repo where afk makes no
sense) can opt out without uninstalling: set `"enabled": false` in that repo's
`.afk/config.json`.

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
.afk/config.json          # check commands + QA mode + backpressure + optional pipeline hooks
.afk/brain/               # docs + memory vault — how-tos and learnings, auto-indexed
.afk/reviewers/           # optional: team-authored custom reviewers, joined into /afk:review
.afk/pipeline/<slug>.md   # resumable pipeline state        (gitignored)
docs/specs/prd-*.md       # PRDs
docs/tickets/NN-*.md      # slice tickets (checkboxes = progress)
qa/*.md + qa/evidence/    # QA + review reports, screenshots/transcripts (gitignored)
```

Everything is plain markdown on disk — a dead session resumes from the files,
and humans can read every artifact the agents produced. Setup writes the
commit policy into `.gitignore`: config, brain, and reviewers are the team's
shared assets and get committed; per-run state and QA evidence stay local
(their verdicts are inlined into the PR body instead). Delete the `qa/`
gitignore line if your team wants the evidence trail in the repo.

## Testing the plugin

The test suite (modeled on superpowers) runs real headless Claude Code
sessions against the working tree and asserts on the transcript — see
[tests/README.md](tests/README.md):

```bash
tests/hooks/run-hook-tests.sh          # zero-token: hook JSON output + brain indexing
tests/parity/run-parity-tests.sh       # feature × harness matrix: skills, agents,
                                       # hooks, CLAUDE.md backstop on Claude Code
                                       # AND Copilot CLI (skips uninstalled harnesses)
tests/skill-triggering/run-all.sh      # naive prompts trigger the right skill,
                                       # and a typo fix does NOT enter the pipeline
tests/claude-code/run-skill-tests.sh   # fast behavioral checks on skill content
```

The hook tests are pure bash — run them on every edit. The other suites make
real LLM calls (tokens + a few minutes) — use them as a pre-release check.
The parity suite is the cross-harness guard: it asserts the same skills,
agents, and sizing-gate bootstrap work on every harness afk supports.

## Credits

Patterns borrowed with gratitude from
[obra/superpowers](https://github.com/obra/superpowers) (skill structure,
red-flags tables, subagent prompt templates),
[poteto/brainmaxxing](https://github.com/poteto/brainmaxxing) (memory vault +
structural-enforcement-first routing), and Cloudflare's
[Orchestrating AI Code Review at scale](https://blog.cloudflare.com/) (risk
tiers, specialist reviewers, what-NOT-to-flag prompting).
