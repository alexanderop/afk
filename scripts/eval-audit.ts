#!/usr/bin/env bun
// Read-the-transcripts helper: sample judge verdicts from the latest eval run
// and print them next to the trial's final result, so auditing whether the
// judge agrees with your own reading is one command instead of spelunking.
//
//   bun run eval:audit             # latest run under qa/evals, 5 samples
//   bun run eval:audit 10          # latest run, 10 samples
//   bun run eval:audit <run-dir>   # a specific run dir
import { existsSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { listFiles } from "../tests/lib/fs";
import { evalsRoot, extractJson, latestRunDir, parseJudgeEnvelope } from "../tests/lib/trials";

const args = process.argv.slice(2);
const dirArg = args.find((arg) => Number.isNaN(Number(arg)));
const sampleCount = Number(args.find((arg) => !Number.isNaN(Number(arg))) ?? 5);

const runDir = dirArg ?? latestRunDir();
if (!runDir || !existsSync(runDir)) {
  console.error(`no eval run found${dirArg ? ` at ${dirArg}` : ` under ${evalsRoot}`} — run \`bun run test:evals\` first`);
  process.exit(1);
}

type JudgeVerdict = { reason?: string; met?: unknown };

const judgeFiles = listFiles(runDir, (path) => /^judge.*\.json$/.test(basename(path)));
if (judgeFiles.length === 0) {
  console.error(`no judge artifacts under ${runDir} — this run may have been routing-only`);
  process.exit(1);
}

// Deterministic spread over the run instead of always auditing the same files:
// take every k-th judge file.
const step = Math.max(1, Math.floor(judgeFiles.length / sampleCount));
const sampled = judgeFiles.filter((_, index) => index % step === 0).slice(0, sampleCount);

console.log(`Auditing ${sampled.length} of ${judgeFiles.length} judge verdict(s) from ${runDir}\n`);

for (const judgeFile of sampled) {
  const taskDir = join(judgeFile, "..");
  const suffix = judgeFile.match(/judge(.*)\.json$/)?.[1] ?? "";
  console.log("=".repeat(72));
  console.log(`Task: ${relative(runDir, taskDir)}${suffix ? `  (trial${suffix.replace(".trial", " ")})` : ""}`);

  const { text: resultText } = parseJudgeEnvelope(readFileSync(judgeFile, "utf8"));
  const reasoning = resultText.match(/<thinking>([\s\S]*?)<\/thinking>/i)?.[1]?.trim();
  const parsed = extractJson(resultText) as { results?: JudgeVerdict[] } | undefined;

  if (parsed?.results) {
    console.log("Judge verdicts:");
    for (const [index, verdict] of parsed.results.entries()) {
      const mark = verdict.met === true ? "MET    " : verdict.met === "unknown" ? "UNKNOWN" : "UNMET  ";
      console.log(`  ${index + 1}. [${mark}] ${verdict.reason ?? "(no reason)"}`);
    }
  } else {
    console.log("Judge verdicts: unparseable — read the raw file:");
    console.log(`  ${judgeFile}`);
  }
  if (reasoning) {
    console.log(`Judge reasoning (first 600 chars):\n  ${reasoning.slice(0, 600).replace(/\n/g, "\n  ")}`);
  }

  const trialResult = join(taskDir, `result${suffix}.txt`);
  if (existsSync(trialResult)) {
    const text = readFileSync(trialResult, "utf8").trim();
    console.log(`\nAgent final result (first 1200 chars of ${relative(runDir, trialResult)}):`);
    console.log(`  ${text.slice(0, 1200).replace(/\n/g, "\n  ")}`);
  }
  const rawLog = join(taskDir, `raw${suffix}.jsonl`);
  if (existsSync(rawLog)) {
    console.log(`\nFull transcript: ${rawLog}`);
  }
  console.log("");
}

console.log("Disagree with a verdict? Fix the assertion wording or the transcript evidence — a miscalibrated judge silently inverts the gate.");
