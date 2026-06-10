#!/usr/bin/env bash
# Test runner for afk skills
# Tests skills by invoking Claude Code CLI and verifying behavior
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo " afk Skills Test Suite"
echo "========================================"
echo ""
echo "Plugin: $(cd ../.. && pwd)"
echo "Test time: $(date)"
echo "Claude version: $(claude --version 2>/dev/null || echo 'not found')"
echo ""

if ! command -v claude &> /dev/null; then
    echo "ERROR: Claude Code CLI not found"
    echo "Install Claude Code first: https://code.claude.com"
    exit 1
fi

VERBOSE=false
SPECIFIC_TEST=""
TIMEOUT=300
RUN_INTEGRATION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --test|-t)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --integration|-i)
            RUN_INTEGRATION=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --verbose, -v        Show verbose output"
            echo "  --test, -t NAME      Run only the specified test"
            echo "  --timeout SECONDS    Set timeout per test (default: 300)"
            echo "  --integration, -i    Run integration tests (slow)"
            echo "  --help, -h           Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Fast tests (run by default)
tests=(
    "test-using-afk.sh"
    "test-review-tiers.sh"
)

# Integration tests (slow, full execution; use --integration)
integration_tests=(
)

if [ "$RUN_INTEGRATION" = "true" ]; then
    tests+=("${integration_tests[@]}")
fi

if [ -n "$SPECIFIC_TEST" ]; then
    tests=("$SPECIFIC_TEST")
fi

PASSED=0
FAILED=0
RESULTS=()

for test in "${tests[@]}"; do
    if [ ! -f "$SCRIPT_DIR/$test" ]; then
        echo "⚠️  SKIP: $test not found"
        continue
    fi

    echo "----------------------------------------"
    echo "Running: $test"
    echo "----------------------------------------"

    output_file=$(mktemp)
    if timeout "$TIMEOUT" bash "$SCRIPT_DIR/$test" > "$output_file" 2>&1; then
        PASSED=$((PASSED + 1))
        RESULTS+=("✅ $test")
        if [ "$VERBOSE" = "true" ]; then
            cat "$output_file"
        fi
    else
        FAILED=$((FAILED + 1))
        RESULTS+=("❌ $test")
        cat "$output_file"
    fi
    rm -f "$output_file"
    echo ""
done

echo "========================================"
echo " Summary"
echo "========================================"
for result in "${RESULTS[@]}"; do
    echo "  $result"
done
echo ""
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
