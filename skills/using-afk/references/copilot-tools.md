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

- **`afk:ralph` / `afk:review`** dispatch fresh-context subagents. Use the
  `task` tool; paste the full prompt from the skill's prompt file
  (`implementer-prompt.md`, `spec-reviewer-prompt.md`, `reviewer-shared.md`)
  into the task prompt, exactly as the skill instructs.
- **`afk:qa`** drives the `agent-browser` CLI through `bash` — no mapping
  needed, it's a plain shell tool on every platform.
- Async shell sessions (`bash` with `async: true`, `write_bash`, `read_bash`)
  are useful for long-running dev servers during `afk:qa`.
