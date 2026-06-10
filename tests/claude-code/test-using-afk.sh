#!/usr/bin/env bash
# Fast test: the using-afk skill loads and documents the ticket-sizing gate.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

echo "=== Test: using-afk (ticket-sizing gate) ==="

output=$(run_claude "According to the using-afk skill, what must you do before implementing ANY feature, and at what ticket size does the pipeline become mandatory? Quote the iron law." 120)

assert_contains "$output" "siz(e|ing)" "Mentions sizing the ticket first"
assert_contains "$output" "5" "Names the 5-point threshold"
assert_contains "$output" "pipeline" "Routes big tickets to the pipeline"
assert_contains "$output" "single pass|one pass|single session" "Quotes the iron law (no big ticket in a single pass)"

echo "=== All tests passed ==="
