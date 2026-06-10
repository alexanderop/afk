#!/usr/bin/env bash
# Harness-parity tests: run the same feature checks against every supported
# harness (Claude Code, Copilot CLI) and print a feature × harness matrix.
#
# Each check is one cheap headless prompt ("answer from context, no tools"),
# so a full run costs a handful of LLM calls per installed harness. Harnesses
# whose CLI is not on PATH are skipped, not failed.
#
# Known upstream bugs are tracked as WARN, not FAIL — see KNOWN_ISSUE below.
#
# Usage:
#   tests/parity/run-parity-tests.sh                # all harnesses
#   tests/parity/run-parity-tests.sh --harness copilot
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMEOUT=180

HARNESSES=(claude copilot)
if [ "${1:-}" = "--harness" ] && [ -n "${2:-}" ]; then
  HARNESSES=("$2")
fi

PASS=0; FAIL=0; WARN=0; SKIP=0
MATRIX=()  # "feature|harness|status" rows for the summary table

record() { # feature harness status detail
  local feature="$1" harness="$2" status="$3" detail="${4:-}"
  case "$status" in
    PASS) echo "  ✅ $feature"; PASS=$((PASS + 1)) ;;
    FAIL) echo "  ❌ $feature"; [ -n "$detail" ] && echo "     $detail"; FAIL=$((FAIL + 1)) ;;
    WARN) echo "  ⚠️  $feature"; [ -n "$detail" ] && echo "     $detail"; WARN=$((WARN + 1)) ;;
    SKIP) echo "  ⏭️  $feature"; [ -n "$detail" ] && echo "     $detail"; SKIP=$((SKIP + 1)) ;;
  esac
  MATRIX+=("$feature|$harness|$status")
}

# run_on <harness> <cwd> <prompt> — headless run, plugin loaded from the
# working tree. Output goes to stdout (mixed with stderr; assertions grep).
run_on() {
  local harness="$1" cwd="$2" prompt="$3"
  case "$harness" in
    claude)
      (cd "$cwd" && timeout "$TIMEOUT" claude -p "$prompt" \
        --plugin-dir "$PLUGIN_DIR" 2>&1)
      ;;
    copilot)
      (cd "$cwd" && timeout "$TIMEOUT" copilot -p "$prompt" \
        --plugin-dir "$PLUGIN_DIR" --no-color 2>&1)
      ;;
  esac
}

make_project() {
  local dir
  dir=$(mktemp -d /tmp/afk-parity.XXXXXX)
  (cd "$dir" && git init -q && git commit -q --allow-empty -m init)
  echo "$dir"
}

echo "=== Harness parity tests ==="
echo "Plugin: $PLUGIN_DIR"

