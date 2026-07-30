// The eval run report, as pure functions: the summary.jsonl record contract the
// graders write, and the rollup that becomes one line of qa/evals/history.jsonl.
// Kept out of tests/e2e/setup.ts so the producer (harness.ts) and the consumer
// (the teardown that prints the report) share one typed contract, and so the
// arithmetic can be unit-tested without importing a globalSetup hook.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { listFiles } from "./fs";
import { fromPluginRoot, pluginDir } from "./paths";

/** One assertion's verdict tally across a task's scored trials. */
export type AssertionRow = { text: string; met: number; unknown: number; of: number };

// One line per graded event in summary.jsonl: a "task" record carries the run's
// tracked metrics, "rubric" and "routing" records carry a grader's verdict.
export type SummaryRecord = {
  type: "task" | "rubric" | "routing";
  skill: string;
  task: string;
  cost?: number;
  avgPct?: number;
  scored?: number;
  correct?: number;
  // Trials that passed on their own — the pass@k / pass^k input.
  passedTrials?: number;
  total?: number;
  trials?: number;
  completed?: number;
  infra?: number;
  skipped?: boolean;
  rejudged?: boolean;
  passed?: boolean;
  capability?: boolean;
  overblockGuard?: boolean;
  model?: string;
  turns?: number[];
  toolCalls?: number[];
  durationsMs?: number[];
  assertions?: AssertionRow[];
};

/** One task's verdict as stored in a history rollup. */
export type HistoryTask = {
  key: string;
  type: "rubric" | "routing";
  capability: boolean;
  passed: boolean;
  avgPct?: number;
  correct?: number;
  total?: number;
};

/** One line of qa/evals/history.jsonl: the whole run, rolled up. */
export type HistoryEntry = {
  ts: string;
  model: string;
  // Hash of the plugin content (skills/agents/hooks/manifests) at run time, so
  // a score move in the delta is attributable: same hash means the drift is
  // model- or judge-side, not a plugin edit.
  pluginHash?: string;
  cost: number;
  meanRubricPct?: number;
  routingCorrect?: number;
  routingTotal?: number;
  // Reliability over k trials: tasks that passed at least one trial (pass@k)
  // and tasks that passed every trial (pass^k), out of tasks graded.
  k?: number;
  passAtK?: number;
  passHatK?: number;
  gradedTasks?: number;
  meanTurns?: number;
  meanToolCalls?: number;
  meanDurationMs?: number;
  tasks: HistoryTask[];
};

/**
 * Hashes the plugin's content (skills, agents, hooks, manifests).
 *
 * @returns A 12-character digest. An unchanged digest between runs means a
 * score move is model- or judge-side drift, not a plugin edit.
 */
function pluginContentHash(): string {
  const roots = ["skills", "agents", "hooks", ".claude-plugin"].map((name) => fromPluginRoot(name)).filter(existsSync);
  const hash = createHash("sha256");
  for (const file of roots.flatMap((root) => listFiles(root, () => true))) {
    hash.update(relative(pluginDir, file));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 12);
}

/**
 * @param values - Samples to average.
 * @returns The mean, or `undefined` for an empty list, so the report omits the
 * line instead of printing a fake zero.
 */
function mean(values: number[]): number | undefined {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

/**
 * Rolls a run's summary records up into one history entry.
 *
 * @param records - Every line of the run's summary.jsonl.
 * @returns The rollup: cost, mean rubric score, routing accuracy, pass@k and
 * pass^k over graded tasks, mean per-trial metrics, and each task's verdict.
 */
export function buildHistoryEntry(records: SummaryRecord[]): HistoryEntry {
  const runs = records.filter((entry) => entry.type === "task");
  const verdicts = records.filter((entry) => entry.type === "rubric" || entry.type === "routing");
  const scored = records.filter((entry) => entry.type === "rubric" && (entry.scored ?? 0) > 0);
  const routing = records.filter((entry) => entry.type === "routing");
  const allTurns = runs.flatMap((entry) => entry.turns ?? []).filter((turns) => turns > 0);
  const allToolCalls = runs.flatMap((entry) => entry.toolCalls ?? []);
  const allDurations = runs.flatMap((entry) => entry.durationsMs ?? []).filter((duration) => duration > 0);

  // pass@k / pass^k over every task that produced trial-level pass counts.
  const graded = verdicts.filter((entry) => (entry.total ?? 0) > 0 && entry.passedTrials !== undefined && entry.skipped !== true);

  return {
    ts: new Date().toISOString(),
    model: runs.map((entry) => entry.model).find(Boolean) ?? "",
    pluginHash: pluginContentHash(),
    cost: records.reduce((sum, entry) => sum + (entry.cost ?? 0), 0),
    meanRubricPct: mean(scored.map((entry) => entry.avgPct ?? 0)),
    routingCorrect: routing.reduce((sum, entry) => sum + (entry.correct ?? 0), 0),
    routingTotal: routing.reduce((sum, entry) => sum + (entry.total ?? 0), 0),
    k: Math.max(0, ...graded.map((entry) => entry.total ?? 0)),
    passAtK: graded.filter((entry) => (entry.passedTrials ?? 0) > 0).length,
    passHatK: graded.filter((entry) => (entry.passedTrials ?? 0) === (entry.total ?? 0)).length,
    gradedTasks: graded.length,
    meanTurns: mean(allTurns),
    meanToolCalls: mean(allToolCalls),
    meanDurationMs: mean(allDurations),
    tasks: verdicts.map((entry) => ({
      key: `${entry.skill}/${entry.task}`,
      type: entry.type as "rubric" | "routing",
      capability: entry.capability === true,
      passed: entry.passed === true,
      avgPct: entry.avgPct,
      correct: entry.correct,
      total: entry.total,
    })),
  };
}

// History written before the task/rubric rename stores `cases` with type
// "judge" and a `gate` flag. Map it forward so the first delta after the rename
// compares like with like instead of reporting every task as new.
export type LegacyHistoryEntry = HistoryEntry & {
  cases?: (Omit<HistoryTask, "type" | "capability"> & { type: string; gate?: boolean })[];
  meanJudgePct?: number;
};

/**
 * Maps a stored history entry forward to the current shape.
 *
 * @param entry - A parsed history line, possibly pre-rename.
 * @returns The entry with `tasks` and `meanRubricPct` populated, so a delta
 * against a pre-rename run compares like with like.
 */
export function normalizeHistoryEntry(entry: LegacyHistoryEntry): HistoryEntry {
  return {
    ...entry,
    meanRubricPct: entry.meanRubricPct ?? entry.meanJudgePct,
    tasks:
      entry.tasks ??
      (entry.cases ?? []).map((legacy) => ({
        ...legacy,
        type: legacy.type === "routing" ? "routing" : "rubric",
        capability: legacy.gate === false,
      })),
  };
}
