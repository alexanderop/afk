#!/usr/bin/env bash
# PostToolUse hook: regenerate .afk/brain/index.md whenever a brain file is
# written or edited. Fast-exits when the touched file is not in the brain.
# Each index line carries a short description so the injected index tells the
# agent WHEN to read a note, not just that it exists.
set -euo pipefail

input="$(cat)"

# Gate on the written file's PATH, not the whole payload — a note whose CONTENT
# merely mentions .afk/brain/ shouldn't trigger a reindex. jq extracts the path
# on Claude Code's input shape; anything else (no jq, other harnesses) falls
# back to the substring check, which can only over-trigger, never under.
path=""
if command -v jq >/dev/null 2>&1; then
  path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
fi
if [ -n "$path" ]; then
  case "$path" in
    *".afk/brain/"*) ;;
    *) exit 0 ;;
  esac
else
  case "$input" in
    *".afk/brain/"*) ;;
    *) exit 0 ;;
  esac
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
BRAIN="$PROJECT_DIR/.afk/brain"
[ -d "$BRAIN" ] || exit 0

{
  echo "# AFK Brain Index"
  echo
  (cd "$BRAIN" && find . -name '*.md' ! -name 'index.md' | sed 's|^\./||' | sort | while read -r f; do
    # Description = first non-empty, non-heading line of the note, capped.
    desc="$(awk '!/^[[:space:]]*$/ && !/^#/ { gsub(/^[[:space:]]+|[[:space:]]+$/, ""); print; exit }' "$f" 2>/dev/null | cut -c1-120)"
    if [ -n "$desc" ]; then
      echo "- [[${f%.md}]] — $desc"
    else
      echo "- [[${f%.md}]]"
    fi
  done)
} > "$BRAIN/index.md"

exit 0
