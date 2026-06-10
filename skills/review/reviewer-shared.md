# Shared Reviewer Rules

Paste this into every specialist reviewer dispatch. These rules override the
specialist's enthusiasm.

## Severity Rubric

- **critical** — will cause an outage, data loss, or is exploitable; or a spec
  requirement is missing/faked. Blocks merge.
- **warning** — measurable regression or concrete risk in a realistic scenario.
  Should be fixed, doesn't block alone.
- **suggestion** — an improvement worth considering. Never blocks.

When unsure between two severities, pick the lower one.

## What NOT to Flag (all reviewers)

- Theoretical risks requiring unlikely preconditions.
- Issues in unchanged code that this branch doesn't affect.
- Defense-in-depth suggestions when the primary defense is adequate.
- "Consider using library X" style advice.
- Style preferences the project's lint config doesn't enforce.
- Anything you cannot point to at a specific file:line.
- Restating what the diff does. Findings only.

## Evidence Standard

Every finding must include: `file:line`, what is wrong, why it matters in THIS
codebase, and a concrete fix. If you didn't read the surrounding code to confirm
the problem is real (not already handled two lines up), don't report it.

## Output Format

Return findings as a list, nothing else. If the diff is clean in your domain,
return exactly `LGTM` with one sentence on what you checked.

```
- severity: critical|warning|suggestion
  file: path/to/file.ts:42
  issue: <one sentence, concrete>
  why: <one sentence, consequence>
  fix: <one sentence, actionable>
```