for harness in "${HARNESSES[@]}"; do
  echo ""
  echo "--- $harness ---"

  if ! command -v "$harness" >/dev/null 2>&1; then
    record "harness installed" "$harness" SKIP "'$harness' not on PATH — all checks skipped"
    continue
  fi

  project="$(make_project)"

  # 1. Skills: all nine pipeline skills are discoverable by the model.
  out="$(run_on "$harness" "$project" \
    "List the names of all skills available to you, one per line, names only. Do not use any tools.")"
  missing=""
  for skill in pipeline spec slice ralph refactor-pass qa review setup reflect; do
    echo "$out" | grep -qiE "(^|[^a-z-])$skill([^a-z-]|$)" || missing="$missing $skill"
  done
  if [ -z "$missing" ]; then
    record "skills: all 9 afk skills discovered" "$harness" PASS
  else
    record "skills: all 9 afk skills discovered" "$harness" FAIL "missing:$missing"
  fi

  # 2. Agents: the subagents ralph/review dispatch are loadable.
  out="$(run_on "$harness" "$project" \
    "List the names of all custom agents (subagent types) available to you, one per line, names only. Do not use any tools.")"
  missing=""
  for agent in implementer spec-reviewer security-reviewer code-quality-reviewer performance-reviewer docs-reviewer; do
    echo "$out" | grep -qiE "(afk:)?$agent" || missing="$missing $agent"
  done
  if [ -z "$missing" ]; then
    record "agents: all 6 afk agents discovered" "$harness" PASS
  else
    record "agents: all 6 afk agents discovered" "$harness" FAIL "missing:$missing"
  fi

  # 3. SessionStart hook: the sizing gate is injected without any setup.
  # KNOWN_ISSUE: Copilot CLI lists plugin hooks but may never execute them
  # (github/copilot-cli#2540) — WARN there instead of FAIL, so the matrix
  # flags the gap without going red on an upstream bug.
  out="$(run_on "$harness" "$project" \
    "Answer with exactly one word, YES or NO: does your context already contain a section titled 'The Ticket-Sizing Gate'? Do not use any tools.")"
  if echo "$out" | grep -qiE '\bYES\b'; then
    record "hooks: sizing gate injected at session start" "$harness" PASS
  elif [ "$harness" = copilot ]; then
    record "hooks: sizing gate injected at session start" "$harness" WARN \
      "known upstream bug github/copilot-cli#2540 — CLAUDE.md backstop covers this"
  else
    record "hooks: sizing gate injected at session start" "$harness" FAIL "$(echo "$out" | tail -3)"
  fi

  # 4. CLAUDE.md backstop: a post-setup project enforces the gate even when
  # hooks don't fire. Both harnesses read root CLAUDE.md as instructions.
  awk '/^## Ticket-sizing gate/,/^## Go deeper/' \
    "$PLUGIN_DIR/skills/setup/claude-md-template.md" \
    | sed '/^## Go deeper/d' | sed '/^</,/>$/d' \
    > "$project/CLAUDE.md"
  out="$(run_on "$harness" "$project" \
    "The user asks you to build a multi-step booking wizard (frontend plus backend, several API calls). Per your project instructions, should you implement it directly in this session in one pass? Answer with exactly one word, YES or NO. Do not use any tools.")"
  if echo "$out" | grep -qiE '\bNO\b'; then
    record "backstop: CLAUDE.md sizing gate routes big tickets away" "$harness" PASS
  else
    record "backstop: CLAUDE.md sizing gate routes big tickets away" "$harness" FAIL "$(echo "$out" | tail -3)"
  fi

  # 5. Custom reviewers: a repo-local .afk/reviewers/ definition joins the
  # review skill's dispatch plan (the team-extension convention). Asserting
  # the plan, not a real agent spawn, keeps this one prompt instead of a
  # full multi-agent review run.
  mkdir -p "$project/.afk/reviewers"
  cat > "$project/.afk/reviewers/vue-reviewer.md" <<'EOF'
---
name: vue-reviewer
description: Vue SFC patterns, composables misuse
paths: ["**/*.vue"]
tier: lite
---
You review Vue code only. Flag props mutation and watchers that should be
computed. Do NOT flag style preferences.
EOF
  out="$(run_on "$harness" "$project" \
    "Load the afk review skill, then check this repo's .afk/reviewers/ directory. For a Lite-tier review of a diff that changes only src/components/Button.vue, list the names of every reviewer the skill tells you to dispatch, one per line, names only. Do not dispatch any agents and do not read any git diff.")"
  missing=""
  for reviewer in vue-reviewer code-quality-reviewer; do
    echo "$out" | grep -qi "$reviewer" || missing="$missing $reviewer"
  done
  if [ -z "$missing" ]; then
    record "custom reviewers: .afk/reviewers/ joins the dispatch plan" "$harness" PASS
  else
    record "custom reviewers: .afk/reviewers/ joins the dispatch plan" "$harness" FAIL \
      "missing:$missing — $(echo "$out" | tail -3)"
  fi

  rm -rf "$project"
done

# --- summary matrix ----------------------------------------------------------

echo ""
echo "=== Parity matrix ==="
printf '%-55s %-10s %s\n' "feature" "harness" "status"
for row in "${MATRIX[@]}"; do
  IFS='|' read -r feature harness status <<< "$row"
  printf '%-55s %-10s %s\n' "$feature" "$harness" "$status"
done

echo ""
echo "Passed: $PASS  Failed: $FAIL  Warnings: $WARN  Skipped: $SKIP"
[ "$FAIL" -eq 0 ]
