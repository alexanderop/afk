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
| **Trivial** | ≤10 lines AND ≤3 files, no security-sensitive paths | You review it yourself directly. No subagents. |
| **Lite** | ≤100 lines AND ≤20 files, no security-sensitive paths | `code-quality-reviewer` + `docs-reviewer` |
| **Full** | Everything bigger — OR any security-sensitive file, at any size | All four specialists |

Security-sensitive paths always force **Full**: anything matching auth, login,
session, crypto, token, permission, payment, secret, or middleware/config that
guards requests.

Before dispatching, filter the noise: ignore lock files, generated files,
minified assets, snapshots, vendored deps — but never filter migrations.

## Step 2: Dispatch Specialists in Parallel

Spawn the tier's reviewers concurrently (agents: `security-reviewer`,
`code-quality-reviewer`, `performance-reviewer`, `docs-reviewer`). The severity
rubric, evidence standard, and output format are baked into each agent's
definition — the dispatch prompt only needs:

- The base ref and branch (they read the diff themselves).
- The PRD path, if one exists, for intent.
- Relevant `.afk/brain/` notes, if any exist — especially false-positive
  patterns banked by `afk:reflect`, so known noise doesn't resurface.

Each returns structured findings with severity: `critical` / `warning` /
`suggestion`.

**Custom reviewers.** Teams add repo-local specialists as `.afk/reviewers/*.md`
(format in `afk:setup`). For each file, read its frontmatter and spawn it only
if both match:

- `paths` (glob list) matches at least one file in the filtered diff — absent
  means always matches.
- `tier` includes the current tier: `lite` joins Lite and Full, `full` (the
  default) joins Full only. Custom reviewers never run on Trivial.

Dispatch each match as a general-purpose subagent in the same parallel batch.
Its prompt: the file's body, then the full contents of `reviewer-shared.md`,
then the same base ref / branch / PRD pointers the built-ins get. The appended
shared rules are what make their findings consolidatable — **on any conflict
about severity, output format, or what-not-to-flag, the shared rules win over
the body**. Custom reviewers earn no extra trust: their findings go through
Step 3 like everyone else's, tagged with the reviewer's `name` so noise traces
back to its file.

## Step 3: The Judge Pass

Consolidate before reporting:

1. **Deduplicate** — same file, line within ±3, same underlying issue = one
   finding. Keep it once, in the best-fitting section — but record the
   corroboration: two reviewers flagging it independently promotes its
   confidence one anchor (50→75, 75→100).
2. **Gate on confidence** — after promotion, drop non-critical findings below
   75. Criticals at 50 survive the gate, but only into the verify step — an
   unverified low-confidence critical never reaches the report.
3. **Verify** — for every `critical` and any finding you doubt: read the code yourself. Specialists hallucinate; the coordinator checks. Drop anything you can't confirm at a specific file:line.
4. **Re-judge severity** — against the rubric in `reviewer-shared.md`. Speculative risks and nitpicks get dropped, not downgraded.

## Step 4: Apply Mechanical Fixes

A finding whose fix costs less than its fix loop gets fixed here. **Mechanical**
means: one obvious change in one place, fully spelled out by the finding, no
design decision involved — a typo'd flag, the null check the reviewer quoted, a
doc line that lies.

Apply a fix directly only when ALL hold:

- Confidence 100, or 75 with corroboration.
- The working tree is the reviewed branch with nothing uncommitted.
- The change can't alter intended behavior beyond what the finding describes.

Then run the project's test + lint commands. Anything not green → revert every
applied fix and report them as ordinary findings. Green → one
`fix(review): <summary>` commit, and the findings move to an **Applied**
section of the report — they no longer count toward the verdict. Everything
non-mechanical routes as usual: criticals to afk:ralph, the rest to the report.

## Step 5: Verdict

| Findings | Verdict |
|----------|---------|
| None, or only suggestions | **APPROVED** (suggestions listed, non-blocking) |
| Warnings, no risk pattern | **APPROVED WITH COMMENTS** |
| Multiple warnings forming a pattern | **NEEDS ATTENTION** — human should look before merge |
| Any confirmed critical | **CHANGES REQUIRED** — route fixes to afk:ralph, then re-review |

Write the report (to `qa/review-<slug>.md` when run inside a pipeline):
verdict first, then findings grouped by severity, each with file:line, what's
wrong, why it matters, and a concrete fix; then the **Applied** section from
Step 4, if any. Findings from a custom reviewer
keep its tag (e.g. `[vue-reviewer]`) so the team can tune the file behind a
noisy rule. End with one paragraph for the human
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
| "The custom reviewer's file defines its own output format, I'll honor it" | The appended shared rules win every conflict. One format, or the judge pass can't consolidate. |
| "While I'm applying fixes, I'll clean up the rest too" | A review that rewrites the branch isn't a review. Mechanical, gated, test-guarded — or it goes in the report. |

## Integration

- Supporting file: `reviewer-shared.md` (the coordinator's copy of the severity rubric + global what-not-to-flag, used in the judge pass; each specialist agent embeds the same rules — keep them in sync when editing).
- Specialist agents ship with this plugin: `security-reviewer`, `code-quality-reviewer`, `performance-reviewer`, `docs-reviewer`.
- Repo-local custom reviewers: `.afk/reviewers/*.md`, defined by the team, dispatched in Step 2 (see `afk:setup` Part 4 for the file format).
- Critical findings route back to **afk:ralph**. Called by **afk:pipeline** as phase 6.
