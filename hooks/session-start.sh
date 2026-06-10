#!/usr/bin/env bash
# SessionStart hook: inject the using-afk bootstrap skill so the agent knows
# the ticket-sizing gate and the pipeline before it sees any user input.
# Also injects the project's AFK brain index if one exists.
set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"

content="$(cat "$PLUGIN_ROOT/skills/using-afk/SKILL.md")"

brain_index="$PROJECT_DIR/.afk/brain/index.md"
if [ -f "$brain_index" ]; then
  content="$content

# AFK Brain (project memory)

This project has an AFK brain at .afk/brain/ — learnings from past pipeline runs.
Read the linked notes that are relevant before acting.

$(cat "$brain_index")"
fi

# JSON-escape: jq when available (handles every control char), manual fallback.
if command -v jq >/dev/null 2>&1; then
  json_content="$(printf '%s' "$content" | jq -Rs .)"
else
  escaped=${content//\\/\\\\}
  escaped=${escaped//\"/\\\"}
  escaped=${escaped//$'\n'/\\n}
  escaped=${escaped//$'\t'/\\t}
  escaped=${escaped//$'\r'/\\r}
  json_content="\"$escaped\""
fi

# Dual-format output: Claude Code reads hookSpecificOutput.additionalContext,
# Copilot CLI reads the top-level additionalContext key. Each ignores the other.
printf '{"additionalContext":%s,"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":%s}}\n' "$json_content" "$json_content"
