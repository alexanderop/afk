import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync, which } from "bun";
import { listFiles } from "../../lib/fs";
import { fromPluginRoot, pluginDir } from "../../lib/paths";
import { containsCaseInsensitive, envNumber, TestRun } from "../../lib/runner";

const run = new TestRun();
const outDir = process.env.AFK_EVAL_OUT_DIR ?? fromPluginRoot("qa", "evals", new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"));
const budgetOverrideUsd = process.env.AFK_EVAL_MAX_BUDGET_USD;
const maxBudgetUsd = budgetOverrideUsd ?? "0.50";
const timeoutMs = envNumber("AFK_EVAL_TIMEOUT_SECONDS", 180) * 1000;
const trials = Math.max(1, Math.round(envNumber("AFK_EVAL_TRIALS", 1)));
const scoreThreshold = envNumber("AFK_EVAL_SCORE_THRESHOLD", 70);
const judgeModel = process.env.AFK_EVAL_JUDGE_MODEL ?? "claude-haiku-4-5";
const judgeBudgetUsd = "0.10";
const transcriptCharLimit = 20000;
let totalCost = 0;
const judgeScores: number[] = [];

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
  max_budget_usd?: number;
  expectations?: string[];
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

function collectToolCalls(events: Record<string, unknown>[]): string[] {
  return events
    .filter((event) => event.type === "assistant")
    .flatMap((event) => {
      const message = event.message as Record<string, unknown> | undefined;
      return Array.isArray(message?.content) ? message.content : [];
    })
    .filter((content): content is Record<string, unknown> => typeof content === "object" && content !== null)
    .filter((content) => content.type === "tool_use" && typeof content.name === "string")
    .map((content) => {
      const name = content.name as string;
      const input = content.input as Record<string, unknown> | undefined;
      const hint = input?.file_path ?? input?.path ?? input?.pattern ?? input?.command ?? input?.prompt ?? input?.description;
      const hintText = typeof hint === "string" ? hint.slice(0, 120) : "";
      return hintText ? `${name}(${hintText})` : name;
    });
}

function buildTranscript(assistantText: string, toolCalls: string[], resultText: string): string {
  const parts = [assistantText];
  if (toolCalls.length > 0) {
    parts.push(`Tools used:\n${toolCalls.map((call) => `- ${call}`).join("\n")}`);
  }
  if (resultText) {
    parts.push(`Final result:\n${resultText}`);
  }
  const transcript = parts.filter(Boolean).join("\n\n");
  return transcript.length > transcriptCharLimit ? `${transcript.slice(0, transcriptCharLimit)}\n…[truncated]` : transcript;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return undefined;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

type JudgeResult = { score: number; unmet: string[] };

function judgeExpectations(transcript: string, expectations: string[], evalDir: string, trialSuffix: string): JudgeResult | null {
  const numbered = expectations.map((expectation, index) => `${index + 1}. ${expectation}`).join("\n");
  const judgePrompt = `You are grading whether an AI coding agent's behavior met a list of expectations.

Below is a transcript of the agent's response (its prose, the tools it used, and its final message), followed by a numbered list of expectations.

For each expectation, decide whether the transcript shows it was met. Judge only against what the transcript demonstrates; do not assume unseen behavior.

Return STRICT JSON only, no prose, no code fences, in exactly this shape:
{"results":[{"met":true,"reason":"..."}]}
with one entry per expectation, in the same order. "met" is a boolean; "reason" is one short sentence.

=== TRANSCRIPT START ===
${transcript}
=== TRANSCRIPT END ===

Expectations:
${numbered}`;

  const judgeDir = mkdtempSync(join(tmpdir(), "afk-eval-judge-"));
  const result = spawnSync({
    cmd: ["claude", "-p", judgePrompt, "--model", judgeModel, "--permission-mode", "bypassPermissions", "--max-budget-usd", judgeBudgetUsd, "--output-format", "json"],
    cwd: judgeDir,
    stdout: "pipe",
    stderr: "pipe",
    timeout: timeoutMs,
  });

  const rawOut = `${result.stdout.toString()}${result.stderr.toString()}`;
  const judgeLog = join(evalDir, `judge${trialSuffix}.json`);
  writeFileSync(judgeLog, rawOut);

  let envelope: Record<string, unknown> | undefined;
  try {
    envelope = JSON.parse(result.stdout.toString()) as Record<string, unknown>;
  } catch {
    envelope = undefined;
  }
  const cost = Number(envelope?.total_cost_usd ?? 0);
  totalCost += Number.isFinite(cost) ? cost : 0;

  const resultText = typeof envelope?.result === "string" ? envelope.result : result.stdout.toString();
  const parsed = extractJson(resultText) as { results?: { met?: unknown }[] } | undefined;
  if (!parsed || !Array.isArray(parsed.results)) {
    return null;
  }

  const verdicts = parsed.results;
  let met = 0;
  const unmet: string[] = [];
  for (let index = 0; index < expectations.length; index++) {
    if (verdicts[index]?.met === true) {
      met += 1;
    } else {
      unmet.push(expectations[index]!);
    }
  }
  return { score: met / expectations.length, unmet };
}

function runEval(specFile: string, spec: EvalSpec, evalEntry: EvalEntry): void {
  const evalDir = join(outDir, spec.skill_name, evalEntry.id);
  mkdirSync(evalDir, { recursive: true });

  const expectations = evalEntry.expectations ?? [];
  const evalBudgetUsd = budgetOverrideUsd ?? (typeof evalEntry.max_budget_usd === "number" ? String(evalEntry.max_budget_usd) : maxBudgetUsd);
  const prompt = `/afk:${spec.skill_name}

${evalEntry.prompt}

Eval mode: follow the AFK skill normally. Include enough detail in the final response for the eval assertions to verify what happened. Do not edit files outside this temporary eval project.`;

  const trialScores: number[] = [];
  let lastUnmet: string[] = [];

  for (let trial = 1; trial <= trials; trial++) {
    const trialSuffix = trials > 1 ? `.trial${trial}` : "";
    const labelSuffix = trials > 1 ? ` [trial ${trial}]` : "";
    const baseLabel = `${spec.skill_name}/${evalEntry.id}${labelSuffix}`;

    const projectDir = mkdtempSync(join(tmpdir(), `afk-eval-${spec.skill_name}-${evalEntry.id}-`));
    const rawLog = join(evalDir, `raw${trialSuffix}.jsonl`);

    spawnSync({ cmd: ["git", "init", "-q"], cwd: projectDir });
    writeFixtureFiles(evalEntry, projectDir);

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
        evalBudgetUsd,
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

    const projectCopyDir = join(evalDir, `project${trialSuffix}`);
    cpSync(projectDir, projectCopyDir, { recursive: true });

    const events = readJsonLines(rawLog);
    const resultEvent = events.filter((event) => event.type === "result").at(-1) as Record<string, unknown> | undefined;
    const resultText = typeof resultEvent?.result === "string" ? resultEvent.result : "";
    const assistantText = collectAssistantText(events);
    const toolCalls = collectToolCalls(events);
    const assertionText = `${assistantText}\n${resultText}`;
    const cost = Number(resultEvent?.total_cost_usd ?? 0);
    totalCost += Number.isFinite(cost) ? cost : 0;

    writeFileSync(join(evalDir, `result${trialSuffix}.txt`), resultText);

    if (result.exitCode !== 0) {
      run.fail(`${baseLabel} completed`, `claude exited ${result.exitCode}; see ${rawLog}${resultText ? `; result: ${resultText}` : ""}`);
      continue;
    }

    if (resultEvent?.is_error === true) {
      run.fail(`${baseLabel} completed without Claude error`, resultText);
      continue;
    }

    run.pass(`${baseLabel} completed`);
    checkAssertions(spec, evalEntry, evalDir, projectCopyDir, assertionText, labelSuffix);

    if (expectations.length > 0) {
      const transcript = buildTranscript(assistantText, toolCalls, resultText);
      const judged = judgeExpectations(transcript, expectations, evalDir, trialSuffix);
      if (judged) {
        trialScores.push(judged.score);
        lastUnmet = judged.unmet;
        console.log(`  judge${labelSuffix}: ${Math.round(judged.score * 100)}% (${expectations.length - judged.unmet.length}/${expectations.length})`);
      } else {
        console.log(`  judge${labelSuffix}: unparseable (see ${join(evalDir, `judge${trialSuffix}.json`)})`);
      }
    }
  }

  if (expectations.length === 0) return;

  const label = `${spec.skill_name}/${evalEntry.id} expectations >= ${scoreThreshold}%`;
  if (trialScores.length === 0) {
    run.fail(label, `judge produced no parseable scores; see ${evalDir}`);
    return;
  }

  const avg = trialScores.reduce((sum, score) => sum + score, 0) / trialScores.length;
  judgeScores.push(avg);
  const pct = Math.round(avg * 100);
  const metCount = Math.round(avg * expectations.length);
  const trialWord = trialScores.length === 1 ? "trial" : "trials";
  const detail = `judge: ${pct}% (${metCount}/${expectations.length} avg over ${trialScores.length} ${trialWord})`;
  if (pct >= scoreThreshold) {
    run.pass(label);
    console.log(`     ${detail}`);
  } else {
    run.fail(label, `${detail}; unmet: ${lastUnmet.join("; ")}; see ${join(evalDir, "judge*.json")}`);
  }
}

function checkAssertions(spec: EvalSpec, evalEntry: EvalEntry, evalDir: string, projectCopyDir: string, assertionText: string, labelSuffix: string): void {
  const assertions = evalEntry.assertions ?? {};
  const id = `${spec.skill_name}/${evalEntry.id}${labelSuffix}`;

  for (const required of assertions.required_substrings ?? []) {
    if (containsCaseInsensitive(assertionText, required)) {
      run.pass(`${id} contains '${required}'`);
    } else {
      run.fail(`${id} contains '${required}'`, `see ${join(evalDir, "result.txt")}`);
    }
  }

  for (const forbidden of assertions.forbidden_substrings ?? []) {
    if (containsCaseInsensitive(assertionText, forbidden)) {
      run.fail(`${id} excludes '${forbidden}'`, `see ${join(evalDir, "result.txt")}`);
    } else {
      run.pass(`${id} excludes '${forbidden}'`);
    }
  }

  for (const requiredFile of assertions.required_files ?? []) {
    if (existsSync(join(projectCopyDir, requiredFile))) {
      run.pass(`${id} created ${requiredFile}`);
    } else {
      run.fail(`${id} created ${requiredFile}`);
    }
  }

  for (const [filePath, requiredStrings] of Object.entries(assertions.required_file_substrings ?? {})) {
    const fullPath = join(projectCopyDir, filePath);
    const content = existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
    for (const required of requiredStrings) {
      if (containsCaseInsensitive(content, required)) {
        run.pass(`${id} ${filePath} contains '${required}'`);
      } else {
        run.fail(`${id} ${filePath} contains '${required}'`);
      }
    }
  }

  for (const filePath of assertions.unchanged_files ?? []) {
    const expected = evalEntry.fixture?.files?.[filePath];
    const fullPath = join(projectCopyDir, filePath);
    const actual = existsSync(fullPath) ? readFileSync(fullPath, "utf8") : undefined;
    if (typeof expected === "string" && actual === expected) {
      run.pass(`${id} left ${filePath} unchanged`);
    } else {
      run.fail(`${id} left ${filePath} unchanged`, `see ${join(projectCopyDir, filePath)}`);
    }
  }
}

console.log("=== AFK behavioral evals (Claude Code, model-backed) ===");
console.log(`Artifacts: ${outDir}`);
console.log(`Per-eval max budget: $${maxBudgetUsd}`);
console.log(`Trials per eval: ${trials}`);
console.log(`Judge model: ${judgeModel}  |  score threshold: ${scoreThreshold}%`);
console.log("");

if (!which("claude")) {
  run.fail("claude CLI is installed");
  run.summary();
  process.exit(1);
}

const skillFilter = process.env.AFK_EVAL_SKILL;
const idFilter = process.env.AFK_EVAL_ID;

for (const specFile of listFiles(fromPluginRoot("tests", "e2e", "evals", "specs"), (path) => path.endsWith("evals.json"))) {
  const spec = readJson<EvalSpec>(specFile);
  if (skillFilter && spec.skill_name !== skillFilter) continue;
  for (const evalEntry of spec.evals) {
    if (idFilter && evalEntry.id !== idFilter) continue;
    runEval(specFile, spec, evalEntry);
  }
}

const meanJudgeScore = judgeScores.length > 0 ? Math.round((judgeScores.reduce((sum, score) => sum + score, 0) / judgeScores.length) * 100) : null;
run.summary([`Cost: $${totalCost.toFixed(6)}`, `Score threshold: ${scoreThreshold}%`, meanJudgeScore === null ? "Mean judge score: n/a (no judged evals)" : `Mean judge score: ${meanJudgeScore}% across ${judgeScores.length} eval(s)`]);
process.exit(run.exitCode());
