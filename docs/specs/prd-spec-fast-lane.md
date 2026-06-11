# PRD: Fast Lane after Spec Approval

## Goal

When `afk:spec` finishes and the approved PRD turns out to be small, the user
shouldn't be funneled into the full pipeline (slice → ralph subagent loops).
`afk:spec` estimates the size of the approved PRD and, when small, recommends a
**fast lane**: implement the whole PRD in one go — no slicing, no per-slice
implementer subagents — while still using read-only subagents (Explore) for
research. Success: small specs reach green tests in minutes of ceremony-free
implementation instead of a full pipeline run, and the user is steered toward
a clean-context way of doing it.

## Users & context

Developers using the afk plugin in Claude Code or Copilot CLI who ran
`afk:spec` (standalone or via `afk:pipeline`) and approved a PRD. They are
present at the keyboard at this moment — fast lane is an attended mode, unlike
the AFK pipeline.

## Happy path

1. User runs `afk:spec`; interview happens; PRD is written and approved (existing flow, unchanged).
2. `afk:spec` estimates the size of the approved PRD: **small = ≤3 points, or would cut into ≤2 slices** (reuses the sizing-gate rubric). When in doubt, treat as big.
3. If small, present the lane choice (AskUserQuestion in Claude Code, plain-text question in Copilot CLI), with **fast lane recommended**:
   - **Fast lane** — implement the whole PRD in one go.
   - **Full pipeline** — slice + ralph as today.
4. User picks fast lane → present the context choice, with **fresh chat recommended**:
   - **Fresh chat (recommended)** — `afk:spec` prints a copy-paste handoff prompt containing the PRD path and the fast-lane rules, so the implementation starts with a clean context budget.
   - **Stay in this chat** — dispatch **one** subagent to implement the entire PRD in one go, so the current conversation's context isn't burned on implementation detail.
5. Fast-lane implementation (in the fresh chat, or inside the single subagent):
   - Work on a feature branch, never main. No worktree required.
   - TDD applies — test-first, red-green.
   - Explore/read-only subagents are fine for reading files and research; no per-slice implementer dispatch, no slicing ceremony.
6. Done when the code and its tests are green. Tell the user they can invoke `afk:qa` or `afk:review` manually if they want the verification tail — neither runs automatically.

## Edge cases

- **Spec estimates big (5+ points / 3+ slices):** no fast-lane offer at all — the Iron Law (no big ticket in a single pass) holds. Flow is unchanged: next step is `afk:slice`.
- **Borderline estimate:** recommend the pipeline. The fast lane is an optimization, not a default.
- **`afk:spec` running as phase 1 of `afk:pipeline`:** the offer still appears when the estimate is small. Picking fast lane ends the pipeline run — the state file logs the decision and phases 2–7 are marked skipped.
- **User is currently on main when fast lane starts:** create a feature branch first, then implement.
- **Copilot CLI:** AskUserQuestion doesn't exist — ask as plain text (same pattern the interview section already uses); same-chat subagent dispatch uses the `task` tool per `references/copilot-tools.md`.
- **Mid-implementation size blowout:** explicitly not handled in this iteration (see Out of scope).

## Validation & error states

- The fresh-chat handoff prompt is only valid if the PRD file is already written to `docs/specs/` — it always is at this point in the flow, but the prompt must reference the real path, not a placeholder.
- If the user declines both lanes (Other/escape), `afk:spec` ends as it does today: approved PRD on disk, next steps named, nothing started.

## Data & integrations

- **`skills/spec/SKILL.md`** (existing, primary change): new "Fast Lane" section after "Write the PRD"; Integration section updated so "Next: afk:slice" becomes conditional on lane choice. Follows the existing Claude-Code-vs-Copilot phrasing convention already used for AskUserQuestion.
- **`skills/pipeline/SKILL.md`** (existing, minor): one note in Phase 1 that a fast-lane selection ends the run and how the state file records it.
- No new files, hooks, or config keys. No changes to `afk:slice`, `afk:ralph`, or the agents.

## Out of scope

- Mid-run escalation when a fast-lane task turns out bigger than estimated (deferred by decision).
- Automatic `afk:qa` / `afk:review` after fast-lane implementation.
- New LLM-in-the-loop tests (skill-triggering or parity suites).
- Worktree support for the fast lane.
- Changing the session-start sizing gate (`using-afk`) — it already routes small tasks away from the pipeline before a spec exists; this feature covers the case where the spec interview reveals smallness.

## Acceptance criteria

1. `skills/spec/SKILL.md` contains a Fast Lane section stating the size rubric (small = ≤3 points or ≤2 would-be slices; when in doubt, big) and that the offer appears only after PRD approval and only for small estimates.
2. The section instructs presenting two lanes with fast lane recommended for small specs, via AskUserQuestion in Claude Code and plain text in Copilot CLI.
3. On fast-lane selection, the skill instructs offering fresh-chat (recommended, with a copy-paste handoff prompt containing the real PRD path) vs. same-chat single-subagent execution.
4. The fast-lane rules in the skill text mandate: feature branch (never main), TDD, Explore-style subagents allowed for reading, no slicing, no per-slice implementer loops, done at green tests, optional manual `afk:qa`/`afk:review` named.
5. Big estimates produce no fast-lane offer; the skill still points to `afk:slice` as the next step.
6. `skills/pipeline/SKILL.md` documents that a fast-lane choice in phase 1 ends the pipeline run with the state file updated.
7. `tests/hooks/run-hook-tests.sh` passes and shellcheck (`find hooks tests -name '*.sh' -print0 | xargs -0 shellcheck -x -P SCRIPTDIR`) is clean.

## Open questions

(none)
