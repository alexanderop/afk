import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { listFiles } from "../lib/fs";
import { fromPluginRoot, pluginDir } from "../lib/paths";
import { TestRun } from "../lib/runner";

const run = new TestRun();

const maxDescriptionChars = 1024;
const maxSkillLines = 500;
const skillNamePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const requiredSkillSections = ["## When to Use", "## Process", "## Stop and Ask", "## Output"];

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
checkNoShellTestPipeline();

run.summary();
process.exit(run.exitCode());
