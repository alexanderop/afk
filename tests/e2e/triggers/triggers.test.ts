// AFK trigger-activation runner: fires each corpus query at a bare headless
// claude session with the plugin loaded and checks which skill (if any)
// activates. One test per query, trial-majority scored; aggregate gates
// (activation %, false-positive %) are asserted in afterAll.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { skillNames } from "../../lib/catalog";
import { assistantContentBlocks, eventCost, lastResultEvent, parseJsonLines, runCommand } from "../../lib/claude";
import { fromPluginRoot, pluginDir, runDirName } from "../../lib/paths";
import { containsCaseInsensitive, envNumber } from "../../lib/util";

// --- env knobs ---
const outDir = process.env.AFK_TRIGGER_OUT_DIR ?? fromPluginRoot("qa", "triggers", runDirName());
const maxBudgetUsd = process.env.AFK_TRIGGER_MAX_BUDGET_USD ?? "0.04";
const timeoutMs = envNumber("AFK_TRIGGER_TIMEOUT_SECONDS", 30) * 1000;
const trials = Math.max(1, Math.round(envNumber("AFK_TRIGGER_TRIALS", 3)));
const activationMin = envNumber("AFK_TRIGGER_ACTIVATION_MIN", 80);
const fpMax = envNumber("AFK_TRIGGER_FP_MAX", 10);
const skillFilter = process.env.AFK_TRIGGER_SKILL;
const queryFilter = process.env.AFK_TRIGGER_QUERY;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Longest-first so the most specific name wins prefix collisions
// ("write-good-goal" before "write-evals", "init-brain" before "brain").
// Derived from skills/ so a new skill is covered automatically; the
// integration suite separately enforces that corpus owners are real skills.
// Each name's bare-mention pattern is compiled once here, not per trial.
const ALL_SKILLS = skillNames()
  .sort((a, b) => b.length - a.length || a.localeCompare(b))
  .map((name) => ({
    name,
    // Word-boundary-style guard so "brain" doesn't match inside "init-brain".
    bareMention: new RegExp(`(?<![a-zA-Z0-9_-])${escapeRegExp(name)}(?![a-zA-Z0-9_])`, "i"),
  }));

type CorpusEntry = { query: string; owner: string };

/** One trial's outcome — every aggregate metric is derived from these. */
type TrialResult = { owner: string; winner: string; correct: boolean; cost: number };

const results: TrialResult[] = [];
// One entry per scored query: how many of its trials were correct. pass^k is
// the share that got every trial right — the consistency bar users hold a
// router to.
const queryScores: number[] = [];

/**
 * Detect which AFK skill (if any) was first invoked as a tool_use in the stream.
 *
 * Strategy:
 *   1. Walk assistant content blocks in order; the first `tool_use` whose name
 *      matches /skill/i is the winner candidate.
 *   2. JSON.stringify(block.input) is scanned for "afk:<skill>" first (most
 *      specific, no false matches), then for the bare skill name.
 *   3. Skills are tested longest-first so "write-good-goal" wins over
 *      "write-evals", and "init-brain" wins over "brain".
 */
function detectWinner(events: Record<string, unknown>[]): string {
  for (const block of assistantContentBlocks(events)) {
    if (block.type !== "tool_use") continue;
    const toolName = typeof block.name === "string" ? block.name : "";
    if (!/skill/i.test(toolName)) continue;

    const inputStr = JSON.stringify(block.input ?? {});
    const qualified = ALL_SKILLS.find((skill) => inputStr.includes(`afk:${skill.name}`));
    if (qualified) return qualified.name;
    const bare = ALL_SKILLS.find((skill) => skill.bareMention.test(inputStr));
    if (bare) return bare.name;
  }
  return "none";
}

const corpusPath = fromPluginRoot("tests", "e2e", "triggers", "corpus.json");
const corpus = existsSync(corpusPath) ? (JSON.parse(readFileSync(corpusPath, "utf8")) as CorpusEntry[]) : [];
const filteredCorpus = corpus.filter((entry) => {
  if (skillFilter && entry.owner !== skillFilter) return false;
  if (queryFilter && !containsCaseInsensitive(entry.query, queryFilter)) return false;
  return true;
});

test("corpus loaded and filters matched at least one entry", () => {
  expect(existsSync(corpusPath), `corpus not found at ${corpusPath}`).toBe(true);
  expect(filteredCorpus.length, "no corpus entries matched the applied filters").toBeGreaterThan(0);
});

beforeAll(() => {
  console.log("=== AFK trigger-activation runner ===");
  console.log(`Artifacts:        ${outDir}`);
  console.log(`Per-query budget: $${maxBudgetUsd}`);
  console.log(`Trials:           ${trials}`);
  console.log(`Activation min:   ${activationMin}%`);
  console.log(`FP max:           ${fpMax}%`);
  if (skillFilter) console.log(`Skill filter:     ${skillFilter}`);
  if (queryFilter) console.log(`Query filter:     ${queryFilter}`);
  mkdirSync(outDir, { recursive: true });
});

