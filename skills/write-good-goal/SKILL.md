---
name: write-good-goal
description: Help the user turn a vague intention into a concrete /goal condition for Codex or Claude Code. Use when the user asks to write, refine, improve, validate, or draft a goal, completion condition, objective, success criteria, or definition of done for long-running agent work.
---

# Write Good Goal

Help the user write a high-quality `/goal` condition. The skill produces the
goal text; it does not start implementation work.

Do not run `/goal` yourself unless the user explicitly approves the final
wording and asks you to set it.

## Process

1. Identify the user's intended outcome.
2. If the request is vague, ask only the minimum questions needed to make the
   goal verifiable.
3. Convert the intent into a single completion condition that an agent can
   evaluate from its own transcript.
4. Include the desired end state, proof, constraints, and a stop bound when the
   work could run too long.
5. Avoid goals that depend on hidden state, unstated preferences, or subjective
   quality judgment.

## Good Goal Shape

Use this structure:

```text
Achieve [specific outcome]. Prove it by [verification]. Preserve [constraints]. Stop if [limit].
```

If a shorter form is clearer, keep the same information but remove labels.

## Quality Checks

Before presenting the final goal, check that it is:

- Specific: names the thing to change, build, finish, or verify.
- Measurable: has a test, command, metric, count, artifact, checklist, or
  observable acceptance criterion.
- Agent-observable: the agent can surface proof in the transcript.
- Bounded: includes scope and, when useful, turn or time limits.
- Non-ambiguous: avoids words like "better", "clean", "done", or "complete"
  unless they are defined by concrete evidence.

## Strong Examples

```text
/goal Migrate the auth package to the new token verifier. Prove it by running `pnpm test auth` and `pnpm run typecheck` successfully. Preserve the public login API and do not modify unrelated tests. Stop after 12 turns if the verifier migration is still blocked.
```

```text
/goal Reduce the dashboard initial load time below 1 second in the local production build. Prove it with a Lighthouse or browser timing report captured after `pnpm run build && pnpm run preview`. Preserve existing dashboard features and visual layout.
```

```text
/goal Implement every acceptance criterion in `docs/plans/billing-retry.md`. Prove it by listing each criterion with PASS evidence and running the plan's verification commands successfully. Do not change payment provider credentials or production config. Stop after 20 turns.
```

## Weak Patterns To Repair

- "Make this better" -> define what better means and how to prove it.
- "Finish the migration" -> name the migration scope and verification command.
- "Fix all bugs" -> name the bug source, queue, issue label, failing command,
  or maximum number of issues.
- "Clean up the code" -> define target files and measurable cleanup criteria.

## Output

Return this compact shape:

```markdown
Recommended `/goal`:
<single command or condition>

Why this works:
<one or two sentences>

Assumptions:
<short bullets, or "None">

Optional tighter version:
<only include when a safer or more bounded variant is useful>
```

If the user gave enough detail, do not interview them. Produce the goal
directly.
