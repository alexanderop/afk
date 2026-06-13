import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { listFiles } from "../lib/fs";
import { fromPluginRoot, pluginDir } from "../lib/paths";
import { TestRun } from "../lib/runner";

const run = new TestRun();

const maxDescriptionChars = 1024;
const maxSkillLines = 500;
const maxAgentLines = 250;
const skillNamePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const requiredSkillSections = ["## When to Use", "## Process", "## Stop and Ask", "## Output"];
const supportedAgentModels = new Set(["inherit", "opus", "sonnet", "haiku", "fable"]);
const supportedAgentTools = new Set(["Agent", "Bash", "Edit", "Glob", "Grep", "Read", "Write"]);

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

  if (description.startsWith("Use when")) {
    run.pass(`${label}: description starts with 'Use when'`);
  } else {
    run.fail(`${label}: description starts with 'Use when'`, description);
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
  const tools = parseTools(frontmatterValue(parsed.frontmatter, "tools"));
  const model = frontmatterValue(parsed.frontmatter, "model");

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

  if (description.startsWith("Use when")) {
    run.pass(`${expectedName}: description starts with 'Use when'`);
  } else {
    run.fail(`${expectedName}: description starts with 'Use when'`, description);
  }

  if (supportedAgentModels.has(model)) {
    run.pass(`${expectedName}: model is supported`);
  } else {
    run.fail(`${expectedName}: model is supported`, model || "no model: line");
  }

  if (tools.length > 0 && tools.every((tool) => supportedAgentTools.has(tool))) {
    run.pass(`${expectedName}: tools are supported`);
  } else {
    run.fail(`${expectedName}: tools are supported`, tools.join(", ") || "no tools: line");
  }

  if (parsed.body.replace(/\s/g, "").length > 0) {
    run.pass(`${expectedName}: agent file has body content`);
  } else {
    run.fail(`${expectedName}: agent file has body content`);
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
checkNoShellTestPipeline();

run.summary();
process.exit(run.exitCode());