for (const [queryIndex, entry] of filteredCorpus.entries()) {
  test.concurrent(`${entry.owner}[${queryIndex}] "${entry.query.slice(0, 60)}"`, async ({ expect, annotate }) => {
    const safeOwner = entry.owner.replace(/[^a-zA-Z0-9_-]/g, "_");
    const artifactDir = join(outDir, safeOwner, String(queryIndex));
    mkdirSync(artifactDir, { recursive: true });

    // Write the query text so artifacts are self-describing.
    writeFileSync(join(artifactDir, "query.txt"), entry.query);

    let correctCount = 0;

    for (let trial = 1; trial <= trials; trial++) {
      const rawLog = join(artifactDir, `raw.trial${trial}.jsonl`);
      const projectDir = mkdtempSync(join(tmpdir(), `afk-trigger-${safeOwner}-${queryIndex}-`));
      execFileSync("git", ["init", "-q"], { cwd: projectDir });

      const result = await runCommand(
        [
          "claude",
          "-p",
          entry.query,
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
        { cwd: projectDir, timeoutMs },
      );

      // Always write raw JSONL — this is the calibration artifact.
      writeFileSync(rawLog, `${result.stdout}${result.stderr}`);

      const events = parseJsonLines(result.stdout);
      const winner = detectWinner(events);
      const correct = entry.owner !== "none" ? winner === entry.owner : winner === "none";
      if (correct) correctCount += 1;

      results.push({ owner: entry.owner, winner, correct, cost: eventCost(lastResultEvent(events)) });
      await annotate(`[trial ${trial}] fired=${winner}  expected=${entry.owner}  ${correct ? "OK" : "WRONG"}`, correct ? "notice" : "warning");
    }

    queryScores.push(correctCount);

    // Strict majority pass.
    expect(
      correctCount * 2 > trials,
      `(${correctCount}/${trials}) majority of trials did not match expected owner; see ${artifactDir}`,
    ).toBe(true);
  });
}

/**
 * Renders the recorded trials as `expected owner` rows by `skill that fired`
 * columns.
 */
function renderConfusionMatrix(): string {
  const owners = [...new Set(results.map((result) => result.owner))].sort();
  const cols = [...new Set(results.map((result) => result.winner))].sort();
  const count = (owner: string, winner: string) =>
    results.filter((result) => result.owner === owner && result.winner === winner).length;

  const colWidth = 16;
  const rowLabelWidth = 16;
  const header = "expected\\fired".padEnd(rowLabelWidth) + cols.map((col) => col.padStart(colWidth)).join("");
  const divider = "-".repeat(rowLabelWidth + cols.length * colWidth);
  const rows = owners.map((owner) => owner.padEnd(rowLabelWidth) + cols.map((col) => String(count(owner, col)).padStart(colWidth)).join(""));

  return [header, divider, ...rows].join("\n");
}

/** Percentage of `subset` within `total`, 0 for an empty denominator. */
function pct(subset: number, total: number): number {
  return total > 0 ? (subset / total) * 100 : 0;
}

afterAll(() => {
  // positive = queries with a real owner; "none" queries measure false positives.
  const positives = results.filter((result) => result.owner !== "none");
  const nones = results.filter((result) => result.owner === "none");
  const activationPct = pct(positives.filter((result) => result.winner !== "none").length, positives.length);
  const accuracyPct = pct(positives.filter((result) => result.correct).length, positives.length);
  const fpPct = pct(nones.filter((result) => result.winner !== "none").length, nones.length);
  const allCorrectQueries = queryScores.filter((correct) => correct === trials).length;
  const passHatK = pct(allCorrectQueries, queryScores.length);
  const totalCost = results.reduce((sum, result) => sum + result.cost, 0);

  const activationOk = activationPct >= activationMin;
  const fpOk = fpPct <= fpMax;

  // Built once so the console and the artifact can never report different numbers.
  const metricLines = [
    `Activation (positive queries, any skill fired): ${activationPct.toFixed(1)}%  (min ${activationMin}%)  ${activationOk ? "PASS" : "FAIL"}`,
    `Accuracy   (positive queries, correct skill):   ${accuracyPct.toFixed(1)}%`,
    `False-positive (none queries, any skill fired): ${fpPct.toFixed(1)}%  (max ${fpMax}%)  ${fpOk ? "PASS" : "FAIL"}`,
    `pass^${trials} (all trials correct per query):          ${passHatK.toFixed(1)}%  (${allCorrectQueries}/${queryScores.length} queries)`,
    `Total cost: $${totalCost.toFixed(6)}`,
  ];
  const matrix = renderConfusionMatrix();

  console.log("");
  console.log("=== Metrics ===");
  console.log(metricLines.map((line) => `  ${line}`).join("\n"));
  console.log("");
  console.log("=== Confusion matrix (rows=expected, cols=fired) ===");
  console.log(matrix);

  const matrixPath = join(outDir, "confusion-matrix.txt");
  writeFileSync(
    matrixPath,
    [
      "AFK trigger-activation confusion matrix",
      `Generated: ${new Date().toISOString()}`,
      `Trials per query: ${trials}`,
      "",
      "Rows = expected owner  |  Cols = skill that fired  |  Values = trial count",
      "",
      matrix,
      "",
      ...metricLines,
    ].join("\n"),
  );
  console.log(`Confusion matrix written to: ${matrixPath}`);

  // Aggregate gates — failing either fails the suite, mirroring the old runner's exit code.
  expect(activationOk, `activation ${activationPct.toFixed(1)}% below minimum ${activationMin}%`).toBe(true);
  expect(fpOk, `false-positive rate ${fpPct.toFixed(1)}% above maximum ${fpMax}%`).toBe(true);
});
