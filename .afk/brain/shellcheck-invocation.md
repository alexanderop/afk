# shellcheck invocation

Why lint runs `shellcheck -x -P SCRIPTDIR` — plain shellcheck false-fails on SC1091. Read before changing the lint command or adding scripts that `source` files.

The lint command in `.afk/config.json` is:

```
find hooks tests -name '*.sh' -print0 | xargs -0 shellcheck -x -P SCRIPTDIR
```

Both flags are load-bearing. `tests/claude-code/test-*.sh` source
`test-helpers.sh` via a `$SCRIPT_DIR` variable (tests/claude-code/test-using-afk.sh:6),
and shellcheck cannot resolve variable paths: without the flags it emits
SC1091 ("Not following") at info level and exits 1, so a plain
`shellcheck **/*.sh` looks RED on a clean tree.

- `-x` — follow `source`d files instead of refusing.
- `-P SCRIPTDIR` — resolve sourced paths relative to the script's own
  directory, not the cwd. `-x` alone still fails when run from the repo root.

If a future script sources a file shellcheck still can't trace, prefer a
`# shellcheck source=<path>` directive in that script over weakening the
shared lint command (e.g. with `--severity=warning`, which would also mute
real info-level findings).

Note format gotcha: this index description is the note's first non-empty,
non-heading line — `hooks/auto-index-brain.sh:39` does not parse YAML
frontmatter, so brain notes must not use it (`---` would become the
description).
