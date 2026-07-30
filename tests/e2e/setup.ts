// Global setup for the model-backed e2e projects: refuse to start without the
// claude CLI, mint one shared artifact dir for the eval run (workers inject
// it), and on teardown print the aggregated run report from summary.jsonl,
// append a rollup line to qa/evals/history.jsonl, and diff against the
// previous run so drift is visible immediately. The rollup arithmetic and the
// summary.jsonl contract live in tests/lib/report.ts.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { TestProject } from "vitest/node";
import { commandExists } from "../lib/claude";
import { fromPluginRoot, runDirName } from "../lib/paths";
import { buildHistoryEntry, normalizeHistoryEntry, type HistoryEntry, type LegacyHistoryEntry, type SummaryRecord } from "../lib/report";

const historyFile = fromPluginRoot("qa", "evals", "history.jsonl");

/**
 * @returns The most recent history entry, normalized, or `undefined` when
 * there is no history yet or the last line is unparseable.
 */
function lastHistoryEntry(): HistoryEntry | undefined {
  if (!existsSync(historyFile)) return undefined;
  const lines = readFileSync(historyFile, "utf8").split("\n").filter(Boolean);
  const last = lines.at(-1);
  if (!last) return undefined;
  try {
    return normalizeHistoryEntry(JSON.parse(last) as LegacyHistoryEntry);
  } catch {
    return undefined;
  }
}

/**
 * Prints what moved between two runs: new, regressed, recovered, and — for
 * rubric-graded tasks — scores that shifted by 10 points or more.
 *
 * @param current - This run's rollup.
 * @param previous - The previous run's rollup.
 */
function printDelta(current: HistoryEntry, previous: HistoryEntry): void {
  const previousByKey = new Map(previous.tasks.map((entry) => [`${entry.type}:${entry.key}`, entry]));
  const lines: string[] = [];
  for (const entry of current.tasks) {
    const before = previousByKey.get(`${entry.type}:${entry.key}`);
    if (!before) {
      lines.push(`  new: ${entry.key} (${entry.passed ? "pass" : "FAIL"})`);
      continue;
    }
    if (before.passed && !entry.passed) {
      lines.push(`  regressed: ${entry.key} (pass -> FAIL)`);
    } else if (!before.passed && entry.passed) {
      lines.push(`  recovered: ${entry.key} (FAIL -> pass)`);
    } else if (entry.avgPct !== undefined && before.avgPct !== undefined && Math.abs(entry.avgPct - before.avgPct) >= 10) {
      lines.push(`  moved: ${entry.key} (rubric ${before.avgPct}% -> ${entry.avgPct}%)`);
    }
  }
  console.log(`Delta vs previous run (${previous.ts}${previous.model ? `, ${previous.model}` : ""}):`);
  if (current.pluginHash && previous.pluginHash) {
    console.log(
      current.pluginHash === previous.pluginHash
        ? "  plugin content unchanged — any drift is model/judge-side"
        : "  plugin content changed since the previous run",
    );
  }
  console.log(lines.length > 0 ? lines.join("\n") : "  no case-level changes");
}

/**
 * Prints the run report and appends this run's rollup to history.
 *
 * @param runDir - The run's artifact dir. A run that graded nothing (a
 * smoke-only run) has no summary.jsonl and prints nothing.
 */
