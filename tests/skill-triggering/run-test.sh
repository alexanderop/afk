#!/usr/bin/env bash
# Test skill triggering with naive prompts
# Usage: ./run-test.sh <skill-name-or-pattern> <prompt-file> [max-turns]
#        ./run-test.sh --absent <skill-name-or-pattern> <prompt-file> [max-turns]
#
# Default mode: tests whether Claude triggers a skill based on a natural prompt
# (without explicitly mentioning the skill).
# --absent mode: tests that a skill is NOT triggered (e.g. the ticket-sizing
# gate must not route a typo fix into the pipeline).
#
# The skill name is matched as an extended regex, so alternations work:
#   ./run-test.sh "spec|pipeline" prompts/spec.txt

set -e

MODE="present"
if [ "$1" = "--absent" ]; then
    MODE="absent"
    shift
fi

SKILL_NAME="$1"
PROMPT_FILE="$2"
MAX_TURNS="${3:-3}"

if [ -z "$SKILL_NAME" ] || [ -z "$PROMPT_FILE" ]; then
    echo "Usage: $0 [--absent] <skill-name-or-pattern> <prompt-file> [max-turns]"
    echo "Example: $0 review ./prompts/review.txt"
    exit 1
fi

# Get the directory where this script lives (tests/skill-triggering)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the afk plugin root (two levels up)
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

TIMESTAMP=$(date +%s)
OUTPUT_DIR="/tmp/afk-tests/${TIMESTAMP}/skill-triggering/$(echo "$SKILL_NAME" | tr -c 'a-zA-Z0-9-' '_')"
mkdir -p "$OUTPUT_DIR"

PROMPT=$(cat "$PROMPT_FILE")

echo "=== Skill Triggering Test ==="
echo "Skill: $SKILL_NAME (expect: $MODE)"
echo "Prompt file: $PROMPT_FILE"
echo "Max turns: $MAX_TURNS"
echo "Output dir: $OUTPUT_DIR"
echo ""

cp "$PROMPT_FILE" "$OUTPUT_DIR/prompt.txt"

# Run Claude from an empty project dir so repo context can't interfere
LOG_FILE="$OUTPUT_DIR/claude-output.json"
PROJECT_DIR="$OUTPUT_DIR/project"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "Plugin dir: $PLUGIN_DIR"
echo "Running claude -p with naive prompt..."
# --setting-sources project keeps user-level plugins/skills/hooks out of the
# run (their skills compete with afk's for triggering) without disabling the
# plugin's own SessionStart hook, which --bare would.
timeout 300 claude -p "$PROMPT" \
    --plugin-dir "$PLUGIN_DIR" \
    --setting-sources project \
    --dangerously-skip-permissions \
    --max-turns "$MAX_TURNS" \
    --output-format stream-json \
    --verbose \
    > "$LOG_FILE" 2>&1 || true

echo ""
echo "=== Results ==="

# Check for a Skill tool invocation matching the expected skill.
# Matches "skill":"name" or "skill":"afk:name".
SKILL_PATTERN='"skill":"([^"]*:)?('"${SKILL_NAME}"')"'
if grep -q '"name":"Skill"' "$LOG_FILE" && grep -qE "$SKILL_PATTERN" "$LOG_FILE"; then
    FOUND=true
else
    FOUND=false
fi

if [ "$MODE" = "present" ]; then
    if [ "$FOUND" = "true" ]; then
        echo "✅ PASS: Skill '$SKILL_NAME' was triggered"
        OK=true
    else
        echo "❌ FAIL: Skill '$SKILL_NAME' was NOT triggered"
        OK=false
    fi
else
    if [ "$FOUND" = "true" ]; then
        echo "❌ FAIL: Skill '$SKILL_NAME' was triggered but should NOT have been"
        OK=false
    else
        echo "✅ PASS: Skill '$SKILL_NAME' was not triggered (as expected)"
        OK=true
    fi
fi

echo ""
echo "Skills triggered in this run:"
grep -o '"skill":"[^"]*"' "$LOG_FILE" 2>/dev/null | sort -u || echo "  (none)"

# Detect the failure mode where Claude starts doing work before loading a skill
if [ "$MODE" = "present" ]; then
    echo ""
    echo "Checking for premature action..."
    FIRST_SKILL_LINE=$(grep -n '"name":"Skill"' "$LOG_FILE" | head -1 | cut -d: -f1)
    if [ -n "$FIRST_SKILL_LINE" ]; then
        PREMATURE_TOOLS=$(head -n "$FIRST_SKILL_LINE" "$LOG_FILE" | \
            grep '"type":"tool_use"' | \
            grep -v '"name":"Skill"' | \
            grep -v '"name":"TodoWrite"' || true)
        if [ -n "$PREMATURE_TOOLS" ]; then
            echo "⚠️  WARNING: Tools invoked BEFORE Skill tool:"
            echo "$PREMATURE_TOOLS" | head -5
        else
            echo "OK: No premature tool invocations detected"
        fi
    fi
fi

echo ""
echo "First assistant response (truncated):"
grep '"type":"assistant"' "$LOG_FILE" | head -1 | jq -r '.message.content[0].text // .message.content' 2>/dev/null | head -c 500 || echo "  (could not extract)"

echo ""
echo "Full log: $LOG_FILE"

if [ "$OK" = "true" ]; then
    exit 0
else
    exit 1
fi
