---
name: qa
description: Route QA by project shape: use dogfood-style browser QA for frontend apps, API/service QA for backend apps, and both for hybrids. Produce evidence-backed pass/fail reports with a ship recommendation. Use after implementation or when the user says "qa this", "verify it", "dogfood this", or "check it actually works".
context: fork
---

# QA

QA is a router. First identify what kind of system changed, then use the
evidence loop that matches it.

Tests prove code paths work; QA proves the intended user or client can finish
the flow. **A claim without evidence is not a finding.**

## Step 1: Orient

- Identify the flow under test: the plan from **afk:grill**
  (`docs/plans/<slug>.md`), the recent diff, or what the user named.
- Read the local run instructions (`README`, `CLAUDE.md`, package scripts,
  Procfile/compose files, Makefile, framework config).
- Classify the target:
  - **Frontend:** browser-rendered screens, routes, forms, navigation,
    client-side state, visual or accessibility changes.
  - **Backend:** APIs, workers, CLIs, persistence, auth, queues, webhooks, or
    service contracts with no meaningful browser surface.
  - **Hybrid:** backend behavior visible through a frontend flow.
- Pick the route:
  - Frontend -> run **Frontend QA**.
  - Backend -> run **Backend QA**.
  - Hybrid -> run Backend QA for the service contract, then Frontend QA for
    the user-visible integration.

If the project cannot be run locally because required services or secrets are
missing, report the blocker with the exact command/error. Do not replace QA
with "tests pass".

## Frontend QA

Use dogfood-style browser QA: drive the real UI through the flow a user would
walk, capture screenshots and console evidence, and write a ship/no-ship call.

### Bring the app up

Start the dev server in the background; wait for its ready banner and use the
**real** port it prints. If a server already runs on that port, reuse it.

Open a named session so state survives across commands:

```bash
agent-browser --session-name afk-qa open http://localhost:<port>
export AGENT_BROWSER_SESSION=afk-qa   # set on every subsequent call
```

If `agent-browser --help` fails, say so and stop. Do not silently fall back to
unit tests for browser QA.

### Walk the flow

Derive test cases from the plan, not from the implementation: the happy path,
each acceptance criterion, the obvious negative paths (invalid input, empty
submit, refresh mid-flow, back button, double-click submit).

Per step:

1. `wait --load networkidle` (or `wait --text "..."` when you know the signal).
2. `snapshot -i -u` — act on `@eN` refs, never CSS selectors. Refs die on any
   DOM change: re-snapshot after every action.
3. `screenshot qa/evidence/<slug>/tc01-<step>.png` at every state transition.
4. Check what screenshots can't show: `errors` (uncaught exceptions — the
   cleanest signal), `console` for `[error]` lines, `eval` for input values
   and `window.location.href`. A rendered success screen with a 500 in the
   console is a FAIL.
5. Round-trip when possible: after creating/editing something, navigate back
   and confirm the downstream view actually updated.

When a screen looks broken, triage before reporting: is the URL what you
expect? Did `open` land on `about:blank`? Is the console error a product bug
or a missing local API key? Client-routed URLs that 404 on direct load need
router navigation
(`eval "window.history.pushState({}, '', '/route'); window.dispatchEvent(new PopStateEvent('popstate'))"`).

Dogfood beyond the named path when scope allows: navigation entry points,
empty states, loading/error states, mobile viewport, keyboard-only interaction,
form validation, and basic accessibility signals such as labels, names, focus,
headings, and image alternatives.

## Backend QA

Use contract-level QA: prove that a real client can call the service and that
state, validation, errors, and logs behave correctly.

### Bring the service up

Start the app with the project's normal local command. Start required local
dependencies only when the repo documents them (`docker compose`, test DB,
emulator, queue). Record the actual base URL, port, environment, and command.

Find the contract surface from OpenAPI/GraphQL schema/protobuf definitions,
route files, controllers, handlers, CLI help, README examples, or the plan.
Prefer public contracts over implementation internals.

### Exercise the contract

Derive test cases from the plan and contract:

1. Health/readiness or a harmless read endpoint.
2. Happy path with the smallest realistic payload.
3. Validation failures: missing required fields, malformed types, invalid enum
   values, boundary sizes.
4. Auth/permission failures when auth exists.
5. Not-found/conflict/idempotency behavior where the contract implies it.
6. Persistence round trip: create/update, fetch/list, restart or refresh if
   cheap, then verify state remains correct.
7. Side effects: emitted jobs, emails, webhooks, files, metrics, or audit logs
   when the feature owns them.

Capture evidence as request/response transcripts in
`qa/evidence/<slug>/api/`, redacting tokens, cookies, secrets, and personal
data. Include status code, relevant headers, request body, response body, and
the exact command used (`curl`, `http`, `grpcurl`, project CLI, or test
client). For GraphQL, include query/mutation text and variables.

After each failure-looking result, triage before reporting: wrong base URL,
missing migration, missing seed data, absent local secret, clock skew, or a
contract mismatch. Check application logs for stack traces, 5xxs, unhandled
promise rejections, failed jobs, and unexpected retries.

For backend-only work, automated tests are supporting evidence, not the QA
itself. Run the narrow relevant test command after manual contract checks and
include the command/result in Observations.

## Report

Close browser sessions or stop background services you started, then write
`qa/<slug>.md`:

```markdown
# QA: <feature> — <date>

## Verdict: SHIP | DO NOT SHIP | SHIP WITH CAVEATS

## Route
Frontend | Backend | Hybrid, with the reason for that choice.

## TC-01: <name> — PASS/FAIL
Steps:    (numbered, exactly what you did)
Expected: (from the plan)
Actual:   (what happened; quote DOM text, console errors)
Evidence: qa/evidence/<slug>/...

## Observations
(environmental noise — local 500s from missing keys etc. — kept out of the
defect list so the report doesn't cry wolf)
```

Failures must be reproducible from the report alone. Tell the user the
verdict, the report path, and any caveat in two sentences — don't recap the
report body.