function printReport(runDir: string): void {
  const summaryFile = join(runDir, "summary.jsonl");
  if (!existsSync(summaryFile)) {
    return; // no eval ran (e.g. smoke-only), nothing to report
  }
  const records = readFileSync(summaryFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as SummaryRecord);

  const entry = buildHistoryEntry(records);
  const runs = records.filter((record) => record.type === "task");
  const infraTrials = runs.reduce((sum, record) => sum + Math.max(0, (record.trials ?? 0) - (record.completed ?? 0)), 0);
  const skippedRubrics = records.filter((record) => record.type === "rubric" && record.skipped).length;
  const routing = records.filter((record) => record.type === "routing");
  const overBlocked = routing.filter((record) => !record.passed && record.overblockGuard).length;
  const flaky = routing
    .filter((record) => (record.correct ?? 0) > 0 && (record.correct ?? 0) < (record.total ?? 0))
    .map((record) => `${record.skill}/${record.task} (${record.correct}/${record.total})`);
  const capability = entry.tasks.filter((record) => record.capability);

  console.log("");
  console.log("=== AFK eval run report ===");
  console.log(`Artifacts: ${runDir}`);
  if (entry.model) console.log(`Model: ${entry.model}`);
  if (runs.some((record) => record.rejudged)) console.log("Mode: re-judge (cached transcripts, no skill runs)");
  console.log(`Cost: $${entry.cost.toFixed(6)}`);
  if (infraTrials > 0) console.log(`Infra-failed trials (excluded from grading): ${infraTrials}`);
  if (skippedRubrics > 0) console.log(`Rubrics skipped by AFK_EVAL_FAST: ${skippedRubrics}`);
  if (entry.meanTurns !== undefined || entry.meanToolCalls !== undefined || entry.meanDurationMs !== undefined) {
    const parts = [
      entry.meanTurns !== undefined ? `${entry.meanTurns.toFixed(1)} turns` : "",
      entry.meanToolCalls !== undefined ? `${entry.meanToolCalls.toFixed(1)} tool calls` : "",
      entry.meanDurationMs !== undefined ? `${(entry.meanDurationMs / 1000).toFixed(0)}s` : "",
    ];
    console.log(`Mean per trial: ${parts.filter(Boolean).join(", ")}`);
  }
  if (entry.meanRubricPct !== undefined) {
    console.log(`Mean rubric score: ${Math.round(entry.meanRubricPct)}% (gate: every assertion met in a strict majority of trials)`);
  }
  if ((entry.gradedTasks ?? 0) > 0) {
    const k = entry.k ?? 0;
    console.log(
      `Reliability over ${k} trial(s): pass@${k} ${entry.passAtK}/${entry.gradedTasks} tasks, pass^${k} ${entry.passHatK}/${entry.gradedTasks} tasks`,
    );
  }
  if (routing.length > 0) {
    console.log(
      `Routing accuracy: ${entry.routingCorrect}/${entry.routingTotal} trials (${routing.filter((record) => record.passed).length}/${routing.length} tasks passed)`,
    );
    console.log(`Over-blocked: ${overBlocked}`);
    console.log(flaky.length > 0 ? `Flaky routing (mixed agreement): ${flaky.join(", ")}` : "Flaky routing (mixed agreement): none");
  }
  if (capability.length > 0) {
    console.log("Capability tasks (not gating):");
    for (const record of capability) {
      const score = record.type === "rubric" ? `${record.avgPct ?? 0}%` : `${record.correct}/${record.total}`;
      console.log(`  ${record.key}: ${score} (${record.passed ? "would pass" : "not yet passing"})`);
    }
  }

  const previous = lastHistoryEntry();
  if (previous) printDelta(entry, previous);
  mkdirSync(fromPluginRoot("qa", "evals"), { recursive: true });
  appendFileSync(historyFile, `${JSON.stringify(entry)}\n`);
  console.log(`History: ${historyFile}`);
}

/**
 * Global setup for the model-backed e2e projects.
 *
 * @param project - The vitest project, used to provide `evalRunDir` to workers.
 * @returns The teardown that prints the run report.
 * @throws If the claude CLI is not on PATH — every suite here needs it.
 */
export default function setup(project: TestProject): () => void {
  if (!commandExists("claude")) {
    throw new Error("claude CLI is not installed — the model-backed e2e suites need it on PATH");
  }
  const runDir = process.env.AFK_EVAL_OUT_DIR ?? fromPluginRoot("qa", "evals", runDirName());
  project.provide("evalRunDir", runDir);
  return () => printReport(runDir);
}
