// Zero-token checks for the run-report aggregation in tests/lib/report.ts: the
// pass@k / pass^k reliability metrics, the per-trial metric means, and the
// forward-mapping of history written before the task/rubric rename. The report
// only prints during a paid eval run, so its arithmetic is pinned here.
import { expect, test } from "vitest";
import { buildHistoryEntry, normalizeHistoryEntry, type LegacyHistoryEntry, type SummaryRecord } from "../lib/report";

const taskRecord = (over: Partial<SummaryRecord> = {}): SummaryRecord => ({
  type: "task",
  skill: "grill",
  task: "a task",
  cost: 0.1,
  trials: 3,
  completed: 3,
  model: "claude-test-model",
  turns: [4, 6, 8],
  toolCalls: [2, 4, 6],
  durationsMs: [1000, 2000, 3000],
  ...over,
});

test("pass@k counts tasks passing any trial, pass^k tasks passing every trial", () => {
  const entry = buildHistoryEntry([
    taskRecord(),
    // Rubric task: 2 of 3 trials met every assertion — pass@3 but not pass^3.
    { type: "rubric", skill: "grill", task: "flaky", avgPct: 80, scored: 3, passedTrials: 2, total: 3, passed: true },
    // Routing task: every trial correct — counts toward both.
    { type: "routing", skill: "help", task: "solid", correct: 3, passedTrials: 3, total: 3, completed: 3, passed: true },
    // Nothing passed — counts toward neither, but is still a graded task.
    { type: "rubric", skill: "qa", task: "unmet", avgPct: 20, scored: 3, passedTrials: 0, total: 3, passed: false },
  ]);

  expect(entry.k).toBe(3);
  expect(entry.gradedTasks).toBe(3);
  expect(entry.passAtK).toBe(2);
  expect(entry.passHatK).toBe(1);
});

test("a rubric skipped by fast mode is not counted as a graded task", () => {
  const entry = buildHistoryEntry([
    taskRecord(),
    { type: "rubric", skill: "grill", task: "skipped", scored: 0, passedTrials: 0, total: 3, passed: false, skipped: true },
  ]);

  expect(entry.gradedTasks).toBe(0);
  expect(entry.passAtK).toBe(0);
});

test("tracked per-trial metrics are averaged across every trial in the run", () => {
  const entry = buildHistoryEntry([taskRecord(), taskRecord({ skill: "qa", turns: [10], toolCalls: [0], durationsMs: [5000] })]);

  expect(entry.meanTurns).toBeCloseTo((4 + 6 + 8 + 10) / 4);
  // A zero-tool-call trial is real evidence, so it must not be filtered out.
  expect(entry.meanToolCalls).toBeCloseTo((2 + 4 + 6 + 0) / 4);
  expect(entry.meanDurationMs).toBeCloseTo((1000 + 2000 + 3000 + 5000) / 4);
  expect(entry.model).toBe("claude-test-model");
  expect(entry.cost).toBeCloseTo(0.2);
});

test("mean rubric score ignores tasks the judge never scored", () => {
  const entry = buildHistoryEntry([
    { type: "rubric", skill: "grill", task: "scored", avgPct: 90, scored: 3, passedTrials: 3, total: 3, passed: true },
    { type: "rubric", skill: "grill", task: "unscored", avgPct: 0, scored: 0, passedTrials: 0, total: 3, passed: false },
  ]);

  expect(entry.meanRubricPct).toBe(90);
});

test("history written before the task/rubric rename maps forward for the delta", () => {
  const legacy = {
    ts: "2026-01-01T00:00:00.000Z",
    model: "claude-test-model",
    cost: 1,
    meanJudgePct: 72,
    cases: [
      { key: "grill/a", type: "judge", gate: true, passed: true, avgPct: 80 },
      { key: "help/b", type: "routing", gate: false, passed: false, correct: 1, total: 3 },
    ],
  } as unknown as LegacyHistoryEntry;

  const entry = normalizeHistoryEntry(legacy);

  expect(entry.meanRubricPct).toBe(72);
  expect(entry.tasks).toEqual([
    { key: "grill/a", type: "rubric", gate: true, capability: false, passed: true, avgPct: 80 },
    { key: "help/b", type: "routing", gate: false, capability: true, passed: false, correct: 1, total: 3 },
  ]);
});

test("normalizing a current-shape entry leaves it untouched", () => {
  const current = {
    ts: "2026-01-02T00:00:00.000Z",
    model: "claude-test-model",
    cost: 1,
    meanRubricPct: 88,
    tasks: [{ key: "grill/a", type: "rubric" as const, capability: false, passed: true, avgPct: 88 }],
  };

  expect(normalizeHistoryEntry(current)).toEqual(current);
});
