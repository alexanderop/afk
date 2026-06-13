#!/usr/bin/env bash
# Runs behavioral eval specs through Claude Code with this plugin loaded.
# Requires Claude Code auth for non-interactive model calls.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="${AFK_EVAL_OUT_DIR:-$PLUGIN_DIR/qa/evals/$(date -u +%Y%m%dT%H%M%SZ)}"
MAX_BUDGET_USD="${AFK_EVAL_MAX_BUDGET_USD:-0.25}"
TIMEOUT_SECONDS="${AFK_EVAL_TIMEOUT_SECONDS:-180}"

PASSED=0
FAILED=0
TOTAL_COST="0"

pass() { echo "  ✅ $1"; PASSED=$((PASSED + 1)); }
fail() { echo "  ❌ $1"; [ $# -gt 1 ] && echo "     $2"; FAILED=$((FAILED + 1)); }

contains_ci() {
  local haystack="$1" needle="$2"
  printf '%s' "$haystack" | tr '[:upper:]' '[:lower:]' | grep -Fq -- "$(printf '%s' "$needle" | tr '[:upper:]' '[:lower:]')"
}

write_fixture_files() {
  local spec_file="$1" eval_id="$2" project_dir="$3"

  while IFS= read -r encoded; do
    [ -z "$encoded" ] && continue
    path="$(printf '%s' "$encoded" | base64 --decode | jq -r '.key')"
    content="$(printf '%s' "$encoded" | base64 --decode | jq -r '.value')"
    mkdir -p "$project_dir/$(dirname "$path")"
    printf '%s' "$content" > "$project_dir/$path"
  done < <(jq -r --arg id "$eval_id" '
    .evals[]
    | select(.id == $id)
    | (.fixture.files // {})
    | to_entries[]
    | @base64
  ' "$spec_file")
}

run_eval() {
  local spec_file="$1" eval_id="$2" skill_name prompt project_dir raw_log result_text assistant_text assertion_text is_error cost eval_dir

  skill_name="$(jq -r '.skill_name' "$spec_file")"
  prompt="$(jq -r --arg id "$eval_id" '.evals[] | select(.id == $id) | .prompt' "$spec_file")"

  eval_dir="$OUT_DIR/$skill_name/$eval_id"
  mkdir -p "$eval_dir"
  project_dir="$(mktemp -d "/tmp/afk-eval-${skill_name}-${eval_id}.XXXXXX")"
  raw_log="$eval_dir/raw.jsonl"

  (
    cd "$project_dir" &&
      git init -q &&
      write_fixture_files "$spec_file" "$eval_id" "$project_dir" &&
      timeout "$TIMEOUT_SECONDS" claude -p "/afk:${skill_name}

${prompt}

Eval mode: follow the AFK skill normally. Include enough detail in the final response for the eval assertions to verify what happened. Do not edit files outside this temporary eval project." \
        --plugin-dir "$PLUGIN_DIR" \
        --setting-sources project \
        --permission-mode bypassPermissions \
        --max-budget-usd "$MAX_BUDGET_USD" \
        --output-format stream-json \
        --verbose > "$raw_log" 2>&1 < /dev/null
  )
  command_status=$?

  cp -R "$project_dir" "$eval_dir/project"

  result_text="$(jq -r 'select(.type == "result") | .result // empty' "$raw_log" 2>/dev/null | tail -1)"
  assistant_text="$(jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text' "$raw_log" 2>/dev/null)"
  assertion_text="$assistant_text
$result_text"
  is_error="$(jq -r 'select(.type == "result") | .is_error // false' "$raw_log" 2>/dev/null | tail -1)"
  cost="$(jq -r 'select(.type == "result") | .total_cost_usd // 0' "$raw_log" 2>/dev/null | tail -1)"
  [ -n "$cost" ] || cost="0"
  TOTAL_COST="$(awk -v a="$TOTAL_COST" -v b="$cost" 'BEGIN { printf "%.6f", a + b }')"

  printf '%s\n' "$result_text" > "$eval_dir/result.txt"

  if [ "$command_status" -ne 0 ]; then
    detail="claude exited $command_status; see $raw_log"
    if [ -n "$result_text" ]; then
      detail="$detail; result: $result_text"
    fi
    fail "$skill_name/$eval_id completed" "$detail"
    return
  fi

  if [ "$is_error" = "true" ]; then
    fail "$skill_name/$eval_id completed without Claude error" "$result_text"
    return
  fi

  pass "$skill_name/$eval_id completed"

  while IFS= read -r required; do
    [ -z "$required" ] && continue
    if contains_ci "$assertion_text" "$required"; then
      pass "$skill_name/$eval_id contains '$required'"
    else
      fail "$skill_name/$eval_id contains '$required'" "see $eval_dir/result.txt"
    fi
  done < <(jq -r --arg id "$eval_id" '
    .evals[]
    | select(.id == $id)
    | (.assertions.required_substrings // [])
    | .[]
  ' "$spec_file")

  while IFS= read -r forbidden; do
    [ -z "$forbidden" ] && continue
    if contains_ci "$assertion_text" "$forbidden"; then
      fail "$skill_name/$eval_id excludes '$forbidden'" "see $eval_dir/result.txt"
    else
      pass "$skill_name/$eval_id excludes '$forbidden'"
    fi
  done < <(jq -r --arg id "$eval_id" '
    .evals[]
    | select(.id == $id)
    | (.assertions.forbidden_substrings // [])
    | .[]
  ' "$spec_file")

  while IFS= read -r required_file; do
    [ -z "$required_file" ] && continue
    if [ -f "$eval_dir/project/$required_file" ]; then
      pass "$skill_name/$eval_id created $required_file"
    else
      fail "$skill_name/$eval_id created $required_file"
    fi
  done < <(jq -r --arg id "$eval_id" '
    .evals[]
    | select(.id == $id)
    | (.assertions.required_files // [])
    | .[]
  ' "$spec_file")

  while IFS= read -r encoded; do
    [ -z "$encoded" ] && continue
    file_path="$(printf '%s' "$encoded" | base64 --decode | jq -r '.key')"
    while IFS= read -r required_in_file; do
      [ -z "$required_in_file" ] && continue
      if [ -f "$eval_dir/project/$file_path" ] && contains_ci "$(cat "$eval_dir/project/$file_path")" "$required_in_file"; then
        pass "$skill_name/$eval_id $file_path contains '$required_in_file'"
      else
        fail "$skill_name/$eval_id $file_path contains '$required_in_file'"
      fi
    done < <(printf '%s' "$encoded" | base64 --decode | jq -r '.value[]')
  done < <(jq -r --arg id "$eval_id" '
    .evals[]
    | select(.id == $id)
    | (.assertions.required_file_substrings // {})
    | to_entries[]
    | @base64
  ' "$spec_file")
}

echo "=== AFK behavioral evals (Claude Code, model-backed) ==="
echo "Artifacts: $OUT_DIR"
echo "Per-eval max budget: \$$MAX_BUDGET_USD"
echo ""

if ! command -v claude >/dev/null 2>&1; then
  fail "claude CLI is installed"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  fail "jq is installed"
  exit 1
fi

while IFS= read -r spec_file; do
  while IFS= read -r eval_id; do
    [ -z "$eval_id" ] && continue
    run_eval "$spec_file" "$eval_id"
  done < <(jq -r '.evals[].id' "$spec_file")
done < <(find "$PLUGIN_DIR/evals" -name 'evals.json' -type f | sort)

echo ""
echo "Cost: \$$TOTAL_COST"
echo "Passed: $PASSED  Failed: $FAILED"
[ "$FAILED" -eq 0 ]
