import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { listFiles } from "../lib/fs";
import { fromPluginRoot, pluginDir } from "../lib/paths";
import { TestRun } from "../lib/runner";

const run = new TestRun();

const maxDescriptionChars = 1024;
const maxNameChars = 64;
const maxSkillLines = 500;
const maxAgentLines = 250;
const skillNamePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const xmlTagPattern = /<[^>]+>/;
const reservedNameWords = ["anthropic", "claude"];
const requiredSkillSections = ["## When to Use", "## Process", "## Stop and Ask", "## Output"];
const supportedAgentModels = new Set(["inherit", "opus", "sonnet", "haiku", "fable"]);
const supportedAgentTools = new Set(["Agent", "Bash", "Edit", "Glob", "Grep", "Read", "Write"]);
const allowedSkillContexts = new Set(["fork"]);
// Skills that MUST pin a specific context. qa is an isolated evidence-gathering task; context: fork
// keeps its verbose reads out of the main thread, so omitting it is a defect, not just an option.
const requiredSkillContexts: Record<string, string> = {
  qa: "fork",
};
// afk's core cost/capability split. These named agents MUST pin their tier and declare their tool
// allowlist explicitly: omitting `model` silently inherits the user's default tier, and omitting
// `tools` silently inherits ALL tools — which would erase the read-only orchestrator guarantee.
const requiredAgentModels: Record<string, string> = {
  "implement-orchestrator": "opus",
  "implementation-worker": "sonnet",
};
const agentsRequiringTools = new Set(["implement-orchestrator", "implementation-worker"]);
// Mandatory in every SKILL.md / agent frontmatter; everything else must be in the allowed set.
const requiredFrontmatterKeys = ["name", "description"];
const allowedSkillKeys = new Set(["name", "description", "allowed-tools", "context", "license", "model", "metadata", "disable-model-invocation"]);
// Full documented Claude Code subagent frontmatter field set (see code.claude.com/docs/en/sub-agents).
const allowedAgentKeys = new Set([
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
  // Experimental observer-agent pairing (CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS).
  "observer",
  "observerMessage",
]);

