#!/usr/bin/env bash
# Local zero-token check entrypoint. Keep this aligned with the non-smoke CI
# job in .github/workflows/checks.yml.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

"$PLUGIN_DIR/tests/lint/run-lint-tests.sh"

if command -v shellcheck >/dev/null 2>&1; then
  find "$PLUGIN_DIR/tests" -name '*.sh' -print0 | xargs -0 shellcheck -x -P SCRIPTDIR
else
  echo "shellcheck not found; skipping shell script lint"
fi
