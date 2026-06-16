# Prototype

Invoke as `/afk:prototype`. Use it when you want to answer one observable question (try a UI direction, push a state model through edge cases, or feel out an API shape) before committing to a plan or implementation.

## What it does

Prototype produces throwaway code that answers one question fast. It routes to one of two branches: a logic/state/API prototype (a small interactive terminal app over a portable pure module) or a UI/visual prototype (structurally different variants with a `?variant=` switcher). The artifact is marked throwaway from day one (`prototype` appears in the file, route, or directory name), and it uses the project's existing task runner with no new runtime.

- Prototypes use in-memory state by default; any scratch file is named `PROTOTYPE-WIPE-ME`.
- No production polish: no tests, no broad abstractions, no defensive error handling beyond keeping it runnable.
- After the question is answered, the prototype is deleted or its winning idea is absorbed into real code via `afk:implement`.

**Output artifact:** `docs/prototypes/<slug>.md` with the question, artifact path, run command, verdict, and decision (delete / absorb / continue exploring).

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/prototype/SKILL.md)
