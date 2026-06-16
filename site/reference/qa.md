# QA

Invoke as `/afk:qa`. Use it after implementation is done, before shipping, or whenever you need observed behavior — not just passing tests — to make a ship/no-ship call.

## What it does

QA classifies the changed system (frontend, backend, or hybrid), then exercises it with direct evidence. For frontend work it drives a real browser session via `agent-browser`, capturing screenshots at each state transition and checking for console errors, uncaught exceptions, and correct persisted state. For backend/API/CLI work it exercises the contract directly — health check, happy path, validation failures, auth failures, persistence round-trip, and side effects — capturing request/response transcripts.

- Evidence is written to `qa/evidence/<slug>/` for browser screenshots and `qa/evidence/<slug>/api/` for API transcripts.
- QA judges whether the change delivers its **stated intent**, not just that it runs without errors. A chart that renders but hides the trend fails even with no console errors.
- QA cannot substitute tests for observed behavior; if the app cannot run locally, QA reports the exact blocker.

**Output artifact:** `qa/<slug>.md` with verdict (`SHIP`, `DO NOT SHIP`, or `SHIP WITH CAVEATS`), test cases, and observations.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/qa/SKILL.md)
