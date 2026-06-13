#!/bin/bash
# init-brain.sh — scaffold an empty brain vault in the project.
# Idempotent: creates brain/ and brain/index.md only if missing, never clobbers.

set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
BRAIN_DIR="$ROOT/brain"
INDEX="$BRAIN_DIR/index.md"

created=0

if [ ! -d "$BRAIN_DIR" ]; then
  mkdir -p "$BRAIN_DIR"
  created=1
fi

# brain/principles/ holds engineering/design principles; principles.md is its
# index entrypoint. The flow reads these before acting, so scaffold them.
if [ ! -d "$BRAIN_DIR/principles" ]; then
  mkdir -p "$BRAIN_DIR/principles"
  created=1
fi

if [ ! -f "$BRAIN_DIR/principles.md" ]; then
  printf '# Principles\n\nProject engineering and design principles. One topic per file in `principles/`, linked here as `[[principles/<name>]]`.\n' > "$BRAIN_DIR/principles.md"
  created=1
fi

# brain/plans/ is where the `plan` skill writes — scaffold it too.
if [ ! -d "$BRAIN_DIR/plans" ]; then
  mkdir -p "$BRAIN_DIR/plans"
  created=1
fi

if [ ! -f "$BRAIN_DIR/plans/index.md" ]; then
  printf '# Plans\n' > "$BRAIN_DIR/plans/index.md"
  created=1
fi

if [ ! -f "$INDEX" ]; then
  {
    echo "# Brain"
    echo ""
    echo "## Principles"
    echo "- [[principles]]"
    echo ""
    echo "## Plans"
    echo "- [[plans/index]]"
  } > "$INDEX"
  created=1
fi

if [ "$created" -eq 1 ]; then
  echo "Brain vault ready at: $BRAIN_DIR"
else
  echo "Brain vault already exists at: $BRAIN_DIR (nothing to do)"
fi
