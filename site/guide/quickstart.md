# Quickstart

## Install inside Claude Code

Open any Claude Code session and run:

```
/plugin marketplace add alexanderop/afk
/plugin install afk@afk
```

Verify the install with `/help` — the skills appear under the `afk:` namespace
(e.g. `/afk:grill`, `/afk:implement`, `/afk:ship`).

To update later:

```
/plugin marketplace update afk
```

## Try without installing

```bash
git clone https://github.com/alexanderop/afk
claude --plugin-dir ./afk
```

This runs the plugin directly from the working tree — nothing is installed
globally.

## Prerequisites

`/afk:qa` needs Vercel's
[agent-browser](https://github.com/vercel-labs/agent-browser) CLI installed
and available on your `PATH` when it routes to frontend browser QA. Everything
else has no extra dependencies.

## If skills don't fire automatically

Some Claude Code versions don't auto-discover plugin skills, and a crowded
install can drop less-used ones from the listing. Invoke any skill directly:
`/afk:help`, `/afk:grill`, `/afk:implement`, `/afk:batch`, `/afk:simplify`,
`/afk:qa`, `/afk:ship`, and so on. Run `/doctor` to check plugin loading.

---

Next: [The AFK Flow](/concepts/the-afk-flow)
