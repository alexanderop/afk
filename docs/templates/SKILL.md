---
name: skill-name
description: Use when [specific trigger, symptom, user request, or workflow state]
---

# Skill Name

One or two sentences explaining the skill's purpose and core principle.
State the invariant this skill protects.

## When to Use

Use this skill when:

- [Concrete user phrase, artifact state, symptom, or situation]
- [Another trigger future agents are likely to search for]

Do not use this skill for:

- [Nearby case that belongs to another skill or normal project instructions]

## Process

1. [First required action]
2. [Second required action]
3. [Verification or handoff action]

Write steps as commands to the agent. If a step depends on another file, name
that file and say exactly when to open it.

## Stop and Ask

STOP and ask the user when:

- [A missing decision would change the implementation or output]
- [Continuing would require unsafe guessing, credentials, or destructive work]

Do not ask about facts that can be discovered by reading the repo.

## Red Flags

| Thought | Reality |
|---------|---------|
| "[Tempting shortcut]" | [Why it fails and what to do instead] |
| "[Another predictable rationalization]" | [Correct behavior] |

## Output

Return this shape:

```markdown
[Expected final response, artifact, or report format]
```

If the skill produces a file, name the path pattern and the handoff skill or
next workflow step.

## References

- [supporting-file.md](./supporting-file.md) - when to open it
- `related-skill-name` - when this skill should defer to it
