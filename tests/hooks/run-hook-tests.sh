#!/usr/bin/env bash
# Zero-token tests for the plugin's hooks: pure bash, no LLM calls.
# Safe to run on every edit, unlike the token-burning suites.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PASSED=0
FAILED=0

pass() { echo "  ✅ $1"; PASSED=$((PASSED + 1)); }
fail() { echo "  ❌ $1"; [ $# -gt 1 ] && echo "     $2"; FAILED=$((FAILED + 1)); }

json_valid() {
  if command -v jq >/dev/null 2>&1; then
    jq -e . >/dev/null 2>&1
  else
    python3 -c 'import json,sys; json.load(sys.stdin)' >/dev/null 2>&1
  fi
}

echo "=== Hook tests (no LLM, no tokens) ==="
echo ""

# --- session-start.sh -------------------------------------------------------

echo "session-start.sh:"

tmp_project="$(mktemp -d /tmp/afk-hook-test.XXXXXX)"
trap 'rm -rf "$tmp_project"' EXIT

# 1. Without a brain index: output is valid JSON with the right shape.
out="$(CLAUDE_PLUGIN_ROOT="$PLUGIN_DIR" CLAUDE_PROJECT_DIR="$tmp_project" \
  "$PLUGIN_DIR/hooks/session-start.sh")"
if printf '%s' "$out" | json_valid; then
  pass "emits valid JSON without a brain index"
else
  fail "emits valid JSON without a brain index" "$out"
fi
if printf '%s' "$out" | grep -q '"hookEventName":"SessionStart"'; then
  pass "declares the SessionStart event"
else
  fail "declares the SessionStart event"
fi
# Copilot CLI reads a top-level additionalContext key, not Claude's wrapper.
if printf '%s' "$out" | grep -q '^{"additionalContext":'; then
  pass "emits top-level additionalContext for Copilot CLI"
else
  fail "emits top-level additionalContext for Copilot CLI" "$out"
fi
case "$out" in
  *Ticket-Sizing*|*ticket-sizing*) pass "injects the sizing-gate content" ;;
  *) fail "injects the sizing-gate content" ;;
esac

# 2. With a brain index containing JSON-hostile characters: still valid JSON.
mkdir -p "$tmp_project/.afk/brain"
printf '# AFK Brain Index\n\n- [[note]] — quotes " backslash \\ percent %%s tab\there\n' \
  > "$tmp_project/.afk/brain/index.md"
out="$(CLAUDE_PLUGIN_ROOT="$PLUGIN_DIR" CLAUDE_PROJECT_DIR="$tmp_project" \
  "$PLUGIN_DIR/hooks/session-start.sh")"
if printf '%s' "$out" | json_valid; then
  pass "stays valid JSON with hostile characters in the brain index"
else
  fail "stays valid JSON with hostile characters in the brain index" "$out"
fi
case "$out" in
  *"AFK Brain"*) pass "includes the brain index when present" ;;
  *) fail "includes the brain index when present" ;;
esac

# 3. Per-project opt-out: "enabled": false in .afk/config.json silences the hook.
mkdir -p "$tmp_project/.afk"
echo '{"enabled": false}' > "$tmp_project/.afk/config.json"
out="$(CLAUDE_PLUGIN_ROOT="$PLUGIN_DIR" CLAUDE_PROJECT_DIR="$tmp_project" \
  "$PLUGIN_DIR/hooks/session-start.sh")"
if [ -z "$out" ]; then
  pass "respects the per-project opt-out (enabled: false)"
else
  fail "respects the per-project opt-out (enabled: false)" "$out"
fi
rm -f "$tmp_project/.afk/config.json"

# --- auto-index-brain.sh ----------------------------------------------------

echo ""
echo "auto-index-brain.sh:"

# 4. Fast-exits on input that doesn't touch the brain (and writes nothing).
rm -rf "$tmp_project/.afk"
echo '{"tool_input":{"file_path":"/src/app.ts"}}' | \
  CLAUDE_PROJECT_DIR="$tmp_project" "$PLUGIN_DIR/hooks/auto-index-brain.sh"
if [ ! -e "$tmp_project/.afk/brain/index.md" ]; then
  pass "fast-exits on non-brain writes"
else
  fail "fast-exits on non-brain writes"
fi

# 5. Regenerates the index with a description per note.
mkdir -p "$tmp_project/.afk/brain"
printf '# Database schema\n\nSchema conventions and how to add a migration safely.\n' \
  > "$tmp_project/.afk/brain/database-schema.md"
printf '# Empty note\n' > "$tmp_project/.afk/brain/empty-note.md"
echo "{\"tool_input\":{\"file_path\":\"$tmp_project/.afk/brain/database-schema.md\"}}" | \
  CLAUDE_PROJECT_DIR="$tmp_project" "$PLUGIN_DIR/hooks/auto-index-brain.sh"

index="$tmp_project/.afk/brain/index.md"
if [ -f "$index" ]; then
  pass "regenerates index.md on brain writes"
else
  fail "regenerates index.md on brain writes"
fi
if grep -q '\[\[database-schema\]\] — Schema conventions' "$index" 2>/dev/null; then
  pass "index lines carry the note's description"
else
  fail "index lines carry the note's description" "$(cat "$index" 2>/dev/null)"
fi
if grep -q '^\- \[\[empty-note\]\]$' "$index" 2>/dev/null; then
  pass "notes without a body get a bare link"
else
  fail "notes without a body get a bare link" "$(cat "$index" 2>/dev/null)"
fi
if ! grep -q '\[\[index\]\]' "$index" 2>/dev/null; then
  pass "index does not list itself"
else
  fail "index does not list itself"
fi

# 6. A non-brain file whose CONTENT mentions .afk/brain/ does not reindex.
#    (Path extraction needs jq; without it the substring fallback over-triggers
#    by design, so skip there.)
if command -v jq >/dev/null 2>&1; then
  rm -f "$index"
  echo '{"tool_input":{"file_path":"/src/app.ts","content":"see .afk/brain/database-schema.md"}}' | \
    CLAUDE_PROJECT_DIR="$tmp_project" "$PLUGIN_DIR/hooks/auto-index-brain.sh"
  if [ ! -e "$index" ]; then
    pass "gates on the file path, not payload content"
  else
    fail "gates on the file path, not payload content"
  fi
fi

# --- reviewer rules sync ------------------------------------------------------

echo ""
echo "reviewer rules sync (reviewer-shared.md vs agent definitions):"

# The shared rubric is hand-copied into each review specialist; drift breaks
# the judge pass's ability to consolidate findings. Assert the load-bearing
# sentences exist verbatim in all four.
SYNC_OK=1
while IFS= read -r sentence; do
  for f in skills/review/reviewer-shared.md \
           agents/security-reviewer.agent.md agents/code-quality-reviewer.agent.md \
           agents/performance-reviewer.agent.md agents/docs-reviewer.agent.md; do
    if ! grep -qF "$sentence" "$PLUGIN_DIR/$f"; then
      fail "rubric drift: '$sentence' missing from $f"
      SYNC_OK=0
    fi
  done
done <<'SENTENCES'
will cause an outage, data loss, or is exploitable
measurable regression or concrete risk in a realistic scenario
an improvement worth considering. Never blocks.
When unsure between two severities, pick the lower one
not already handled two lines up
SENTENCES
if [ "$SYNC_OK" -eq 1 ]; then
  pass "severity rubric is in sync across reviewer-shared.md and all four specialists"
fi

# --- summary ----------------------------------------------------------------

echo ""
echo "Passed: $PASSED  Failed: $FAILED"
[ "$FAILED" -eq 0 ]
