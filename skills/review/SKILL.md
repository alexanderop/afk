---
name: review
description: Use when a branch is ready for human eyes — runs a risk-tiered, multi-agent code review (security, quality, performance, docs specialists in parallel), then acts as coordinator to dedupe, judge severity, and produce one structured verdict.
---

# Review: Risk-Tiered Multi-Agent Review

## Overview

One model with one giant "review everything" prompt produces a firehose of vague
suggestions that developers learn to ignore. Specialists with tight scopes —
each told exactly what to flag AND what to ignore — produce few, real findings.

You are the **coordinator**. The specialists find; you judge. Bias toward
approval: a finding survives only if it's concrete, in changed code, and worth
a developer's attention.

## Step 1: Assess the Risk Tier

Look at the diff (`git diff {base}..HEAD --stat`):

| Tier | Condition | Reviewers |
|------|-----------|-----------|
| **Trivial** | ≤10 lines, ≤20 files, no security-sensitive paths | You review it yourself directly. No subagents. |
| **Lite** | ≤100 lines, ≤20 files | `code-quality-reviewer` + `docs-reviewer` |
| **Full** | >100 lines, OR >50 files, OR any security-sensitive file | All four specialists |

Security-sensitive paths always force **Full**: anything matching auth, login,
session, crypto, token, permission, payment, secret, or middleware/config that
guards requests.

Before dispatching, filter the noise: ignore lock files, generated files,
minified assets, snapshots, vendored deps — but never filter migrations.

## Step 2: Dispatch Specialists in Parallel

Spawn the tier's reviewers concurrently (agents: `security-reviewer`,
`code-quality-reviewer`, `performance-reviewer`, `docs-reviewer`). Give each:

- The base ref and branch (they read the diff themselves).
- The PRD path, if one exists, for intent.
- The instruction to follow `reviewer-shared.md` from this skill's directory
  (paste its content into the prompt).

Each returns structured findings with severity: `critical` / `warning` /
`suggestion`.

## Step 3: The Judge Pass

Consolidate before reporting:

1. **Deduplicate** — same issue from two specialists → keep once, in the best-fitting section.
2. **Verify** — for every `critical` and any finding you doubt: read the code yourself. Specialists hallucinate; the coordinator checks. Drop anything you can't confirm at a specific file:line.
3. **Re-judge severity** — against the rubric in `reviewer-shared.md`. Speculative risks and nitpicks get dropped, not downgraded.

## Step 4: Verdict

| Findings | Verdict |
|----------|---------|
| None, or only suggestions | **APPROVED** (suggestions listed, non-blocking) |
| Warnings, no risk pattern | **APPROVED WITH COMMENTS** |
| Multiple warnings forming a pattern | **NEEDS ATTENTION** — human should look before merge |
| Any confirmed critical | **CHANGES REQUIRED** — route fixes to afk:ralph, then re-review |

Write the report (to `qa/review-<slug>.md` when run inside a pipeline):
verdict first, then findings grouped by severity, each with file:line, what's
wrong, why it matters, and a concrete fix. End with one paragraph for the human
reviewer: what this branch does and where to focus their attention.

On re-review after fixes: only re-verify the previous findings plus the new
diff. Don't re-litigate the approved parts.

## Red Flags

| Thought | Reality |
|---------|---------|
| "More findings = more thorough" | Noise teaches developers to ignore the review. Few and real beats many and maybe. |
| "The security reviewer flagged it, must be real" | Specialists overflag. You verify criticals by reading the code. |
| "This warning could theoretically matter" | If it needs 'theoretically', it's dropped. Concrete or gone. |
| "It's a small diff but touches auth, lite tier is fine" | Security-sensitive paths force Full tier. Always. |
| "I'll soften the verdict, the user worked hard on this" | The branch was written by agents. Spare the feelings budget; flag the bug. |

## Integration

- Supporting file: `reviewer-shared.md` (severity rubric + global what-not-to-flag).
- Specialist agents ship with this plugin: `security-reviewer`, `code-quality-reviewer`, `performance-reviewer`, `docs-reviewer`.
- Critical findings route back to **afk:ralph**. Called by **afk:pipeline** as phase 6.
