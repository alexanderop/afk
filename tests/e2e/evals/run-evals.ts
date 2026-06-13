import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync, which } from "bun";
import { listFiles } from "../../lib/fs";
import { fromPluginRoot, pluginDir } from "../../lib/paths";
import { containsCaseInsensitive, envNumber, TestRun } from "../../lib/runner";

const run = new TestRun();
const outDir = process.env.AFK_EVAL_OUT_DIR ?? fromPluginRoot("qa", "evals", new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"));
const maxBudgetUsd = process.env.AFK_EVAL_MAX_BUDGET_USD ?? "0.25";
const timeoutMs = envNumber("AFK_EVAL_TIMEOUT_SECONDS", 180) * 1000;
let totalCost = 0;

type EvalAssertions = {
  required_substrings?: string[];
  forbidden_substrings?: string[];
  required_files?: string[];
  required_file_substrings?: Record<string, string[]>;
  unchanged_files?: string[];
};

type EvalEntry = {
  id: string;
  prompt: string;
  fixture?: {
    files?: Record<string, string>;
  };
  assertions?: EvalAssertions;
};

type EvalSpec = {
  skill_name: string;
  evals: EvalEntry[];
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeFixtureFiles(evalEntry: EvalEntry, projectDir: string): void {
  for (const [filePath, content] of Object.entries(evalEntry.fixture?.files ?? {})) {
    const target = join(projectDir, filePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

function readJsonLines(path: string): Record<string, unknown>[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as Record<string, unknown>];
      } catch {
        return [];
      }
    });
}

function collectAssistantText(events: Record<string, unknown>[]): string {
  return events
    .filter((event) => event.type === "assistant")
    .flatMap((event) => {
      const message = event.message as Record<string, unknown> | undefined;
      return Array.isArray(message?.content) ? message.content : [];
    })
    .filter((content): content is Record<string, unknown> => typeof content === "object" && content !== null)
    .filter((content) => content.type === "text" && typeof content.text === "string")
    .map((content) => content.text as string)
    .join("\n");
}

function runEval(specFile: string, spec: EvalSpec, evalEntry: EvalEntry): void {
  const evalDir = join(outDir, spec.skill_name, evalEntry.id);
  const projectDir = mkdtempSync(join(tmpdir(), `afk-eval-${spec.skill_name}-${evalEntry.id}-`));
  const rawLog = join(evalDir, "raw.jsonl");
  mkdirSync(evalDir, { recursive: true });

  spawnSync({ cmd: ["git", "init", "-q"], cwd: projectDir });
  writeFixtureFiles(evalEntry, projectDir);

  const prompt = `/afk:${spec.skill_name}

${evalEntry.prompt}

Eval mode: follow the AFK skill normally. Include enough detail in the final response for the eval assertions to verify what happened. Do not edit files outside this temporary eval project.`;

  const result = spawnSync({
    cmd: [
      "claude",
      "-p",
      prompt,
      "--plugin-dir",
      pluginDir,
      "--setting-sources",
      "project",
      "--permission-mode",
      "bypassPermissions",
      "--max-budget-usd",
      maxBudgetUsd,
      "--output-format",
      "stream-json",
      "--verbose",
    ],
    cwd: projectDir,
    stdout: "pipe",
    stderr: "pipe",
    timeout: timeoutMs,
  });
  writeFileSync(rawLog, `${result.stdout.toString()}${result.stderr.toString()}`);

  cpSync(projectDir, join(evalDir, "project"), { recursive: true });

  const events = readJsonLines(rawLog);
  const resultEvent = events.filter((event) => event.type === "result").at(-1) as Record<string, unknown> | undefined;
  const resultText = typeof resultEvent?.result === "string" ? resultEvent.result : "";
  const assistantText = collectAssistantText(events);
  const assertionText = `${assistantText}\n${resultText}`;
  const cost = Number(resultEvent?.total_cost_usd ?? 0);
  totalCost += Number.isFinite(cost) ? cost : 0;

  writeFileSync(join(evalDir, "result.txt"), resultText);

  if (result.exitCode !== 0) {
    run.fail(`${spec.skill_name}/${evalEntry.id} completed`, `claude exited ${result.exitCode}; see ${rawLog}${resultText ? `; result: ${resultText}` : ""}`);
    return;
  }

  if (resultEvent?.is_error === true) {
    run.fail(`${spec.skill_name}/${evalEntry.id} completed without Claude error`, resultText);
    return;
  }

  run.pass(`${spec.skill_name}/${evalEntry.id} completed`);
  checkAssertions(spec, evalEntry, evalDir, assertionText);
}

function checkAssertions(spec: EvalSpec, evalEntry: EvalEntry, evalDir: string, assertionText: string): void {
  const assertions = evalEntry.assertions ?? {};

  for (const required of assertions.required_substrings ?? []) {
    if (containsCaseInsensitive(assertionText, required)) {
      run.pass(`${spec.skill_name}/${evalEntry.id} contains '${required}'`);
    } else {
      run.fail(`${spec.skill_name}/${evalEntry.id} contains '${required}'`, `see ${join(evalDir, "result.txt")}`);
    }
  }

  for (const forbidden of assertions.forbidden_substrings ?? []) {
    if (containsCaseInsensitive(assertionText, forbidden)) {
      run.fail(`${spec.skill_name}/${evalEntry.id} excludes '${forbidden}'`, `see ${join(evalDir, "result.txt")}`);
    } else {
      run.pass(`${spec.skill_name}/${evalEntry.id} excludes '${forbidden}'`);
    }
  }

  for (const requiredFile of assertions.required_files ?? []) {
    if (existsSync(join(evalDir, "project", requiredFile))) {
      run.pass(`${spec.skill_name}/${evalEntry.id} created ${requiredFile}`);
    } else {
      run.fail(`${spec.skill_name}/${evalEntry.id} created ${requiredFile}`);
    }
  }

  for (const [filePath, requiredStrings] of Object.entries(assertions.required_file_substrings ?? {})) {
    const fullPath = join(evalDir, "project", filePath);
    const content = existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
    for (const required of requiredStrings) {
      if (containsCaseInsensitive(content, required)) {
        run.pass(`${spec.skill_name}/${evalEntry.id} ${filePath} contains '${required}'`);
      } else {
        run.fail(`${spec.skill_name}/${evalEntry.id} ${filePath} contains '${required}'`);
      }
    }
  }

  for (const filePath of assertions.unchanged_files ?? []) {
    const expected = evalEntry.fixture?.files?.[filePath];
    const fullPath = join(evalDir, "project", filePath);
    const actual = existsSync(fullPath) ? readFileSync(fullPath, "utf8") : undefined;
    if (typeof expected === "string" && actual === expected) {
      run.pass(`${spec.skill_name}/${evalEntry.id} left ${filePath} unchanged`);
    } else {
      run.fail(`${spec.skill_name}/${evalEntry.id} left ${filePath} unchanged`, `see ${join(evalDir, "project", filePath)}`);
    }
  }
}

console.log("=== AFK behavioral evals (Claude Code, model-backed) ===");
console.log(`Artifacts: ${outDir}`);
console.log(`Per-eval max budget: $${maxBudgetUsd}`);
console.log("");

if (!which("claude")) {
  run.fail("claude CLI is installed");
  run.summary();
  process.exit(1);
}

for (const specFile of listFiles(fromPluginRoot("tests", "e2e", "evals", "specs"), (path) => path.endsWith("evals.json"))) {
  const spec = readJson<EvalSpec>(specFile);
  for (const evalEntry of spec.evals) {
    runEval(specFile, spec, evalEntry);
  }
}

run.summary([`Cost: $${totalCost.toFixed(6)}`]);
process.exit(run.exitCode());
