#!/usr/bin/env bash
# Run all skill triggering tests
# Usage: ./run-all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_DIR="$SCRIPT_DIR/prompts"

# "<expected-skill-pattern>:<prompt-file-basename>"
# Patterns are extended regex, so alternations are allowed where the
# router could legitimately pick either skill.
TESTS=(
    "spec|pipeline:spec"
    "slice:slice"
    "ralph:ralph"
    "review:review"
    "qa:qa"
    "setup:setup"
    "refactor-pass:refactor"
    "reflect:reflect"
)

# Negative tests: "<forbidden-skill-pattern>:<prompt-file-basename>"
# The ticket-sizing gate is afk's core promise: small tickets must NOT
# get routed into the heavyweight pipeline.
NEGATIVE_TESTS=(
    "spec|pipeline|slice|ralph:small-ticket"
)

echo "=== Running Skill Triggering Tests ==="
echo ""

PASSED=0
FAILED=0
RESULTS=()

for entry in "${TESTS[@]}"; do
    skill="${entry%%:*}"
    prompt="${entry##*:}"
    prompt_file="$PROMPTS_DIR/${prompt}.txt"

    if [ ! -f "$prompt_file" ]; then
        echo "⚠️  SKIP: No prompt file for $prompt"
        continue
    fi

    echo "Testing: $prompt (expect: $skill)"

    if "$SCRIPT_DIR/run-test.sh" "$skill" "$prompt_file" 3; then
        PASSED=$((PASSED + 1))
        RESULTS+=("✅ $prompt → $skill")
    else
        FAILED=$((FAILED + 1))
        RESULTS+=("❌ $prompt → $skill")
    fi

    echo ""
    echo "---"
    echo ""
done

for entry in "${NEGATIVE_TESTS[@]}"; do
    skill="${entry%%:*}"
    prompt="${entry##*:}"
    prompt_file="$PROMPTS_DIR/${prompt}.txt"

    if [ ! -f "$prompt_file" ]; then
        echo "⚠️  SKIP: No prompt file for $prompt"
        continue
    fi

    echo "Testing (negative): $prompt (must NOT trigger: $skill)"

    if "$SCRIPT_DIR/run-test.sh" --absent "$skill" "$prompt_file" 3; then
        PASSED=$((PASSED + 1))
        RESULTS+=("✅ $prompt ↛ $skill (sizing gate held)")
    else
        FAILED=$((FAILED + 1))
        RESULTS+=("❌ $prompt ↛ $skill (sizing gate broke)")
    fi

    echo ""
    echo "---"
    echo ""
done

echo ""
echo "=== Summary ==="
for result in "${RESULTS[@]}"; do
    echo "  $result"
done
echo ""
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
