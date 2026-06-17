import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync, which } from "bun";
import { fromPluginRoot, pluginDir } from "../../lib/paths";
import { containsCaseInsensitive, envNumber, TestRun } from "../../lib/runner";

// --- env knobs ---
const outDir =
  process.env.AFK_TRIGGER_OUT_DIR ??
  fromPluginRoot("qa", "triggers", new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"));
const maxBudgetUsd = process.env.AFK_TRIGGER_MAX_BUDGET_USD ?? "0.04";
const timeoutMs = envNumber("AFK_TRIGGER_TIMEOUT_SECONDS", 30) * 1000;
const trials = Math.max(1, Math.round(envNumber("AFK_TRIGGER_TRIALS", 3)));
const activationMin = envNumber("AFK_TRIGGER_ACTIVATION_MIN", 80);
const fpMax = envNumber("AFK_TRIGGER_FP_MAX", 10);
const skillFilter = process.env.AFK_TRIGGER_SKILL;
const queryFilter = process.env.AFK_TRIGGER_QUERY;

// --- 19 known skill directory names (longest/most-specific variants first to avoid prefix collisions) ---
const ALL_SKILLS = [
  "write-good-goal",
  "write-evals",
  "init-brain",
  "map-codebase",
  "batch",
  "brain",
  "grill",
  "help",
  "implement",
  "meditate",
  "plan",
  "prototype",
  "qa",
  "reflect",
  "research",
  "review",
  "ruminate",
  "ship",
  "simplify",
] as const;

type CorpusEntry = { query: string; owner: string };
type Winner = (typeof ALL_SKILLS)[number] | "none";

const run = new TestRun();
let totalCost = 0;

// --- aggregate metric counters ---
// positive = queries where owner !== "none"
let positiveTotalTrials = 0;
let positiveActivatedTrials = 0; // any skill fired
let positiveCorrectTrials = 0;   // correct skill fired
// none queries
let noneTotalTrials = 0;
let noneFalsePositiveTrials = 0; // any skill fired on a "none" query

// Confusion matrix: confusionMatrix[expected][actual] = count
const confusionMatrix: Record<string, Record<string, number>> = {};

function initConfusion(owner: string, fired: Winner): void {
  confusionMatrix[owner] ??= {};
  confusionMatrix[owner][fired] ??= 0;
  confusionMatrix[owner][fired]! += 1;
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

/**
 * Detect which AFK skill (if any) was first invoked as a tool_use in the stream.
 *
 * Strategy:
 *   1. Walk assistant events in order, walk content blocks in order.
 *   2. The first content block where type === "tool_use" AND name matches /skill/i
 *      is the winner candidate.
 *   3. JSON.stringify(content.input) is scanned for "afk:<skill>" first (preferred),
 *      then for the bare skill name with a word-boundary guard.
 *   4. Skills are tested longest-first so "write-good-goal" wins over "write-evals",
 *      and "init-brain" wins over "brain".
 */
function detectWinner(events: Record<string, unknown>[]): Winner {
  for (const event of events) {
    if (event.type !== "assistant") continue;
    const message = event.message as Record<string, unknown> | undefined;
    const contentBlocks = Array.isArray(message?.content) ? (message.content as Record<string, unknown>[]) : [];

    for (const block of contentBlocks) {
      if (typeof block !== "object" || block === null) continue;
      if (block["type"] !== "tool_use") continue;
      const toolName = typeof block["name"] === "string" ? block["name"] : "";
      if (!/skill/i.test(toolName)) continue;

      // This is a skill tool_use block. Scan input for skill identity.
      const inputStr = JSON.stringify(block["input"] ?? {});

      // Pass 1: look for "afk:<skill>" (most specific, no false matches)
      for (const skill of ALL_SKILLS) {
        if (inputStr.includes(`afk:${skill}`)) {
          return skill as Winner;
        }
      }

      // Pass 2: bare skill name with a word-boundary-style guard.
      // We require the name to be preceded and followed by a non-alphanumeric
      // character (or start/end of string) so e.g. "brain" doesn't match inside
      // "init-brain" (which was already caught in pass 1 if present as afk:init-brain).
      for (const skill of ALL_SKILLS) {
        const pattern = new RegExp(`(?<![a-zA-Z0-9_-])${escapeRegExp(skill)}(?![a-zA-Z0-9_])`, "i");
        if (pattern.test(inputStr)) {
          return skill as Winner;
        }
      }
    }
  }
  return "none";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runQuery(entry: CorpusEntry, queryIndex: number): void {
  const safeOwner = entry.owner.replace(/[^a-zA-Z0-9_-]/g, "_");
  const artifactDir = join(outDir, safeOwner, String(queryIndex));
  mkdirSync(artifactDir, { recursive: true });

  // Write the query text so artifacts are self-describing.
  writeFileSync(join(artifactDir, "query.txt"), entry.query);

  let correctCount = 0;
  const trialResults: { winner: Winner; correct: boolean }[] = [];

  for (let trial = 1; trial <= trials; trial++) {
    const rawLog = join(artifactDir, `raw.trial${trial}.jsonl`);
    const projectDir = mkdtempSync(join(tmpdir(), `afk-trigger-${safeOwner}-${queryIndex}-`));
    spawnSync({ cmd: ["git", "init", "-q"], cwd: projectDir });

    const result = spawnSync({
      cmd: [
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
      cwd: projectDir,
      stdout: "pipe",
      stderr: "pipe",
      timeout: timeoutMs,
    });

    // Always write raw JSONL — this is the calibration artifact.
    writeFileSync(rawLog, `${result.stdout.toString()}${result.stderr.toString()}`);

    const events = readJsonLines(rawLog);
    const resultEvent = events.filter((e) => e["type"] === "result").at(-1) as Record<string, unknown> | undefined;
    const cost = Number(resultEvent?.["total_cost_usd"] ?? 0);
    totalCost += Number.isFinite(cost) ? cost : 0;

    const winner = detectWinner(events);
    const isPositive = entry.owner !== "none";
    const correct = isPositive ? winner === entry.owner : winner === "none";
    if (correct) correctCount += 1;

    trialResults.push({ winner, correct });

    // Update aggregate counters.
    if (isPositive) {
      positiveTotalTrials += 1;
      if (winner !== "none") positiveActivatedTrials += 1;
      if (winner === entry.owner) positiveCorrectTrials += 1;
    } else {
      noneTotalTrials += 1;
      if (winner !== "none") noneFalsePositiveTrials += 1;
    }

    initConfusion(entry.owner, winner);

    const trialLabel = `[trial ${trial}]`;
    console.log(`    ${trialLabel} fired=${winner}  expected=${entry.owner}  ${correct ? "OK" : "WRONG"}`);
  }

  // Strict majority pass.
  const passed = correctCount * 2 > trials;
  const label = `${entry.owner}[${queryIndex}] "${entry.query.slice(0, 60)}" (${correctCount}/${trials})`;
  if (passed) {
    run.pass(label);
  } else {
    run.fail(label, `majority of trials did not match expected owner; see ${artifactDir}`);
  }
}

// --- confusion matrix rendering ---
function renderConfusionMatrix(): string {
  const owners = Object.keys(confusionMatrix).sort();
  const firedSkills = new Set<string>();
  for (const row of Object.values(confusionMatrix)) {
    for (const col of Object.keys(row)) {
      firedSkills.add(col);
    }
  }
  const cols = [...firedSkills].sort();

  const colWidth = 16;
  const rowLabelWidth = 16;

  const header =
    "expected\\fired".padEnd(rowLabelWidth) +
    cols.map((c) => c.padStart(colWidth)).join("");

  const divider = "-".repeat(rowLabelWidth + cols.length * colWidth);

  const rows = owners.map((owner) => {
    const rowData = confusionMatrix[owner] ?? {};
    return (
      owner.padEnd(rowLabelWidth) +
      cols.map((col) => String(rowData[col] ?? 0).padStart(colWidth)).join("")
    );
  });

  return [header, divider, ...rows].join("\n");
}

// ===== startup =====

console.log("=== AFK trigger-activation runner ===");
console.log(`Artifacts:        ${outDir}`);
console.log(`Per-query budget: $${maxBudgetUsd}`);
console.log(`Trials:           ${trials}`);
console.log(`Activation min:   ${activationMin}%`);
console.log(`FP max:           ${fpMax}%`);
if (skillFilter) console.log(`Skill filter:     ${skillFilter}`);
if (queryFilter) console.log(`Query filter:     ${queryFilter}`);
console.log("");

if (!which("claude")) {
  run.fail("claude CLI is installed");
  run.summary();
  process.exit(1);
}

const corpusPath = fromPluginRoot("tests", "e2e", "triggers", "corpus.json");
if (!existsSync(corpusPath)) {
  console.error(`ERROR: corpus not found at ${corpusPath}`);
  console.error("The corpus file is required. Run the corpus-authoring worker first.");
  process.exit(1);
}

let corpus: CorpusEntry[];
try {
  corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as CorpusEntry[];
} catch (err) {
  console.error(`ERROR: failed to parse corpus.json: ${err}`);
  process.exit(1);
}

// Apply filters.
const filteredCorpus = corpus.filter((entry) => {
  if (skillFilter && entry.owner !== skillFilter) return false;
  if (queryFilter && !containsCaseInsensitive(entry.query, queryFilter)) return false;
  return true;
});

if (filteredCorpus.length === 0) {
  console.error("ERROR: No corpus entries matched the applied filters.");
  process.exit(1);
}

console.log(`Running ${filteredCorpus.length} queries x ${trials} trials...`);
console.log("");

mkdirSync(outDir, { recursive: true });

for (let i = 0; i < filteredCorpus.length; i++) {
  const entry = filteredCorpus[i]!;
  console.log(`[${i + 1}/${filteredCorpus.length}] owner=${entry.owner}  query="${entry.query.slice(0, 70)}"`);
  runQuery(entry, i);
}

// ===== metrics =====

const activationPct = positiveTotalTrials > 0 ? (positiveActivatedTrials / positiveTotalTrials) * 100 : 0;
const accuracyPct = positiveTotalTrials > 0 ? (positiveCorrectTrials / positiveTotalTrials) * 100 : 0;
const fpPct = noneTotalTrials > 0 ? (noneFalsePositiveTrials / noneTotalTrials) * 100 : 0;

const activationOk = activationPct >= activationMin;
const fpOk = fpPct <= fpMax;
const gatesOk = activationOk && fpOk;

console.log("");
console.log("=== Metrics ===");
console.log(`  Activation (positive queries, any skill fired): ${activationPct.toFixed(1)}%  ${activationOk ? "OK" : `FAIL (min ${activationMin}%)`}`);
console.log(`  Accuracy   (positive queries, correct skill):   ${accuracyPct.toFixed(1)}%`);
console.log(`  False-positive (none queries, any skill fired): ${fpPct.toFixed(1)}%  ${fpOk ? "OK" : `FAIL (max ${fpMax}%)`}`);
console.log(`  Total cost: $${totalCost.toFixed(6)}`);

const matrix = renderConfusionMatrix();
console.log("");
console.log("=== Confusion matrix (rows=expected, cols=fired) ===");
console.log(matrix);

// Write confusion matrix artifact.
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
    `Activation: ${activationPct.toFixed(1)}%  (min ${activationMin}%)  ${activationOk ? "PASS" : "FAIL"}`,
    `Accuracy:   ${accuracyPct.toFixed(1)}%`,
    `FP rate:    ${fpPct.toFixed(1)}%  (max ${fpMax}%)  ${fpOk ? "PASS" : "FAIL"}`,
    `Cost:       $${totalCost.toFixed(6)}`,
  ].join("\n"),
);
console.log(`\nConfusion matrix written to: ${matrixPath}`);

run.summary([
  `Cost: $${totalCost.toFixed(6)}`,
  `Activation: ${activationPct.toFixed(1)}%  Accuracy: ${accuracyPct.toFixed(1)}%  FP: ${fpPct.toFixed(1)}%`,
  `Gates: activation>=${activationMin}%=${activationOk ? "PASS" : "FAIL"}  FP<=${fpMax}%=${fpOk ? "PASS" : "FAIL"}`,
]);

process.exit(run.exitCode() === 0 && gatesOk ? 0 : 1);
