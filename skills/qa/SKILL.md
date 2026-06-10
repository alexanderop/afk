---
name: qa
description: Use when implementation and refactoring are done but no human has seen the feature run — exercises the real running project on whatever surface it actually has (browser via agent-browser, HTTP API via curl, or CLI invocations), walks the happy path and negative paths from the spec, and writes an evidence-backed QA report.
context: fork
---

# QA: Agentic Verification on the Real Surface

## Overview

Tests prove the units work. They don't prove a user can finish the flow. The gap
between "tests pass" and "the feature actually completes" is where AFK features
quietly fail — and it's exactly the gap a walk on the real, running surface
closes. The surface differs per project — a browser UI, an HTTP API, a CLI —
but the job is the same: drive the real thing, observe what actually happens,
report with evidence. **A claim without evidence (screenshot or captured
transcript) is not a finding.**

This skill runs in a forked context (snapshots, response bodies, and console
dumps stay out of the main session — only the report comes back). Orient
yourself from disk: `.afk/pipeline/<slug>.md` for the feature slug and PRD path
if a pipeline is running, otherwise the newest `docs/specs/prd-*.md`.

## Step 1: Pick the QA Mode

Read `qa.mode` from `.afk/config.json` (recorded by `afk:setup`). If absent,
infer it and state your choice in the report:

| Mode | When | You drive it with |
|------|------|-------------------|
| **browser** | The feature has a UI a human would click | `agent-browser` against `devUrl` |
| **api** | Pure backend: HTTP/RPC endpoints, webhooks, no UI | `curl` (or the project's HTTP client) against the running service |
| **cli** | Command-line tool or library | Real invocations of the built binary / a scratch consumer script |

A feature can span modes (an endpoint AND the form that calls it) — then QA the
outermost surface a user touches, and drop to the API for cases the UI can't
reach (malformed payloads, missing auth).

## Step 2: Setup

1. Read `.afk/config.json` for the dev command and `devUrl`. Start the app or
   service; wait until it responds. (cli mode: build the binary / link the
   package instead.)
2. **browser mode:** check `agent-browser --help` works. If not installed, tell
   the user how to install it and offer to fall back to api mode against the
   same endpoints, or the project's e2e runner. Do not silently skip QA.
3. Create `qa/` and `qa/evidence/<slug>/`.

## Step 3: Test Plan

Derive test cases from the PRD — not from the implementation:

1. **Happy path** — the PRD's "Happy path" section, step by step, with valid data.
2. **Acceptance criteria** — every numbered criterion from the PRD becomes a test case, verbatim.
3. **Negative paths** — from the PRD's "Validation & error states": invalid input at each step, and at least one failure mid-flow (declined payment, server error if mockable).
4. **One hostile pass** — per mode:
   - *browser:* refresh mid-flow, back button, double-click submit, empty-everything submit.
   - *api:* malformed JSON, wrong content type, missing/expired auth, duplicate submission (replay the same POST), out-of-order calls, oversized payload.
   - *cli:* missing args, conflicting flags, empty stdin, nonexistent paths, re-run on already-processed input.

How to drive and what counts as evidence:

- **browser:** use agent-browser snapshots to find elements (stable `@e1` refs,
  not CSS selectors), act, screenshot every state transition, and read the
  console/network even when the UI looks right. A rendered success screen with
  a 500 in the console is a FAIL. Evidence: `qa/evidence/<slug>/tc01-*.png`.
- **api:** send the real request, capture the full request + response (status,
  headers that matter, body) to a transcript file. Verify side effects the PRD
  claims — the row exists, the event fired, the file landed — by querying, not
  by trusting the 200. A 200 with the wrong body, a 500 disguised as
  `{"ok":true}`, or a missing side effect is a FAIL. Also watch the service
  logs for stack traces on requests that "succeeded". Evidence:
  `qa/evidence/<slug>/tc01.http.md` (request, response, side-effect check).
- **cli:** run the real command, capture command + exit code + stdout/stderr to
  a transcript. Exit code 0 with an error message on stderr, or a "success"
  that didn't produce the promised artifact, is a FAIL. Evidence:
  `qa/evidence/<slug>/tc01.txt`.

## Report

Write `qa/<slug>.md`:

```markdown
# QA Report: <feature> — <date>
Mode: browser | api | cli   (and why, if inferred)

## Verdict: PASS | FAIL (N of M cases failed)

## TC-01: <name>  — PASS/FAIL
Steps taken:        (numbered, exactly what you did — commands/requests verbatim)
Expected:           (from the PRD)
Actual:             (what happened, console/log/stderr errors included)
Evidence:           qa/evidence/<slug>/tc01-*
```

Failures must be reproducible from the report alone — a developer (or the next
pipeline phase) fixes from your steps, not from your memory. If anything is red,
hand the failing cases back to **afk:ralph** as fix tasks before review.

## Red Flags

| Thought | Reality |
|---------|---------|
| "Pure backend, no browser — QA doesn't apply" | The surface is the API. curl the spec's acceptance criteria against the running service. No-UI ≠ no-QA. |
| "The e2e tests cover this, QA is redundant" | The e2e tests were written by the same loops that wrote the bugs. Independent eyes, real surface. |
| "It returned 200 / exit 0, mark it PASS" | Check the body, the side effect, the logs, the console. Looking right and being right differ by one swallowed error. |
| "I'll test what was implemented" | Test what was SPECIFIED. The difference between the two is the bug. |
| "Skip the hostile pass, users won't do that" | Users (and integrators, and retrying clients) do exactly that, within the first hour. |
| "Evidence at the end is enough" | Every state transition / every request-response pair. The bug is always in the step you didn't capture. |

## Integration

- Input: PRD acceptance criteria (**afk:spec**), running app/service (**afk:setup** dev command), `qa.mode` from `.afk/config.json` (**afk:setup**).
- Failures route back to **afk:ralph**; a clean report unblocks **afk:review**.
- Called by **afk:pipeline** as phase 5.
