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
SKILL_NAME_REGEX='^[a-z0-9]+(-[a-z0-9]+)*$'
REQUIRED_SKILL_SECTIONS="## When to Use
## Process
## Stop and Ask
## Output"

skill_names() {
  for skill in "$PLUGIN_DIR"/skills/*/SKILL.md; do
    basename "$(dirname "$skill")"
  done | sort
}

VALID_SKILLS="$(skill_names)"

has_skill() {
  printf '%s\n' "$VALID_SKILLS" | grep -Fxq "$1"
}

resolve_file_ref() {
  local src="$1" ref="$2" src_dir candidate

  case "$ref" in
    http://*|https://*|mailto:*|\#*|'')
      return 0
      ;;
  esac

  # Drop anchors and query strings from markdown links.
  ref="${ref%%#*}"
  ref="${ref%%\?*}"

  src_dir="$(dirname "$src")"
  for candidate in "$src_dir/$ref" "$PLUGIN_DIR/$ref"; do
    if [ -f "$candidate" ] || [ -d "$candidate" ]; then
      return 0
    fi
  done

  return 1
}

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

echo ""
echo "eval specs:"

if [ -d "$PLUGIN_DIR/evals" ]; then
  while IFS= read -r eval_json; do
    rel="${eval_json#"$PLUGIN_DIR"/}"
    base="$(basename "$eval_json")"
    eval_skill="$(basename "$(dirname "$eval_json")")"

    if jq -e . "$eval_json" >/dev/null 2>&1; then
      pass "$rel is valid JSON"
    else
      fail "$rel is valid JSON"
      continue
    fi

    if has_skill "$eval_skill"; then
      pass "$rel belongs to an existing skill"
    else
      fail "$rel belongs to an existing skill" "$eval_skill"
    fi

    case "$base" in
      evals.json)
        declared_skill="$(jq -r '.skill_name // empty' "$eval_json")"
        if [ "$declared_skill" = "$eval_skill" ]; then
          pass "$rel skill_name matches directory"
        else
          fail "$rel skill_name matches directory" "skill_name=${declared_skill}, dir=${eval_skill}"
        fi

        if jq -e '(.evals | type == "array") and (.evals | length > 0)' "$eval_json" >/dev/null; then
          pass "$rel has at least one eval"
        else
          fail "$rel has at least one eval"
        fi

        if jq -e '
          .evals | all(
            (.id | type == "string" and length > 0) and
            (.prompt | type == "string" and length > 0) and
            (.expected_output | type == "string" and length > 0) and
            (.expectations | type == "array" and length > 0) and
            (.expectations | all(type == "string" and length > 0)) and
            ((.assertions.required_substrings // []) | all(type == "string" and length > 0)) and
            ((.assertions.forbidden_substrings // []) | all(type == "string" and length > 0)) and
            ((.assertions.required_files // []) | all(type == "string" and length > 0)) and
            ((.assertions.required_file_substrings // {}) | type == "object")
          )
        ' "$eval_json" >/dev/null; then
          pass "$rel eval entries have required fields"
        else
          fail "$rel eval entries have required fields"
        fi
        ;;
      triggers.json)
        if jq -e '
          type == "array" and length > 0 and all(
            (.query | type == "string" and length > 0) and
            (.should_trigger | type == "boolean")
          )
        ' "$eval_json" >/dev/null; then
          pass "$rel trigger entries have required fields"
        else
          fail "$rel trigger entries have required fields"
        fi
        ;;
      *)
        fail "$rel has recognized eval filename" "$base"
        ;;
    esac
  done < <(find "$PLUGIN_DIR/evals" -name '*.json' -type f | sort)
else
  fail "evals directory exists"
fi

# --- frontmatter -------------------------------------------------------------

# check_frontmatter <file> <expected-name> <label>
check_frontmatter() {
  local file="$1" expected_name="$2" label="$3"
  local fm desc actual_name body section

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

  actual_name="$(printf '%s\n' "$fm" | grep '^name:' | sed 's/^name:[[:space:]]*//')"
  if [ "$actual_name" = "$expected_name" ]; then
    pass "$label: name matches '${expected_name}'"
  else
    fail "$label: name matches '${expected_name}'" \
      "$(printf '%s\n' "$fm" | grep '^name:' || echo 'no name: line')"
  fi

  if [[ "$actual_name" =~ $SKILL_NAME_REGEX ]]; then
    pass "$label: name is lowercase kebab-case"
  else
    fail "$label: name is lowercase kebab-case" "$actual_name"
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

  if [[ "$desc" == Use\ when* ]]; then
    pass "$label: description starts with 'Use when'"
  else
    fail "$label: description starts with 'Use when'" "$desc"
  fi

  body="$(awk 'NR == 1 && $0 == "---" { in_fm = 1; next }
    in_fm && $0 == "---" { in_fm = 0; seen_body = 1; next }
    seen_body { print }' "$file")"
  if [ -n "$(printf '%s' "$body" | tr -d '[:space:]')" ]; then
    pass "$label: SKILL.md has body content"
  else
    fail "$label: SKILL.md has body content"
  fi

  while IFS= read -r section; do
    [ -z "$section" ] && continue
    if grep -Fxq "$section" "$file"; then
      pass "$label: required section '$section' exists"
    else
      fail "$label: required section '$section' exists"
    fi
  done <<EOF
$REQUIRED_SKILL_SECTIONS
EOF
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

echo ""
echo "markdown links:"

LINKS_OK=1
while IFS= read -r markdown_file; do
  # Template placeholders are intentionally non-resolving examples.
  case "$markdown_file" in
    "$PLUGIN_DIR/docs/templates/"*) continue ;;
  esac

  while IFS= read -r ref; do
    [ -z "$ref" ] && continue
    if ! resolve_file_ref "$markdown_file" "$ref"; then
      fail "dead markdown link in ${markdown_file#"$PLUGIN_DIR"/}: $ref"
      LINKS_OK=0
    fi
  done < <(awk 'BEGIN { code = 0 }
    /^```/ { code = !code; next }
    !code { print }' "$markdown_file" | \
    grep -oE '\[[^]]+\]\([^)]+\)' | \
    sed -E 's/^[^()]*\(([^)]+)\)$/\1/' | \
    grep -E '\.md($|#|\?)' || true)
done < <(find "$PLUGIN_DIR" \
  \( -path "$PLUGIN_DIR/.git" -o -path "$PLUGIN_DIR/.claude" \) -prune -o \
  -name '*.md' -type f -print)

if [ "$LINKS_OK" -eq 1 ]; then
  pass "all markdown links resolve"
fi

# --- skill catalog and references ---------------------------------------------

echo ""
echo "skill catalog:"

README_SKILLS_OK=1
while IFS= read -r skill_ref; do
  [ -z "$skill_ref" ] && continue
  if has_skill "$skill_ref"; then
    pass "README skill '/afk:${skill_ref}' exists"
  else
    fail "README skill '/afk:${skill_ref}' exists"
    README_SKILLS_OK=0
  fi
done < <(grep -oE '/afk:[a-z0-9-]+' "$PLUGIN_DIR/README.md" | sed 's#^/afk:##' | sort -u)
[ "$README_SKILLS_OK" -eq 1 ] || true

CSV_SKILLS_OK=1
while IFS= read -r skill_ref; do
  [ -z "$skill_ref" ] && continue
  skill_name="${skill_ref#afk:}"
  if has_skill "$skill_name"; then
    pass "help catalog skill '${skill_ref}' exists"
  else
    fail "help catalog skill '${skill_ref}' exists"
    CSV_SKILLS_OK=0
  fi
done < <(tail -n +2 "$PLUGIN_DIR/skills/help/afk-help.csv" | cut -d, -f1)
[ "$CSV_SKILLS_OK" -eq 1 ] || true

ALL_SKILL_REFS_OK=1
while IFS= read -r ref; do
  [ -z "$ref" ] && continue
  skill_name="${ref#afk:}"
  skill_name="${skill_name#/afk:}"
  if has_skill "$skill_name"; then
    :
  else
    fail "skill reference '${ref}' points to an existing skill"
    ALL_SKILL_REFS_OK=0
  fi
done < <(grep -RhoE '(/?afk:)[a-z0-9-]+' "$PLUGIN_DIR/README.md" "$PLUGIN_DIR/docs" "$PLUGIN_DIR/skills" | sort -u)

if [ "$ALL_SKILL_REFS_OK" -eq 1 ]; then
  pass "all afk: skill references resolve"
fi

# --- marketplace consistency --------------------------------------------------

echo ""
echo "marketplace:"

PLUGIN_NAME="$(jq -r '.name // empty' "$PLUGIN_DIR/.claude-plugin/plugin.json")"
PLUGIN_VERSION="$(jq -r '.version // empty' "$PLUGIN_DIR/.claude-plugin/plugin.json")"
MARKETPLACE_NAME="$(jq -r '.name // empty' "$PLUGIN_DIR/.claude-plugin/marketplace.json")"
MARKETPLACE_PLUGIN_NAME="$(jq -r '.plugins[0].name // empty' "$PLUGIN_DIR/.claude-plugin/marketplace.json")"
MARKETPLACE_PLUGIN_SOURCE="$(jq -r '.plugins[0].source // empty' "$PLUGIN_DIR/.claude-plugin/marketplace.json")"

if [ "$MARKETPLACE_NAME" = "$PLUGIN_NAME" ] && [ "$MARKETPLACE_PLUGIN_NAME" = "$PLUGIN_NAME" ]; then
  pass "marketplace plugin name matches plugin.json"
else
  fail "marketplace plugin name matches plugin.json" \
    "plugin.json=${PLUGIN_NAME}, marketplace=${MARKETPLACE_NAME}, plugin entry=${MARKETPLACE_PLUGIN_NAME}"
fi

if [ "$MARKETPLACE_PLUGIN_SOURCE" = "./" ]; then
  pass "marketplace plugin source points at repository root"
else
  fail "marketplace plugin source points at repository root" "$MARKETPLACE_PLUGIN_SOURCE"
fi

if [ -n "$PLUGIN_VERSION" ]; then
  pass "plugin.json has version anchor (${PLUGIN_VERSION})"
else
  fail "plugin.json has version anchor"
fi

# --- summary ----------------------------------------------------------------

echo ""
echo "Passed: $PASSED  Failed: $FAILED"
[ "$FAILED" -eq 0 ]
