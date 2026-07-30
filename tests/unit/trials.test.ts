// Zero-token checks for the pure grading helpers in tests/lib/trials.ts:
// judge-output parsing (with repair), tool-call matching, and re-judge trial
// discovery/loading. These run on every edit; the model-backed behavior they
// support only runs in the e2e project.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test } from "vitest";
import { discoverCachedSuffixes, extractJson, loadTrialRecord, toolCallMatches, toolCallsInOrder } from "../lib/trials";

test("extractJson reads plain, fenced, and thinking-wrapped judge output", () => {
  expect(extractJson('{"results":[{"met":true}]}')).toEqual({ results: [{ met: true }] });
  expect(extractJson('```json\n{"results":[]}\n```')).toEqual({ results: [] });
  expect(extractJson('<thinking>a stray { brace</thinking>\n{"results":[{"met":"unknown"}]}')).toEqual({
    results: [{ met: "unknown" }],
  });
});

test("extractJson repairs trailing commas only after a direct parse fails", () => {
  expect(extractJson('{"results":[{"met":true},]}')).toEqual({ results: [{ met: true }] });
  expect(extractJson('{"list":[1,2,],}')).toEqual({ list: [1, 2] });
  // A string value containing ", ]" parses directly and must never be rewritten.
  expect(extractJson('{"reason":"lists like [a, ] are fine"}')).toEqual({ reason: "lists like [a, ] are fine" });
  expect(extractJson("no json here")).toBeUndefined();
});

test("toolCallMatches matches by tool name or by scoped call prefix", () => {
  expect(toolCallMatches("Edit(src/a.ts)", "Edit")).toBe(true);
  expect(toolCallMatches("Edit", "edit")).toBe(true);
  // Name matching must not false-hit prefixes, substrings, or arguments.
  expect(toolCallMatches("MultiEdit(src/a.ts)", "Edit")).toBe(false);
  expect(toolCallMatches("Read(src/editor.ts)", "Edit")).toBe(false);
  // A needle with a paren scopes the check to the call line's prefix.
  expect(toolCallMatches("Edit(brain/plans/a.md)", "Edit(brain/")).toBe(true);
  expect(toolCallMatches("Edit(src/a.ts)", "Edit(brain/")).toBe(false);
});

test("toolCallsInOrder requires an in-order subsequence, interleaving allowed", () => {
  const calls = ["Read(README.md)", "Bash(git status)", "Edit(src/a.ts)", "Bash(bun test)"];
  expect(toolCallsInOrder(calls, ["Read", "Edit", "Bash(bun test)"])).toBe(true);
  expect(toolCallsInOrder(calls, ["Edit", "Read"])).toBe(false);
  expect(toolCallsInOrder(calls, [])).toBe(true);
});

const caseDir = mkdtempSync(join(tmpdir(), "afk-rejudge-test-"));
afterAll(() => rmSync(caseDir, { recursive: true, force: true }));

test("discoverCachedSuffixes keeps only the final attempt per trial slot", () => {
  mkdirSync(caseDir, { recursive: true });
  for (const name of ["raw.trial1.jsonl", "raw.trial1.retry1.jsonl", "raw.trial2.jsonl"]) {
    writeFileSync(join(caseDir, name), "");
  }
  expect(discoverCachedSuffixes(caseDir)).toEqual([".trial1.retry1", ".trial2"]);
  expect(discoverCachedSuffixes(join(caseDir, "missing"))).toEqual([]);
});

test("loadTrialRecord rebuilds a gradable trial from a saved transcript", () => {
  const events = [
    { type: "system", subtype: "init", model: "claude-test-model" },
    { type: "assistant", message: { content: [{ type: "text", text: "routing to afk:implement" }] } },
    { type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "README.md" } }] } },
    { type: "result", result: "done", is_error: false, num_turns: 3, total_cost_usd: 0.42 },
  ];
  writeFileSync(join(caseDir, "raw.trial3.jsonl"), events.map((event) => JSON.stringify(event)).join("\n"));

  const trial = loadTrialRecord(caseDir, ".trial3");
  expect(trial.failReason).toBeUndefined();
  expect(trial.output).toContain("afk:implement");
  expect(trial.toolCalls).toEqual(["Read(README.md)"]);
  expect(trial.model).toBe("claude-test-model");
  // The original run paid the skill cost; a re-judge must not double-count it.
  expect(trial.cost).toBe(0);
});

test("loadTrialRecord flags missing and error transcripts as failed trials", () => {
  expect(loadTrialRecord(caseDir, ".nope").failReason).toContain("no cached transcript");

  writeFileSync(join(caseDir, "raw.trial4.jsonl"), JSON.stringify({ type: "assistant", message: { content: [] } }));
  expect(loadTrialRecord(caseDir, ".trial4").failReason).toContain("no result event");

  writeFileSync(join(caseDir, "raw.trial5.jsonl"), JSON.stringify({ type: "result", result: "boom", is_error: true }));
  expect(loadTrialRecord(caseDir, ".trial5").failReason).toContain("boom");
});
