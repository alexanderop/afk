# Eval case schema

An eval is a failing test for one observable behavior. A spec file is JSON named
`<suite>.evals.json` (the AFK plugin stores them as `specs/<suite>/evals.json` —
match whatever an existing harness already uses):

```json
{
  "suite": "grill",
  "evals": [ { "...one case..." } ]
}
```

Each case:

| Field | Required | Purpose |
|-------|----------|---------|
| `id` | yes | stable, kebab-case; used to filter a single run |
| `prompt` | yes | what the user/system-under-test is asked to do |
| `expected_output` | no | one-sentence human summary of the target behavior |
| `max_budget_usd` | no | per-run budget override for an expensive case |
| `fixture.files` | no | `{ "path": "contents" }` written into a fresh temp git repo before the run |
| `expectations` | no | natural-language behaviors graded by an LLM judge (use only for what substrings can't capture) |
| `assertions` | no | deterministic, zero-judge checks (below) |

`assertions` keys:

- `required_substrings` / `forbidden_substrings` — case-insensitive checks on the
  agent's response text.
- `required_files` — paths that must exist in the project after the run.
- `required_file_substrings` — `{ "path": ["str", ...] }` content checks on
  produced files.
- `unchanged_files` — fixture files that must be byte-identical afterward.

## Design rules

- **One behavior per case.** If you're testing two things, write two cases.
- **Split a two-part requirement into two assertions** so a half-answer fails.
  Example below requires both the repo origin *and* the local path.
- **Prefer deterministic assertions; reserve the judge** for behaviors substrings
  can't express ("reads the repo before asking"). Assertions are free to re-run
  and don't flake.
- **Keep fixtures minimal** — only the files the behavior needs.

## Worked example (red-first)

This case fails against a grill skill that doesn't record cloned reference repos,
and passes once it does. It encodes the two-part requirement as two file
substrings — origin and path:

```json
{
  "id": "grill-plan-records-reference-repo",
  "prompt": "Earlier we cloned https://github.com/acme/awesome-streamer into reference/awesome-streamer to copy its SSE pattern. Finish by writing docs/plans/streaming.md for a /chat SSE endpoint that follows that repo.",
  "fixture": {
    "files": {
      "reference/awesome-streamer/README.md": "Source: https://github.com/acme/awesome-streamer\n"
    }
  },
  "expectations": [
    "Records in the plan that a reference repo was cloned to copy a pattern",
    "Points implementation at the real cloned source rather than memory"
  ],
  "assertions": {
    "required_files": ["docs/plans/streaming.md"],
    "required_file_substrings": {
      "docs/plans/streaming.md": ["reference/awesome-streamer", "github.com/acme/awesome-streamer"]
    }
  }
}
```
