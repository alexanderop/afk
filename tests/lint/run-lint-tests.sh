#!/usr/bin/env bash
# Zero-token structural lint for the plugin's markdown and manifests.
# Pure bash + jq, no LLM calls — safe to run on every edit.
#
# The product IS the markdown, so this is the unit-test layer for it:
# frontmatter shape, name/description budgets, line budgets, dead internal
# file references, and manifest validity.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PASSED=0
FAILED=0

pass() { echo "  ✅ $1"; PASSED=$((PASSED + 1)); }
fail() { echo "  ❌ $1"; [ $# -gt 1 ] && echo "     $2"; FAILED=$((FAILED + 1)); }

# Claude Code rejects skill descriptions over 1024 chars; keep headroom for
# the "afk:" prefix harnesses prepend in listings.
MAX_DESCRIPTION_CHARS=1024
# skill-creator's authoring rule: a SKILL.md past ~500 lines should split
# into references/ files instead of growing the always-loaded body.
MAX_SKILL_LINES=500

echo "=== Markdown lint (no LLM, no tokens) ==="
echo ""

# --- manifests ---------------------------------------------------------------

echo "manifests:"

if jq -e '.name and .version' "$PLUGIN_DIR/.claude-plugin/plugin.json" >/dev/null 2>&1; then
  pass "plugin.json is valid JSON with name and version"
else
  fail "plugin.json is valid JSON with name and version"
fi

for manifest in "$PLUGIN_DIR/.claude-plugin/"*.json; do
  base="$(basename "$manifest")"
  [ "$base" = "plugin.json" ] && continue
  if jq -e . "$manifest" >/dev/null 2>&1; then
    pass "$base is valid JSON"
  else
    fail "$base is valid JSON"
  fi
done

# --- frontmatter -------------------------------------------------------------

# check_frontmatter <file> <expected-name> <label>
check_frontmatter() {
  local file="$1" expected_name="$2" label="$3"
  local fm desc

  if [ "$(head -1 "$file")" != "---" ]; then
    fail "$label: frontmatter opens on line 1"
    return
  fi
  # Lines between the first and second "---".
  fm="$(awk 'NR==1{next} /^---$/{exit} {print}' "$file")"
  if ! tail -n +2 "$file" | grep -q '^---$'; then
    fail "$label: frontmatter is closed"
    return
  fi

  if printf '%s\n' "$fm" | grep -q "^name: ${expected_name}$"; then
    pass "$label: name matches '${expected_name}'"
  else
    fail "$label: name matches '${expected_name}'" \
      "$(printf '%s\n' "$fm" | grep '^name:' || echo 'no name: line')"
  fi

  desc="$(printf '%s\n' "$fm" | grep '^description:' | sed 's/^description:[[:space:]]*//')"
  if [ -n "$desc" ]; then
    pass "$label: description present"
  else
    fail "$label: description present (single-line 'description:' in frontmatter)"
    return
  fi
  if [ "${#desc}" -le "$MAX_DESCRIPTION_CHARS" ]; then
    pass "$label: description within ${MAX_DESCRIPTION_CHARS} chars (${#desc})"
  else
    fail "$label: description within ${MAX_DESCRIPTION_CHARS} chars (${#desc})"
  fi
}

echo ""
echo "skills:"
for skill in "$PLUGIN_DIR"/skills/*/SKILL.md; do
  dir_name="$(basename "$(dirname "$skill")")"
  check_frontmatter "$skill" "$dir_name" "$dir_name"
  lines="$(($(wc -l < "$skill")))"
  if [ "$lines" -le "$MAX_SKILL_LINES" ]; then
    pass "$dir_name: SKILL.md within ${MAX_SKILL_LINES} lines (${lines})"
  else
    fail "$dir_name: SKILL.md within ${MAX_SKILL_LINES} lines (${lines})" \
      "move detail into references/ files"
  fi
done

# --- internal file references --------------------------------------------------

echo ""
echo "internal file references:"

# Any skill prose mentioning a plugin-internal path must point at a file that
# exists — relative to the mentioning file, the plugin root, or any skill dir.
REFS_OK=1
while IFS=: read -r src ref; do
  [ -z "$ref" ] && continue
  src_dir="$(dirname "$src")"
  found=0
  for base in "$src_dir" "$PLUGIN_DIR" "$PLUGIN_DIR"/skills/*/; do
    if [ -f "$base/$ref" ]; then
      found=1
      break
    fi
  done
  if [ "$found" -eq 0 ]; then
    fail "dead reference in ${src#"$PLUGIN_DIR"/}: $ref"
    REFS_OK=0
  fi
done < <(grep -rnoE '(references|skills)(/[A-Za-z0-9._-]+)+\.(md|sh)' \
  "$PLUGIN_DIR/skills" --include='*.md' | \
  sed -E 's/:[0-9]+:/:/' | sort -u)
if [ "$REFS_OK" -eq 1 ]; then
  pass "all internal file references resolve"
fi

# --- summary ----------------------------------------------------------------

echo ""
echo "Passed: $PASSED  Failed: $FAILED"
[ "$FAILED" -eq 0 ]
