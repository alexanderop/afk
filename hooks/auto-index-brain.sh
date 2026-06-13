#!/bin/bash
# auto-index-brain.sh — PostToolUse hook
# Regenerates brain/index.md when brain/ files are added or removed.
# Emits bare wikilinks — no LLM-generated descriptions.

# Consume hook input
cat > /dev/null

set -euo pipefail

BRAIN_DIR="${CLAUDE_PROJECT_DIR}/brain"
INDEX="${BRAIN_DIR}/index.md"

# No brain vault yet — nothing to index. The vault is created on demand by the
# brain/reflect skills; this hook bootstraps index.md the first time content lands.
[ -d "$BRAIN_DIR" ] || exit 0

# All .md files except index.md — relative paths without .md extension
disk=$(find "$BRAIN_DIR" -name "*.md" ! -name "index.md" -type f \
    | sed "s|^${BRAIN_DIR}/||; s|\.md$||" \
    | sort)

# Only an index (or nothing) present — leave it alone
[ -z "$disk" ] && exit 0

# Wikilinks in current index (empty if the index doesn't exist yet)
indexed=""
[ -f "$INDEX" ] && indexed=$(sed -n 's/.*\[\[\([^]]*\)\]\].*/\1/p' "$INDEX" | sort)

# Exit fast if nothing changed (no new/removed files)
[ "$disk" = "$indexed" ] && exit 0

# --- Drift detected, rebuild ---

# Emit a list of bare wikilinks
emit_files() {
    while IFS= read -r f; do
        [ -z "$f" ] && continue
        echo "- [[$f]]"
    done
}

# Collect all top-level directories
dirs=$(echo "$disk" | grep '/' | sed 's|/.*||' | sort -u)

# Rebuild index
{
    echo "# Brain"
    for section in $dirs; do
        files=$(echo "$disk" | grep "^${section}\(/\|$\)" || true)
        [ -z "$files" ] && continue
        # Capitalize first letter for header (portable across BSD/GNU)
        header="$(printf '%s' "$section" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
        printf '\n## %s\n' "$header"
        echo "$files" | emit_files
    done

    # Standalone files (not in any subdirectory), excluding entrypoint files
    # whose name matches a top-level directory (e.g. principles.md alongside
    # principles/) — those are already listed under their own section.
    standalone=$(echo "$disk" | grep -v '/' || true)
    if [ -n "$dirs" ] && [ -n "$standalone" ]; then
        standalone=$(echo "$standalone" | grep -vxF "$dirs" || true)
    fi
    if [ -n "$standalone" ]; then
        printf '\n## Other\n'
        echo "$standalone" | emit_files
    fi
    echo ""
} > "$INDEX"
