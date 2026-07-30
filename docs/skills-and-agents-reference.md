# AFK Skills & Agents Reference

This is the **options reference** for AFK's two building blocks: skills and
agents. It lists every frontmatter field each one supports, which are mandatory
vs optional, how AFK uses them, and — importantly — which options are silently
ignored or unreliable in AFK's plugin context so you don't reach for them by
mistake.

For authoring *style* (voice, section shape, description wording), see
[skill-writing-guide.md](./skill-writing-guide.md). This doc is about *what
knobs exist and when to turn them*. Most of the invariants below are enforced by
the zero-token lint in `tests/unit/` (`skills.test.ts`, `agents.test.ts`).

## Skills vs agents — pick the right one

- **Skill** = process instructions that load into the **current** conversation
  when the user's intent matches the description. No separate model, no separate
  context. Skills are AFK's entrypoints (`grill`, `implement`, `qa`, …).
- **Agent (subagent)** = a separate worker with its **own** context window,
  model, and tool set, invoked via the `Agent` tool. Returns only its final
  message to the caller. AFK uses two: `implement-orchestrator` and
  `implementation-worker`.

Rule of thumb: reach for a skill to guide the main agent; reach for an agent
when you need isolation, a different model tier, or restricted tools.

---

## Skills

A skill is a directory under `skills/<name>/` with a `SKILL.md`. The frontmatter
is YAML between two `---` lines.

### Frontmatter fields

| Field | Required | Value | AFK use |
|-------|----------|-------|---------|
| `name` | **yes** | lowercase letters/numbers/hyphens, ≤ 64 chars, must match the directory name, no XML tags, not "anthropic"/"claude" | every skill |
| `description` | **yes** | non-empty, ≤ 1024 chars, no XML tags; starts with `Use when` (AFK convention) | every skill |
| `context` | no | `fork` | `qa`, `simplify` |
| `allowed-tools` | no | comma list of tools the skill may use | unused |
| `model` | no | `opus`/`sonnet`/`haiku`/`fable`/`inherit` | unused |
| `license`, `metadata`, `disable-model-invocation` | no | — | unused |

The lint allow-lists exactly these keys. A typo (`contxt:`) or an invented field
(`tags:`) fails the build rather than being silently dropped at load time.

### `description` is the trigger — write it as one

Skills fire on the LLM's reasoning over the description alone. Two practical
consequences:

- **Be directive, add a negative constraint.** Controlled testing shows
  directive descriptions ("…do not edit directly, load this skill first") fire
  far more reliably than passive ones that only name a trigger. `implement`'s
  description ends with exactly such a constraint so the agent routes instead of
  editing on its own.
- **Don't let two skills claim the same phrase.** Overlapping triggers make
  activation nondeterministic. `qa` says "ship/no-ship call on a specific
  change" while `ship` owns the full-flow "ship/no-ship" verdict, so a bare
  "can this ship?" doesn't fire both.

### `context: fork` — isolate task-shaped skills only

`context: fork` runs the skill in a forked subagent context: its verbose
intermediate work (large reads, parallel sub-scouts) stays out of the main
transcript and only a summary returns.

- **Use it** for *task-shaped* skills that produce one artifact/summary the
  parent needs: `qa` (evidence gathering), `simplify` (four parallel reviewers →
  aggregated cleanup).
- **Do NOT use it** for *interactive* skills. `grill` interviews the user one
  question at a time and waits for answers — a one-shot fork would break that
  back-and-forth. `help` and `write-good-goal` are short/conversational too.

The lint asserts `qa` keeps `context: fork` and validates any `context:` value
against the supported set.

---

## Agents (subagents)

An agent is a markdown file under `agents/<name>.md` with YAML frontmatter.

### Frontmatter fields

| Field | Required | Value | Status in AFK |
|-------|----------|-------|---------------|
| `name` | **yes** | same rules as skill names; must match the filename | used |
| `description` | **yes** | non-empty, ≤ 1024 chars, no XML tags; `Use when …` | used |
| `tools` | optional* | comma list from `Read, Glob, Grep, Agent, Bash, Edit, Write` | used (least-privilege) |
| `disallowedTools` | no | comma list; applied before `tools` resolves | orchestrator (defense-in-depth) |
| `model` | optional* | `opus`/`sonnet`/`haiku`/`fable`/`inherit` | used (pinned tiers) |
| `color` | no | display color | used |
| `skills` | no | skills to preload into the subagent at startup | candidate |
| `isolation` | no | `worktree` for an isolated git worktree | candidate (see below) |
| `permissionMode` | no | permission mode | **ignored** (plugin) |
| `mcpServers` | no | MCP servers for the subagent | **ignored** (plugin) |
| `hooks` | no | lifecycle hooks scoped to the subagent | **ignored** (plugin) |
| `maxTurns` | no | turn cap | **unreliable** (not enforced on subagents) |
| `background` | no | always run as a background task | **avoid** (see below) |
| `memory` | no | `user`/`project`/`local` persistent memory | **avoid** (see below) |
| `effort` | no | `low`…`max` reasoning effort | **unreliable** |
| `initialPrompt` | no | first user turn when run as a main session | n/a |

