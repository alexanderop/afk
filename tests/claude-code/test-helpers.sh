#!/usr/bin/env bash
# Common functions for afk skill tests

# Plugin root (two levels up from tests/claude-code)
HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$HELPERS_DIR/../.." && pwd)"
export PLUGIN_DIR

# Usage: run_claude "prompt text" [timeout_seconds] [allowed_tools]
run_claude() {
    local prompt="$1"
    local timeout="${2:-60}"
    local allowed_tools="${3:-}"
    local output_file
    output_file=$(mktemp)

    local args=(-p "$prompt" --plugin-dir "$PLUGIN_DIR")
    if [ -n "$allowed_tools" ]; then
        args+=(--allowed-tools "$allowed_tools")
    fi

    if timeout "$timeout" claude "${args[@]}" > "$output_file" 2>&1; then
        cat "$output_file"
        rm -f "$output_file"
        return 0
    else
        cat "$output_file"
        rm -f "$output_file"
        return 1
    fi
}

# Usage: assert_contains "$output" "pattern" "test name"
assert_contains() {
    local output="$1"
    local pattern="$2"
    local name="$3"

    if echo "$output" | grep -qiE "$pattern"; then
        echo "  ✅ $name"
        return 0
    else
        echo "  ❌ $name"
        echo "     Expected pattern: $pattern"
        return 1
    fi
}

# Usage: assert_not_contains "$output" "pattern" "test name"
assert_not_contains() {
    local output="$1"
    local pattern="$2"
    local name="$3"

    if echo "$output" | grep -qiE "$pattern"; then
        echo "  ❌ $name"
        echo "     Forbidden pattern found: $pattern"
        return 1
    else
        echo "  ✅ $name"
        return 0
    fi
}

# Usage: assert_order "$output" "pattern_a" "pattern_b" "test name"
# Passes when pattern_a appears before pattern_b.
assert_order() {
    local output="$1"
    local pattern_a="$2"
    local pattern_b="$3"
    local name="$4"

    local pos_a pos_b
    pos_a=$(echo "$output" | grep -niE "$pattern_a" | head -1 | cut -d: -f1)
    pos_b=$(echo "$output" | grep -niE "$pattern_b" | head -1 | cut -d: -f1)

    if [ -n "$pos_a" ] && [ -n "$pos_b" ] && [ "$pos_a" -lt "$pos_b" ]; then
        echo "  ✅ $name"
        return 0
    else
        echo "  ❌ $name"
        echo "     Expected '$pattern_a' (line ${pos_a:-missing}) before '$pattern_b' (line ${pos_b:-missing})"
        return 1
    fi
}

# Usage: create_test_project — echoes the new temp dir
create_test_project() {
    local dir
    dir=$(mktemp -d /tmp/afk-test-project.XXXXXX)
    (cd "$dir" && git init -q && git commit -q --allow-empty -m "init")
    echo "$dir"
}

cleanup_test_project() {
    local dir="$1"
    [ -n "$dir" ] && [[ "$dir" == /tmp/afk-test-project.* ]] && rm -rf "$dir"
}

export -f run_claude
export -f assert_contains
export -f assert_not_contains
export -f assert_order
export -f create_test_project
export -f cleanup_test_project
