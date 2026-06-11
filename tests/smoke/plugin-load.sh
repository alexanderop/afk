#!/usr/bin/env bash
# Plugin-load smoke test: one cheap headless turn (~$0.01) asserting the
# plugin actually registered. Catches what zero-token lint can't: Claude Code
# silently drops a plugin whose manifest/frontmatter/hook wiring it can't
# parse. The stream-json system/init event reports `plugins`/`plugin_errors`
# exactly for this (the headless docs bless it as a CI gate).
#
# Needs auth: subscription locally, ANTHROPIC_API_KEY in CI.
# --setting-sources project keeps user-level plugins/hooks out of the run
# without disabling the plugin's own hooks (unlike --bare).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PASSED=0
FAILED=0
pass() { echo "  ✅ $1"; PASSED=$((PASSED + 1)); }
fail() { echo "  ❌ $1"; [ $# -gt 1 ] && echo "     $2"; FAILED=$((FAILED + 1)); }

LOG="$(mktemp /tmp/afk-smoke.XXXXXX.jsonl)"
PROJECT_DIR="$(mktemp -d /tmp/afk-smoke-project.XXXXXX)"
trap 'rm -rf "$LOG" "$PROJECT_DIR"' EXIT

echo "=== Plugin-load smoke test (1 headless turn, ~\$0.01) ==="
echo ""

# Empty project dir so repo context can't interfere.
(cd "$PROJECT_DIR" && timeout 120 claude -p 'Reply with the single word: ok' \
  --plugin-dir "$PLUGIN_DIR" \
  --setting-sources project \
  --max-turns 1 \
  --output-format stream-json \
  --verbose > "$LOG" 2>/dev/null) || true

INIT="$(jq -c 'select(.type == "system" and .subtype == "init")' "$LOG" | head -1)"
if [ -n "$INIT" ]; then
  pass "headless run produced a system/init event"
else
  fail "headless run produced a system/init event" "$(tail -c 500 "$LOG")"
  echo ""
  echo "Passed: $PASSED  Failed: $FAILED"
  exit 1
fi

if printf '%s' "$INIT" | jq -e '.plugins | map(.name) | index("afk")' >/dev/null; then
  pass "afk appears in the loaded plugins list"
else
  fail "afk appears in the loaded plugins list" \
    "$(printf '%s' "$INIT" | jq -c '.plugins')"
fi

if printf '%s' "$INIT" | \
  jq -e '(.plugin_errors == null) or ((.plugin_errors | length) == 0)' >/dev/null; then
  pass "no plugin_errors reported"
else
  fail "no plugin_errors reported" "$(printf '%s' "$INIT" | jq -c '.plugin_errors')"
fi

COST="$(jq -r 'select(.type == "result") | .total_cost_usd // empty' "$LOG" | head -1)"
[ -n "$COST" ] && echo "  (cost: \$${COST})"

echo ""
echo "Passed: $PASSED  Failed: $FAILED"
[ "$FAILED" -eq 0 ]
