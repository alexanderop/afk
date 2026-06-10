#!/usr/bin/env bash
# Fast test: the review skill loads and documents risk tiering + specialist agents.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

echo "=== Test: review (risk tiers + specialists) ==="

output=$(run_claude "Describe the afk review skill: what are the review tiers, which specialist reviewer agents exist, and what happens to a trivial diff?" 120)

assert_contains "$output" "trivial" "Documents the trivial tier"
assert_contains "$output" "lite" "Documents the lite tier"
assert_contains "$output" "full" "Documents the full tier"
assert_contains "$output" "code-quality-reviewer" "Names the code-quality specialist"
assert_contains "$output" "security-reviewer" "Names the security specialist"
assert_contains "$output" "performance-reviewer" "Names the performance specialist"
assert_contains "$output" "docs-reviewer" "Names the docs specialist"

echo "=== All tests passed ==="
