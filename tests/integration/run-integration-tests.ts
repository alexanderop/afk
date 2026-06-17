import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { listFiles, stripMarkdownCodeBlocks } from "../lib/fs";
import { fromPluginRoot, pluginDir } from "../lib/paths";
import { TestRun } from "../lib/runner";

const run = new TestRun();

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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

function skillNames(): string[] {
  return listFiles(fromPluginRoot("skills"), (path) => basename(path) === "SKILL.md")
    .map((path) => basename(dirname(path)))
    .sort();
}

const validSkills = new Set(skillNames());

function hasSkill(name: string): boolean {
  return validSkills.has(name);
}

function agentNames(): string[] {
  const agentRoot = fromPluginRoot("agents");
  if (!existsSync(agentRoot)) {
    return [];
  }

  return listFiles(agentRoot, (path) => path.endsWith(".md"))
    .map((path) => basename(path, ".md"))
    .sort();
}

const validAgents = new Set(agentNames());

function hasAgent(name: string): boolean {
  return validAgents.has(name);
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

function resolveFileRef(src: string, ref: string): boolean {
  if (!ref || /^https?:\/\//.test(ref) || ref.startsWith("mailto:") || ref.startsWith("#")) {
    return true;
  }

  const normalizedRef = ref.split("#")[0].split("?")[0];
  return [join(dirname(src), normalizedRef), fromPluginRoot(normalizedRef)].some((candidate) => existsSync(candidate));
}

function checkEvalSpecs(): void {
  run.section("eval specs");

  const evalRoot = fromPluginRoot("tests", "e2e", "evals", "specs");
  if (!existsSync(evalRoot)) {
    run.fail("tests/e2e/evals/specs directory exists");
    return;
  }

  for (const evalJsonPath of listFiles(evalRoot, (path) => path.endsWith(".json"))) {
    const json = assertJsonFile(evalJsonPath, rel(evalJsonPath));
    if (!json) {
      continue;
    }

    const fileName = basename(evalJsonPath);
    const evalSkill = basename(dirname(evalJsonPath));

    if (hasSkill(evalSkill)) {
      run.pass(`${rel(evalJsonPath)} belongs to an existing skill`);
    } else {
      run.fail(`${rel(evalJsonPath)} belongs to an existing skill`, evalSkill);
    }

    if (fileName === "evals.json") {
      checkBehavioralEvalSpec(evalJsonPath, json, evalSkill);
    } else {
      run.fail(`${rel(evalJsonPath)} has recognized eval filename`, fileName);
    }
  }
}

function checkBehavioralEvalSpec(path: string, json: unknown, evalSkill: string): void {
  if (!isObject(json)) {
    run.fail(`${rel(path)} is an object`);
    return;
  }

  if (json.skill_name === evalSkill) {
    run.pass(`${rel(path)} skill_name matches directory`);
  } else {
    run.fail(`${rel(path)} skill_name matches directory`, `skill_name=${String(json.skill_name)}, dir=${evalSkill}`);
  }

  if (!Array.isArray(json.evals) || json.evals.length === 0) {
    run.fail(`${rel(path)} has at least one eval`);
    return;
  }

  run.pass(`${rel(path)} has at least one eval`);

  const entriesAreValid = json.evals.every((entry) => {
    if (!isObject(entry)) {
      return false;
    }
    const assertions = isObject(entry.assertions) ? entry.assertions : {};
    const isRouting = entry.kind === "routing";
    const kindOk = entry.kind === undefined || entry.kind === "judged" || entry.kind === "routing";
    // Routing cases are code-graded via a routing block and carry no expectations;
    // judged cases keep the LLM-judged expectations array.
    const expectationsOk = isRouting ? entry.expectations === undefined : isStringArray(entry.expectations);
    const routing = isObject(entry.routing) ? entry.routing : {};
    const routingOk = isRouting
      ? isObject(entry.routing) &&
        isStringArray(routing.expect ?? []) &&
        (routing.expect ?? []).length > 0 &&
        isStringArray(routing.forbid ?? []) &&
        (routing.overblock_guard === undefined || typeof routing.overblock_guard === "boolean")
      : entry.routing === undefined;
    return (
      typeof entry.id === "string" &&
      entry.id.length > 0 &&
      typeof entry.prompt === "string" &&
      entry.prompt.length > 0 &&
      typeof entry.expected_output === "string" &&
      entry.expected_output.length > 0 &&
      kindOk &&
      expectationsOk &&
      routingOk &&
      isStringArray(assertions.required_substrings ?? []) &&
      isStringArray(assertions.forbidden_substrings ?? []) &&
      isStringArray(assertions.required_files ?? []) &&
      isObject(assertions.required_file_substrings ?? {}) &&
      isStringArray(assertions.unchanged_files ?? [])
    );
  });

  if (entriesAreValid) {
    run.pass(`${rel(path)} eval entries have required fields`);
  } else {
    run.fail(`${rel(path)} eval entries have required fields`);
  }
}

function checkTriggerCorpus(): void {
  run.section("trigger corpus");

  const corpusPath = fromPluginRoot("tests", "e2e", "triggers", "corpus.json");

  if (!existsSync(corpusPath)) {
    run.fail(`${rel(corpusPath)} exists`);
    return;
  }

  run.pass(`${rel(corpusPath)} exists`);

  const json = assertJsonFile(corpusPath, rel(corpusPath));
  if (!json) {
    return;
  }

  if (!Array.isArray(json) || json.length === 0) {
    run.fail(`${rel(corpusPath)} is a non-empty array`);
    return;
  }

  run.pass(`${rel(corpusPath)} is a non-empty array`);

  let entriesValid = true;
  for (const entry of json) {
    if (
      !isObject(entry) ||
      typeof entry.query !== "string" ||
      entry.query.length === 0 ||
      typeof entry.owner !== "string" ||
      entry.owner.length === 0
    ) {
      entriesValid = false;
      break;
    }
  }

  if (entriesValid) {
    run.pass(`${rel(corpusPath)} entries have required fields`);
  } else {
    run.fail(`${rel(corpusPath)} entries have required fields`);
    return;
  }

  let ownersValid = true;
  for (const entry of json as Array<{ query: string; owner: string }>) {
    if (entry.owner !== "none" && !hasSkill(entry.owner)) {
      run.fail(`${rel(corpusPath)} every owner is none or an existing skill`, `unknown owner: ${entry.owner}`);
      ownersValid = false;
      break;
    }
  }

  if (ownersValid) {
    run.pass(`${rel(corpusPath)} every owner is none or an existing skill`);
  }

  const coveredSkills = new Set(
    (json as Array<{ query: string; owner: string }>)
      .map((e) => e.owner)
      .filter((o) => o !== "none")
  );
  const uncoveredSkills = [...validSkills].filter((s) => !coveredSkills.has(s));

  if (uncoveredSkills.length === 0) {
    run.pass(`${rel(corpusPath)} every skill covered by at least one query`);
  } else {
    run.fail(`${rel(corpusPath)} every skill covered by at least one query`, `uncovered: ${uncoveredSkills.join(", ")}`);
  }

  const hasNoneEntry = (json as Array<{ query: string; owner: string }>).some((e) => e.owner === "none");

  if (hasNoneEntry) {
    run.pass(`${rel(corpusPath)} has at least one none query`);
  } else {
    run.fail(`${rel(corpusPath)} has at least one none query`);
  }
}

function checkInternalFileReferences(): void {
  run.section("internal file references");

  const referencePattern = /\b(?:references|skills)(?:\/[A-Za-z0-9._-]+)+\.(?:md|sh)\b/g;
  let ok = true;

  for (const src of listFiles(fromPluginRoot("skills"), (path) => path.endsWith(".md"))) {
    for (const match of readText(src).matchAll(referencePattern)) {
      const ref = match[0];
      const candidates = [dirname(src), pluginDir, ...skillNames().map((name) => fromPluginRoot("skills", name))];
      if (!candidates.some((base) => existsSync(join(base, ref)))) {
        run.fail(`dead reference in ${rel(src)}: ${ref}`);
        ok = false;
      }
    }
  }

  if (ok) {
    run.pass("all internal file references resolve");
  }
}

function checkMarkdownLinks(): void {
  run.section("markdown links");

  let ok = true;
  for (const markdownFile of listFiles(pluginDir, (path) => path.endsWith(".md"))) {
    if (rel(markdownFile).startsWith("docs/templates/")) {
      continue;
    }

    const body = stripMarkdownCodeBlocks(readText(markdownFile));
    for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const ref = match[1];
      if (/\.md($|#|\?)/.test(ref) && !resolveFileRef(markdownFile, ref)) {
        run.fail(`dead markdown link in ${rel(markdownFile)}: ${ref}`);
        ok = false;
      }
    }
  }

  if (ok) {
    run.pass("all markdown links resolve");
  }
}

function checkSkillCatalog(): void {
  run.section("skill catalog");

  const readme = readText(fromPluginRoot("README.md"));
  for (const match of new Set([...readme.matchAll(/\/afk:[a-z0-9-]+/g)].map(([ref]) => ref.replace("/afk:", "")))) {
    if (hasSkill(match)) {
      run.pass(`README skill '/afk:${match}' exists`);
    } else {
      run.fail(`README skill '/afk:${match}' exists`);
    }
  }

  for (const row of readText(fromPluginRoot("skills", "help", "afk-help.csv")).split("\n").slice(1)) {
    if (!row.trim()) {
      continue;
    }
    const skillRef = row.split(",")[0];
    const skillName = skillRef.replace("afk:", "");
    if (hasSkill(skillName)) {
      run.pass(`help catalog skill '${skillRef}' exists`);
    } else {
      run.fail(`help catalog skill '${skillRef}' exists`);
    }
  }

  const refSources = [fromPluginRoot("README.md"), ...listFiles(fromPluginRoot("docs"), (path) => path.endsWith(".md")), ...listFiles(fromPluginRoot("skills"), (path) => path.endsWith(".md"))];
  let allRefsOk = true;
  for (const source of refSources) {
    for (const match of readText(source).matchAll(/\/?afk:[a-z0-9-]+/g)) {
      const skillName = match[0].replace(/^\/?afk:/, "");
      const commandRef = match[0].startsWith("/afk:");
      if (hasSkill(skillName)) {
        continue;
      }
      if (!commandRef && hasAgent(skillName)) {
        continue;
      }

      if (commandRef) {
        run.fail(`skill reference '${match[0]}' points to an existing skill`);
      } else {
        run.fail(`afk reference '${match[0]}' points to an existing skill or agent`);
      }
      allRefsOk = false;
    }
  }

  if (allRefsOk) {
    run.pass("all afk: skill references resolve");
  }
}

function checkAgentReferences(): void {
  run.section("agent references");

  const refSources = [fromPluginRoot("README.md"), ...listFiles(fromPluginRoot("docs"), (path) => path.endsWith(".md")), ...listFiles(fromPluginRoot("skills"), (path) => path.endsWith(".md"))];
  let allRefsOk = true;
  for (const source of refSources) {
    for (const match of readText(source).matchAll(/`(?:afk:)?([a-z0-9]+(?:-[a-z0-9]+)*)`/g)) {
      const agentName = match[1];
      if (!agentName.includes("worker") && !agentName.includes("orchestrator")) {
        continue;
      }
      if (!hasAgent(agentName)) {
        run.fail(`agent reference '${match[0]}' points to an existing agent`);
        allRefsOk = false;
      }
    }
  }

  if (hasAgent("implement-orchestrator") && hasAgent("implementation-worker")) {
    run.pass("implementation agent pair exists");
  } else {
    run.fail("implementation agent pair exists", [...validAgents].join(", "));
    allRefsOk = false;
  }

  if (allRefsOk) {
    run.pass("all agent references resolve");
  }
}

function checkMarketplace(): void {
  run.section("marketplace");

  const pluginJson = readJson(fromPluginRoot(".claude-plugin", "plugin.json")) as Record<string, unknown>;
  const marketplace = readJson(fromPluginRoot(".claude-plugin", "marketplace.json")) as Record<string, unknown>;
  const firstPlugin = Array.isArray(marketplace.plugins) ? (marketplace.plugins[0] as Record<string, unknown> | undefined) : undefined;

  if (marketplace.name === pluginJson.name && firstPlugin?.name === pluginJson.name) {
    run.pass("marketplace plugin name matches plugin.json");
  } else {
    run.fail("marketplace plugin name matches plugin.json", `plugin.json=${String(pluginJson.name)}, marketplace=${String(marketplace.name)}, plugin entry=${String(firstPlugin?.name)}`);
  }

  if (firstPlugin?.source === "./") {
    run.pass("marketplace plugin source points at repository root");
  } else {
    run.fail("marketplace plugin source points at repository root", String(firstPlugin?.source));
  }

  if (typeof pluginJson.version === "string" && pluginJson.version.length > 0) {
    run.pass(`plugin.json has version anchor (${pluginJson.version})`);
  } else {
    run.fail("plugin.json has version anchor");
  }
}

console.log("=== Integration tests (Bun, zero-token) ===");

checkEvalSpecs();
checkTriggerCorpus();
checkInternalFileReferences();
checkMarkdownLinks();
checkSkillCatalog();
checkAgentReferences();
checkMarketplace();

run.summary();
process.exit(run.exitCode());
