#!/usr/bin/env bash
# PostToolUse hook: regenerate .afk/brain/index.md whenever a brain file is
# written or edited. Fast-exits when the touched file is not in the brain.
set -euo pipefail

input="$(cat)"
case "$input" in
  *".afk/brain/"*) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
BRAIN="$PROJECT_DIR/.afk/brain"
[ -d "$BRAIN" ] || exit 0

{
  echo "# AFK Brain Index"
  echo
  (cd "$BRAIN" && find . -name '*.md' ! -name 'index.md' | sed 's|^\./||' | sort | while read -r f; do
    echo "- [[${f%.md}]]"
  done)
} > "$BRAIN/index.md"

exit 0