\* `tools` and `model` are optional in Claude Code generally, but AFK's lint
**requires** them on the two named agents — see "Pin the tier, pin the tools".

### The plugin constraint: three fields are silently ignored

Because AFK ships its agents inside a plugin, Claude Code **drops `hooks`,
`mcpServers`, and `permissionMode`** from plugin subagents for security. Setting
`permissionMode: plan` on the orchestrator looks like hardening but is a no-op
at runtime — a false sense of enforcement. If you genuinely need any of these on
an agent, that agent must live as a project agent under `.claude/agents/`, not
in the plugin.

(Session-wide hooks are a separate mechanism from per-agent frontmatter, set via
a plugin-level `hooks/hooks.json`. AFK ships two there for the brain vault — a
SessionStart hook that injects `brain/index.md` and a PostToolUse hook that
re-indexes on `brain/` writes. See `hooks/hooks.json`.)

### Pin the tier, pin the tools

AFK's core design is an **Opus lead + Sonnet worker** split (a read-only planner
that decides architecture, edit-capable workers that execute bounded TDD
slices). Two omission hazards make that fragile, so the lint forbids both:

- Omitting `model:` makes the agent inherit the user's default tier (possibly
  Haiku). `implement-orchestrator` must declare `model: opus`;
  `implementation-worker` must declare `model: sonnet`.
- Omitting `tools:` makes the agent inherit **all** tools — which would hand the
  read-only orchestrator `Edit`/`Write`/`Bash` and erase the guarantee. Both
  named agents must declare an explicit `tools` allowlist.

`disallowedTools` is belt-and-suspenders: the orchestrator lists
`disallowedTools: Edit, Write, Bash` so the read-only intent survives even if
its `tools` line is later broadened. The lint checks `disallowedTools` values
are real tools and don't overlap `tools`.

Prefer the `opus`/`sonnet` **aliases** over pinned model ids (`claude-opus-4-8`):
aliases track the current top tier and age well across the Claude Code versions
AFK ships to.

### Options that look useful but aren't (yet)

These are plugin-viable in principle but not worth adopting today:

- **`maxTurns`** — not reliably enforced on subagents; agents have overrun the
  cap and still reported success. Use a structural brake instead (tight slice,
  exact verification command, the orchestrator's two-failures-then-escalate
  rule).
- **`background: true`** — background subagents auto-deny any tool call that
  would otherwise prompt, so a worker's `Bash` verification can fail silently.
  AFK's synchronous review-each-result model is the safety mechanism.
- **`memory`** — introduces hidden repo state outside the checked-in markdown
  (against "the markdown is the product"), and subagent memory is siloed so it
  can't even act as a cross-slice channel. Pass context explicitly in each
  brief.
- **`effort`** — per-subagent support has been incomplete; the orchestrator is
  already on Opus, which carries the reasoning budget.

Re-evaluate these as Claude Code evolves; verify behavior on your installed
version before trusting any of them.

### Candidates worth considering

- **`skills: [tdd]`** preload — injects a skill's full body into the worker at
  spawn, so the red-green-refactor loop lives in one canonical place instead of
  being re-pasted into every brief ("pointers over copies"). Verify the preload
  actually fires for plugin agents before relying on it.
- **`isolation: worktree`** — gives each worker an auto-cleaned git worktree,
  mechanically preventing two workers from touching the same file. Fits
  *genuinely independent* parallel slices only, and requires a lead-owned merge
  step afterward (the read-only orchestrator can't merge). Not a default; AFK
  already solves same-file contention with the freeze-then-fan-out recipe.

### How AFK's two agents are configured

| | `implement-orchestrator` | `implementation-worker` |
|---|---|---|
| `model` | `opus` | `sonnet` |
| `tools` | `Read, Glob, Grep, Agent` | `Read, Edit, Write, Bash, Grep, Glob` |
| `disallowedTools` | `Edit, Write, Bash` | — |
| role | read-only architecture, contracts, slice boundaries, worker review | one bounded local TDD slice, edit + verify |

---

## What the lint enforces

The unit suite (`tests/unit/skills.test.ts`, `tests/unit/agents.test.ts`)
validates, with zero tokens, on every edit:

- required fields present; only allow-listed frontmatter keys;
- `name` charset/length/reserved-word/XML-tag rules; `description` length and
  XML-tag rules;
- skill `context` value supported; `qa` keeps `context: fork`;
- named agents pin `model` (opus/sonnet) and declare `tools`;
  `disallowedTools` valid and non-overlapping;
- the orchestrator excludes write/shell tools; the worker includes them.

If you adopt a new option from this doc, add it to the relevant allow-list (and,
where it's an invariant, a matching assertion) in that file.

## Sources

Anthropic's multi-agent research-system write-up and Skills best-practices, the
Claude Code sub-agents / skills / plugins docs, and field reports on skill
triggering and orchestration patterns. See the audit that produced these notes
for the full citation list.
