# Copilot CLI Tool Mapping

afk skills are written with Claude Code tool names in mind. When you encounter
these in a skill, use your platform equivalent:

| Skill references | Copilot CLI equivalent |
|-----------------|----------------------|
| `Read` (file reading) | `view` |
| `Write` (file creation) | `create` |
| `Edit` (file editing) | `edit` |
| `Bash` (run commands) | `bash` |
| `Grep` (search file content) | `grep` |
| `Glob` (search files by name) | `glob` |
| `Skill` tool (invoke a skill) | `skill` |
| `WebFetch` | `web_fetch` |
| Dispatch a subagent (e.g. the ralph implementer, review specialists) | `task` with the matching `agent_type` (plugin agents like `security-reviewer`), or `"general-purpose"` for ad-hoc prompts |
| Multiple parallel subagents | Multiple `task` calls |
| Subagent status/output | `read_agent`, `list_agents` |
| `TodoWrite` / task tracking | `sql` with the built-in `todos` table |
| `WebSearch` | No equivalent — use `web_fetch` with a search engine URL |

## Notes for afk skills

- **Session start:** if the plugin's hooks didn't run (no sizing gate in your
  context), the gate should still be in the project's CLAUDE.md — `afk:setup`
  embeds it there as a backstop. The `using-afk` skill itself is
  manual-invocation-only (`disable-model-invocation`), so the *user* loads it
  via the slash-command picker; don't try to invoke it yourself.
  Same for project memory: read `.afk/brain/index.md` when it exists.
- **`afk:ralph` / `afk:review`** dispatch fresh-context subagents. Use the
  `task` tool with the matching plugin agent type (`implementer`,
  `spec-reviewer`, `security-reviewer`, etc.) — the iron laws, rubrics, and
  report formats are baked into the agent definitions, so the task prompt only
  needs the slice/branch-specific context the skill lists.
- **`context: fork` skills** (`afk:qa`, `afk:refactor-pass`) run as subagents
  in Claude Code. In Copilot, run them via `task` with `"general-purpose"`,
  passing the skill's body as the prompt.
- **`afk:qa`** drives the `agent-browser` CLI through `bash` — no mapping
  needed, it's a plain shell tool on every platform.
- Async shell sessions (`bash` with `async: true`, `write_bash`, `read_bash`)
  are useful for long-running dev servers during `afk:qa`.
