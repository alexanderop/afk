// Shared lint thresholds and allowlists for skill/agent frontmatter checks.

export const maxDescriptionChars = 1024;
export const maxNameChars = 64;
export const maxSkillLines = 500;
export const maxAgentLines = 250;
export const skillNamePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const xmlTagPattern = /<[^>]+>/;
export const reservedNameWords = ["anthropic", "claude"];
export const requiredSkillSections = ["## When to Use", "## Process", "## Stop and Ask", "## Output"];
export const supportedAgentModels = new Set(["inherit", "opus", "sonnet", "haiku", "fable"]);
export const supportedAgentTools = new Set(["Agent", "Bash", "Edit", "Glob", "Grep", "Read", "Write"]);
export const allowedSkillContexts = new Set(["fork"]);
// Skills that MUST pin a specific context. qa is an isolated evidence-gathering task; context: fork
// keeps its verbose reads out of the main thread, so omitting it is a defect, not just an option.
export const requiredSkillContexts: Record<string, string> = {
  qa: "fork",
};
/**
 * afk's core cost/capability split, as data. A policed agent MUST pin its tier and declare its tool
 * allowlist explicitly: omitting `model` silently inherits the user's default tier, and omitting
 * `tools` silently inherits ALL tools — which would erase the read-only orchestrator guarantee.
 * `requiredTools` / `forbiddenTools` pin the tool shape that guarantee rests on. Everything the lint
 * knows about these agents lives here, so a third policed agent is one entry, not a new `if`.
 */
export type AgentPolicy = { model: string; requiredTools?: string[]; forbiddenTools?: string[] };
export const agentPolicies: Record<string, AgentPolicy> = {
  "implement-orchestrator": { model: "opus", forbiddenTools: ["Bash", "Edit", "Write"] },
  "implementation-worker": { model: "sonnet", requiredTools: ["Bash", "Edit", "Write"] },
};
// Mandatory in every SKILL.md / agent frontmatter; everything else must be in the allowed set.
export const requiredFrontmatterKeys = ["name", "description"];
export const allowedSkillKeys = new Set([
  "name",
  "description",
  "allowed-tools",
  "context",
  "license",
  "model",
  "metadata",
  "disable-model-invocation",
]);
// Full documented Claude Code subagent frontmatter field set (see code.claude.com/docs/en/sub-agents).
export const allowedAgentKeys = new Set([
  "name",
  "description",
  "tools",
  "disallowedTools",
  "model",
  "permissionMode",
  "maxTurns",
  "skills",
  "mcpServers",
  "hooks",
  "memory",
  "background",
  "effort",
  "isolation",
  "color",
  "initialPrompt",
]);