function rel(path: string): string {
  return relative(pluginDir, path);
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function readJson(path: string): unknown {
  return JSON.parse(readText(path));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertJsonFile(path: string, label: string): unknown | undefined {
  try {
    const json = readJson(path);
    run.pass(`${label} is valid JSON`);
    return json;
  } catch (error) {
    run.fail(`${label} is valid JSON`, String(error));
    return undefined;
  }
}

function checkPluginManifests(): void {
  run.section("manifests");

  const pluginJsonPath = fromPluginRoot(".claude-plugin", "plugin.json");
  const pluginJson = assertJsonFile(pluginJsonPath, "plugin.json");
  if (isObject(pluginJson) && typeof pluginJson.name === "string" && typeof pluginJson.version === "string") {
    run.pass("plugin.json has name and version");
  } else {
    run.fail("plugin.json has name and version");
  }

  for (const manifest of listFiles(fromPluginRoot(".claude-plugin"), (path) => path.endsWith(".json"))) {
    if (basename(manifest) === "plugin.json") {
      continue;
    }
    assertJsonFile(manifest, basename(manifest));
  }
}

function checkSkills(): void {
  run.section("skills");

  for (const skill of listFiles(fromPluginRoot("skills"), (path) => basename(path) === "SKILL.md")) {
    const dirName = basename(dirname(skill));
    checkSkillFrontmatter(skill, dirName);

    const lineCount = readText(skill).split("\n").length - 1;
    if (lineCount <= maxSkillLines) {
      run.pass(`${dirName}: SKILL.md within ${maxSkillLines} lines (${lineCount})`);
    } else {
      run.fail(`${dirName}: SKILL.md within ${maxSkillLines} lines (${lineCount})`, "move detail into references/ files");
    }
  }
}

function checkSkillFrontmatter(file: string, expectedName: string): void {
  const label = expectedName;
  const lines = readText(file).split("\n");

  if (lines[0] !== "---") {
    run.fail(`${label}: frontmatter opens on line 1`);
    return;
  }

  const closeIndex = lines.slice(1).findIndex((line) => line === "---");
  if (closeIndex === -1) {
    run.fail(`${label}: frontmatter is closed`);
    return;
  }

  const frontmatter = lines.slice(1, closeIndex + 1);
  const body = lines.slice(closeIndex + 2).join("\n");
  const actualName = frontmatter.find((line) => line.startsWith("name:"))?.replace(/^name:\s*/, "") ?? "";
  const description = frontmatter.find((line) => line.startsWith("description:"))?.replace(/^description:\s*/, "") ?? "";

  checkFrontmatterKeys(label, frontmatterKeys(frontmatter), allowedSkillKeys);

  if (actualName === expectedName) {
    run.pass(`${label}: name matches '${expectedName}'`);
  } else {
    run.fail(`${label}: name matches '${expectedName}'`, actualName || "no name: line");
  }

  if (skillNamePattern.test(actualName)) {
    run.pass(`${label}: name is lowercase kebab-case`);
  } else {
    run.fail(`${label}: name is lowercase kebab-case`, actualName);
  }

  checkNameRules(label, actualName);

  if (description.length > 0) {
    run.pass(`${label}: description present`);
  } else {
    run.fail(`${label}: description present (single-line 'description:' in frontmatter)`);
    return;
  }

  if (description.length <= maxDescriptionChars) {
    run.pass(`${label}: description within ${maxDescriptionChars} chars (${description.length})`);
  } else {
    run.fail(`${label}: description within ${maxDescriptionChars} chars (${description.length})`);
  }

  checkDescriptionRules(label, description);

  if (description.startsWith("Use when")) {
    run.pass(`${label}: description starts with 'Use when'`);
  } else {
    run.fail(`${label}: description starts with 'Use when'`, description);
  }

  const context = frontmatterValue(frontmatter, "context");
  if (!context || allowedSkillContexts.has(context)) {
    run.pass(`${label}: context value is supported`);
  } else {
    run.fail(`${label}: context value is supported`, context);
  }

  const requiredContext = requiredSkillContexts[expectedName];
  if (requiredContext) {
    if (context === requiredContext) {
      run.pass(`${label}: declares required context: ${requiredContext}`);
    } else {
      run.fail(`${label}: declares required context: ${requiredContext}`, context || "no context: line");
    }
  }

  if (body.replace(/\s/g, "").length > 0) {
    run.pass(`${label}: SKILL.md has body content`);
  } else {
    run.fail(`${label}: SKILL.md has body content`);
  }

  for (const section of requiredSkillSections) {
    if (lines.includes(section)) {
      run.pass(`${label}: required section '${section}' exists`);
    } else {
      run.fail(`${label}: required section '${section}' exists`);
    }
  }
}

function parseFrontmatter(file: string, label: string): { frontmatter: string[]; body: string } | undefined {
  const lines = readText(file).split("\n");

  if (lines[0] !== "---") {
    run.fail(`${label}: frontmatter opens on line 1`);
    return undefined;
  }

  const closeIndex = lines.slice(1).findIndex((line) => line === "---");
  if (closeIndex === -1) {
    run.fail(`${label}: frontmatter is closed`);
    return undefined;
  }

  return {
    frontmatter: lines.slice(1, closeIndex + 1),
    body: lines.slice(closeIndex + 2).join("\n"),
  };
}

function frontmatterValue(frontmatter: string[], key: string): string {
  return frontmatter.find((line) => line.startsWith(`${key}:`))?.replace(new RegExp(`^${key}:\\s*`), "") ?? "";
}

function parseTools(value: string): string[] {
  return value
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean);
}

function frontmatterKeys(frontmatter: string[]): string[] {
  return frontmatter
    .filter((line) => /^[A-Za-z][\w-]*:/.test(line))
    .map((line) => line.slice(0, line.indexOf(":")));
}

function checkFrontmatterKeys(label: string, keys: string[], allowed: Set<string>): void {
  for (const required of requiredFrontmatterKeys) {
    if (keys.includes(required)) {
      run.pass(`${label}: required field '${required}' present`);
    } else {
      run.fail(`${label}: required field '${required}' present`);
    }
  }

  const unknown = keys.filter((key) => !allowed.has(key));
  if (unknown.length === 0) {
    run.pass(`${label}: only allowed frontmatter keys`);
  } else {
    run.fail(`${label}: only allowed frontmatter keys`, `unsupported: ${unknown.join(", ")}`);
  }
}

function checkNameRules(label: string, name: string): void {
  if (name.length <= maxNameChars) {
    run.pass(`${label}: name within ${maxNameChars} chars (${name.length})`);
  } else {
    run.fail(`${label}: name within ${maxNameChars} chars (${name.length})`);
  }

  if (!xmlTagPattern.test(name)) {
    run.pass(`${label}: name has no XML tags`);
  } else {
    run.fail(`${label}: name has no XML tags`, name);
  }

  const reserved = reservedNameWords.filter((word) => name.toLowerCase().includes(word));
  if (reserved.length === 0) {
    run.pass(`${label}: name has no reserved words`);
  } else {
    run.fail(`${label}: name has no reserved words`, reserved.join(", "));
  }
}

function checkDescriptionRules(label: string, description: string): void {
  if (!xmlTagPattern.test(description)) {
    run.pass(`${label}: description has no XML tags`);
  } else {
    run.fail(`${label}: description has no XML tags`, description);
  }
}

function checkAgents(): void {
  run.section("agents");

  const agentFiles = existsSync(fromPluginRoot("agents")) ? listFiles(fromPluginRoot("agents"), (path) => path.endsWith(".md")) : [];
  if (agentFiles.length > 0) {
    run.pass("agents directory has agent definitions");
  } else {
    run.fail("agents directory has agent definitions");
    return;
  }

  for (const agent of agentFiles) {
    checkAgentFrontmatter(agent);

    const lineCount = readText(agent).split("\n").length - 1;
    const label = basename(agent, ".md");
    if (lineCount <= maxAgentLines) {
      run.pass(`${label}: agent file within ${maxAgentLines} lines (${lineCount})`);
    } else {
      run.fail(`${label}: agent file within ${maxAgentLines} lines (${lineCount})`);
    }
  }
}

function checkAgentFrontmatter(file: string): void {
  const expectedName = basename(file, ".md");
  const parsed = parseFrontmatter(file, expectedName);
  if (!parsed) {
    return;
  }

  const name = frontmatterValue(parsed.frontmatter, "name");
  const description = frontmatterValue(parsed.frontmatter, "description");
  const keys = frontmatterKeys(parsed.frontmatter);
  const hasTools = keys.includes("tools");
  const hasModel = keys.includes("model");
  const tools = parseTools(frontmatterValue(parsed.frontmatter, "tools"));
  const model = frontmatterValue(parsed.frontmatter, "model");

  checkFrontmatterKeys(expectedName, keys, allowedAgentKeys);

  if (name === expectedName) {
    run.pass(`${expectedName}: name matches filename`);
  } else {
    run.fail(`${expectedName}: name matches filename`, name || "no name: line");
  }

  if (skillNamePattern.test(name)) {
    run.pass(`${expectedName}: name is lowercase kebab-case`);
  } else {
    run.fail(`${expectedName}: name is lowercase kebab-case`, name);
  }

  checkNameRules(expectedName, name);

  if (description.length > 0) {
    run.pass(`${expectedName}: description present`);
  } else {
    run.fail(`${expectedName}: description present`);
  }

  if (description.length <= maxDescriptionChars) {
    run.pass(`${expectedName}: description within ${maxDescriptionChars} chars (${description.length})`);
  } else {
    run.fail(`${expectedName}: description within ${maxDescriptionChars} chars (${description.length})`);
  }

  checkDescriptionRules(expectedName, description);

  if (description.startsWith("Use when")) {
    run.pass(`${expectedName}: description starts with 'Use when'`);
  } else {
    run.fail(`${expectedName}: description starts with 'Use when'`, description);
  }

  // The two named afk agents MUST pin their exact tier; for everyone else `model` is optional.
  const requiredModel = requiredAgentModels[expectedName];
  if (requiredModel) {
    if (model === requiredModel) {
      run.pass(`${expectedName}: model pinned to '${requiredModel}'`);
    } else {
      run.fail(`${expectedName}: model pinned to '${requiredModel}'`, model || "no model: line (omitting it inherits the user's default tier)");
    }
  } else if (!hasModel) {
    run.pass(`${expectedName}: model omitted (optional)`);
  } else if (supportedAgentModels.has(model)) {
    run.pass(`${expectedName}: model is supported`);
  } else {
    run.fail(`${expectedName}: model is supported`, model || "empty model: line");
  }

  // The two named afk agents MUST declare a tools allowlist; omitting it inherits ALL tools.
  if (agentsRequiringTools.has(expectedName) && !hasTools) {
    run.fail(`${expectedName}: declares a tools allowlist`, "no tools: line (omitting it inherits ALL tools, erasing least-privilege)");
  } else if (!hasTools) {
    run.pass(`${expectedName}: tools omitted (optional)`);
  } else if (tools.length > 0 && tools.every((tool) => supportedAgentTools.has(tool))) {
    run.pass(`${expectedName}: tools are supported`);
  } else {
    run.fail(`${expectedName}: tools are supported`, tools.join(", ") || "empty tools: line");
  }

  // disallowedTools (defense-in-depth denylist): when declared, values must be real tools and must
  // not contradict the tools allowlist.
  if (keys.includes("disallowedTools")) {
    const disallowed = parseTools(frontmatterValue(parsed.frontmatter, "disallowedTools"));
    if (disallowed.length > 0 && disallowed.every((tool) => supportedAgentTools.has(tool))) {
      run.pass(`${expectedName}: disallowedTools are supported`);
    } else {
      run.fail(`${expectedName}: disallowedTools are supported`, disallowed.join(", ") || "empty disallowedTools: line");
    }

    const contradiction = disallowed.filter((tool) => tools.includes(tool));
    if (contradiction.length === 0) {
      run.pass(`${expectedName}: disallowedTools and tools do not overlap`);
    } else {
      run.fail(`${expectedName}: disallowedTools and tools do not overlap`, contradiction.join(", "));
    }
  }

  if (parsed.body.replace(/\s/g, "").length > 0) {
    run.pass(`${expectedName}: agent file has body content`);
  } else {
    run.fail(`${expectedName}: agent file has body content`);
  }

  // observer: must name an existing agent in this plugin, and that agent must not
  // declare an observer itself — the harness ignores observers-on-observers.
  if (keys.includes("observer")) {
    const observerName = frontmatterValue(parsed.frontmatter, "observer");
    const observerFile = fromPluginRoot("agents", `${observerName}.md`);
    if (observerName.length > 0 && existsSync(observerFile)) {
      run.pass(`${expectedName}: observer points at an existing agent`);
      const observerParsed = parseFrontmatter(observerFile, observerName);
      if (observerParsed && frontmatterKeys(observerParsed.frontmatter).includes("observer")) {
        run.fail(`${expectedName}: observer agent does not declare its own observer`, observerName);
      } else {
        run.pass(`${expectedName}: observer agent does not declare its own observer`);
      }
    } else {
      run.fail(`${expectedName}: observer points at an existing agent`, observerName || "empty observer: line");
    }
  }

  if (expectedName === "implement-orchestrator") {
    const denied = ["Bash", "Edit", "Write"].filter((tool) => tools.includes(tool));
    if (denied.length === 0) {
      run.pass("implement-orchestrator excludes write and shell tools");
    } else {
      run.fail("implement-orchestrator excludes write and shell tools", denied.join(", "));
    }
  }

  if (expectedName === "implementation-worker") {
    const required = ["Bash", "Edit", "Write"].filter((tool) => !tools.includes(tool));
    if (required.length === 0) {
      run.pass("implementation-worker includes edit, write, and shell tools");
    } else {
      run.fail("implementation-worker includes edit, write, and shell tools", required.join(", "));
    }
  }
}

function checkBrainIndexHook(): void {
  run.section("brain index hook");

  const hook = fromPluginRoot("hooks", "auto-index-brain.sh");
  const dir = mkdtempSync(join(tmpdir(), "afk-brain-"));
  try {
    mkdirSync(join(dir, "brain", "principles"), { recursive: true });
    mkdirSync(join(dir, "brain", "codebase"), { recursive: true });
    // A note with a summary line under its title.
    writeFileSync(join(dir, "brain", "principles", "prove-it-works.md"), "# Prove It Works\n\nNever claim done without evidence the change runs.\n\n- Show output\n");
    // A note whose first content is a bullet (marker should be stripped).
    writeFileSync(join(dir, "brain", "codebase", "deploy-gotchas.md"), "# Deploy Gotchas\n- Staging mirrors prod env vars\n");
    // A note with only a title — no description available.
    writeFileSync(join(dir, "brain", "principles.md"), "# Principles\n");

    const indexPath = join(dir, "brain", "index.md");
    const exec = () => execFileSync("bash", [hook], { input: "{}", env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });

    exec();
    const index = readFileSync(indexPath, "utf8");

    if (index.includes("[[principles/prove-it-works]] — Never claim done without evidence the change runs.")) {
      run.pass("brain index: summary line becomes the entry description");
    } else {
      run.fail("brain index: summary line becomes the entry description", index);
    }

    if (index.includes("[[codebase/deploy-gotchas]] — Staging mirrors prod env vars")) {
      run.pass("brain index: leading list marker stripped from description");
    } else {
      run.fail("brain index: leading list marker stripped from description", index);
    }

    if (/- \[\[principles\]\]\s*$/m.test(index)) {
      run.pass("brain index: title-only note stays a bare wikilink");
    } else {
      run.fail("brain index: title-only note stays a bare wikilink", index);
    }

    exec();
    if (readFileSync(indexPath, "utf8") === index) {
      run.pass("brain index: rebuild is idempotent");
    } else {
      run.fail("brain index: rebuild is idempotent");
    }
  } catch (error) {
    run.fail("brain index hook runs", String(error));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function checkNoShellTestPipeline(): void {
  run.section("test pipeline");

  const shellTests = listFiles(fromPluginRoot("tests"), (path) => path.endsWith(".sh"));
  if (shellTests.length === 0) {
    run.pass("tests pipeline has no .sh runners");
  } else {
    run.fail("tests pipeline has no .sh runners", shellTests.map(rel).join(", "));
  }
}

console.log("=== Unit tests (Bun, zero-token) ===");

checkPluginManifests();
checkSkills();
checkAgents();
checkBrainIndexHook();
checkNoShellTestPipeline();

run.summary();
process.exit(run.exitCode());
