// Trials: one attempt at a task. Spawns a skill under `claude -p` against a
// fresh environment, records the transcript and the outcome, and grades a
// transcript against a rubric with an LLM judge. The vitest-facing harness
// (the `task` primitive, graders, per-assertion aggregation) lives in
// harness.ts.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { collectAssistantText, collectToolCalls, eventCost, initModel, lastResultEvent, numTurns, parseJsonLines, runCommand } from "./claude";
import { fromPluginRoot, pluginDir } from "./paths";
import { envNumber } from "./util";

const transcriptCharLimit = 20000;
const maxToolCallLines = 80;

export const evalConfig = {
  // AFK_EVAL_MAX_BUDGET_USD overrides every per-task budget; without it a task
  // may set its own, and this is the floor.
  maxBudgetUsd: process.env.AFK_EVAL_MAX_BUDGET_USD,
  defaultBudgetUsd: "0.50",
  timeoutMs: envNumber("AFK_EVAL_TIMEOUT_SECONDS", 180) * 1000,
  trials: Math.max(1, Math.round(envNumber("AFK_EVAL_TRIALS", 3))),
  judgeModel: process.env.AFK_EVAL_JUDGE_MODEL ?? "claude-haiku-4-5",
  judgeBudgetUsd: "0.10",
  // Trials within a task run concurrently, so vitest's maxConcurrency alone no
  // longer bounds live claude processes — this global cap does.
  concurrency: Math.max(1, Math.round(envNumber("AFK_EVAL_CONCURRENCY", 4))),
  // A trial that dies on infra (timeout, nonzero exit) is re-run this many
  // times before it counts as incomplete — infra flake is not a skill regression.
  trialRetries: Math.max(0, Math.round(envNumber("AFK_EVAL_TRIAL_RETRIES", 1))),
  // AFK_EVAL_FAST=1: skip the rubric grader for a task whose deterministic checks
  // already failed — the test fails either way, so the judge spend is waste.
  fast: process.env.AFK_EVAL_FAST === "1",
  // AFK_EVAL_REJUDGE=<run-dir>|latest: replay saved transcripts from a previous
  // run instead of spawning skills, so re-grading (new assertions, new judge
  // prompt, new needles) costs only judge calls.
  rejudge: process.env.AFK_EVAL_REJUDGE,
};

/** Where every run's artifacts land, one timestamped dir per run. */
export const evalsRoot = fromPluginRoot("qa", "evals");

/**
 * Finds the newest eval run on disk — the one `AFK_EVAL_REJUDGE=latest` replays
 * and `bun run eval:audit` samples, so both agree on what "latest" means.
 *
 * @param exclude - A run dir to ignore, e.g. the current run's own.
 * @returns The newest run dir by mtime (run dirs aren't always timestamp-named),
 * or `undefined` when there are none.
 */
export function latestRunDir(exclude?: string): string | undefined {
  if (!existsSync(evalsRoot)) return undefined;
  return readdirSync(evalsRoot)
    .map((name) => join(evalsRoot, name))
    .filter((path) => path !== exclude)
    // stat once per candidate, not once per sort comparison.
    .map((path) => ({ path, stat: statSync(path) }))
    .filter((entry) => entry.stat.isDirectory())
    .sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs)
    .at(-1)?.path;
}

let rejudgeRootCache: { key: string; value: string | undefined } | undefined;

/**
 * Resolves `AFK_EVAL_REJUDGE` to a concrete previous-run directory whose
 * transcripts should be replayed instead of spawning skills.
 *
 * @param currentRunDir - This run's artifact dir, skipped when scanning for the
 * newest previous run.
 * @returns The run dir to replay, or `undefined` when re-judge mode is off.
 * Memoized: the answer can't change during a run, and the harness asks once per
 * task.
 * @throws If the configured dir is missing, or `latest` finds no previous run.
 */
export function resolveRejudgeRoot(currentRunDir: string): string | undefined {
  if (rejudgeRootCache?.key !== currentRunDir) {
    rejudgeRootCache = { key: currentRunDir, value: computeRejudgeRoot(currentRunDir) };
  }
  return rejudgeRootCache.value;
}

function computeRejudgeRoot(currentRunDir: string): string | undefined {
  const value = evalConfig.rejudge;
  if (!value) return undefined;
  if (value !== "latest") {
    if (!existsSync(value)) throw new Error(`AFK_EVAL_REJUDGE points at a missing run dir: ${value}`);
    return value;
  }
  const latest = latestRunDir(currentRunDir);
  if (!latest) throw new Error(`AFK_EVAL_REJUDGE=latest but there are no previous runs under ${evalsRoot}`);
  return latest;
}

let inFlight = 0;
const waiters: (() => void)[] = [];
/**
 * Runs `fn` holding one of `AFK_EVAL_CONCURRENCY` claude slots, queueing when
 * they are all taken. Every claude spawn — trial or judge — takes a slot, so
 * this is what bounds live sessions. The e2e project runs a single vitest
 * worker, so this module state is process-global.
 */
async function withClaudeSlot<T>(fn: () => Promise<T>): Promise<T> {
  while (inFlight >= evalConfig.concurrency) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  inFlight += 1;
  try {
    return await fn();
  } finally {
    inFlight -= 1;
    waiters.shift()?.();
  }
}

/** Everything one trial produced: its transcript, its outcome, its metrics. */
export type TrialRecord = {
  // Set when the trial didn't complete cleanly; grading is skipped for it.
  failReason?: string;
  suffix: string;
  assistantText: string;
  toolCalls: string[];
  resultText: string;
  // Prose + final result, the haystack for substring assertions.
  output: string;
  // The trial's outcome: the environment's final state, copied out of the temp
  // project so outcome graders can inspect it after the run.
  outcomeDir: string;
  rawLog: string;
  cost: number;
  durationMs: number;
  numTurns: number;
  model: string;
};

export type TrialOptions = {
  files: Record<string, string>;
  maxBudgetUsd?: number;
  timeoutMs?: number;
  // Execution tasks are graded on the outcome (the environment's end state), so
  // the prompt drops the "narrate for the assertions" instruction that
  // explain-the-route tasks need — it would only diverge the agent from
  // production behavior.
  execution?: boolean;
  signal?: AbortSignal;
};

/**
 * Runs one trial: drives `/afk:<skill>` under `claude -p` in a clean
 * environment and records what happened.
 *
 * @param skill - The AFK skill under test; also the prompt's routing target.
 * @param entryPrompt - The task's prompt, sent after the `/afk:<skill>` line.
 * @param taskDir - Where this trial's artifacts land: the raw transcript, the
 * final result text, and the copied-out outcome directory.
 * @param suffix - Artifact suffix identifying the trial slot, e.g. `.trial2`
 * or `.trial2.retry1`; empty for a single-trial task.
 * @param options - The environment files plus per-task budget/timeout/execution
 * overrides.
 * @returns The trial's record. Infra failures set `failReason` rather than
 * throwing, so the caller can retry or exclude the trial from grading.
 */
export async function runTrial(skill: string, entryPrompt: string, taskDir: string, suffix: string, options: TrialOptions): Promise<TrialRecord> {
  // Every trial starts from a clean environment: a fresh temp git repo seeded
  // with only this task's fixture files, so no state leaks between trials.
  const projectDir = mkdtempSync(join(tmpdir(), `afk-eval-${skill}-`));
  const rawLog = join(taskDir, `raw${suffix}.jsonl`);
  const timeoutMs = options.timeoutMs ?? evalConfig.timeoutMs;
  const evalBudgetUsd = evalConfig.maxBudgetUsd ?? String(options.maxBudgetUsd ?? evalConfig.defaultBudgetUsd);
  const evalNote = options.execution
    ? "Eval mode: follow the AFK skill normally and carry the work through to completion — the end state of this project is what gets graded. Do not edit files outside this temporary eval project."
    : "Eval mode: follow the AFK skill normally. Include enough detail in the final response for the eval assertions to verify what happened. Do not edit files outside this temporary eval project.";
  const prompt = `/afk:${skill}

${entryPrompt}

${evalNote}`;

  execFileSync("git", ["init", "-q"], { cwd: projectDir });
  for (const [filePath, content] of Object.entries(options.files)) {
    const target = join(projectDir, filePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  const startedAt = Date.now();
  const result = await withClaudeSlot(() =>
    runCommand(
      [
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
      { cwd: projectDir, timeoutMs, signal: options.signal },
    ),
  );
  const durationMs = Date.now() - startedAt;
  writeFileSync(rawLog, `${result.stdout}${result.stderr}`);

  const outcomeDir = join(taskDir, `project${suffix}`);
  cpSync(projectDir, outcomeDir, { recursive: true });
  rmSync(projectDir, { recursive: true, force: true });

  const events = parseJsonLines(result.stdout);
  const resultEvent = lastResultEvent(events);
  const resultText = typeof resultEvent?.result === "string" ? resultEvent.result : "";
  const assistantText = collectAssistantText(events);
  writeFileSync(join(taskDir, `result${suffix}.txt`), resultText);

  let failReason: string | undefined;
  if (result.timedOut) {
    failReason = `claude timed out after ${timeoutMs}ms; see ${rawLog}`;
  } else if (result.exitCode !== 0) {
    failReason = `claude exited ${result.exitCode}; see ${rawLog}${resultText ? `; result: ${resultText}` : ""}`;
  } else if (resultEvent?.is_error === true) {
    failReason = `claude reported an error: ${resultText}`;
  }

  return {
    failReason,
    suffix,
    assistantText,
    toolCalls: collectToolCalls(events),
    resultText,
    output: `${assistantText}\n${resultText}`,
    outcomeDir,
    rawLog,
    cost: eventCost(resultEvent),
    durationMs,
    numTurns: numTurns(resultEvent),
    model: initModel(events),
  };
}

/**
 * Lists the replayable trial suffixes in a previous run's task dir.
 *
 * @param taskDir - A task dir from a previous run.
 * @returns The sorted suffixes, keeping only the final attempt per trial slot —
 * a `.retryN` artifact supersedes its base suffix. Empty when the dir is
 * missing.
 */
export function discoverCachedSuffixes(taskDir: string): string[] {
  if (!existsSync(taskDir)) return [];
  const suffixes = readdirSync(taskDir)
    .map((name) => name.match(/^raw(.*)\.jsonl$/)?.[1])
    .filter((suffix): suffix is string => suffix !== undefined);
  return suffixes.filter((suffix) => !suffixes.some((other) => other !== suffix && other.startsWith(`${suffix}.retry`))).sort();
}

/**
 * Rebuilds a trial from a previous run's saved artifacts (raw transcript plus
 * the copied-out outcome) so grading can be replayed without spawning a skill.
 *
 * @param taskDir - A task dir from a previous run.
 * @param suffix - The trial suffix to replay, from {@link discoverCachedSuffixes}.
 * @returns The rebuilt record, with `cost` zeroed — the original run already
 * paid it, so a re-judge must not double-count. A missing or error transcript
 * comes back with `failReason` set.
 */
export function loadTrialRecord(taskDir: string, suffix: string): TrialRecord {
  const rawLog = join(taskDir, `raw${suffix}.jsonl`);
  const outcomeDir = join(taskDir, `project${suffix}`);
  const base: TrialRecord = {
    suffix,
    assistantText: "",
    toolCalls: [],
    resultText: "",
    output: "",
    outcomeDir,
    rawLog,
    // Cost was paid by the original run; only new judge calls cost money here.
    cost: 0,
    durationMs: 0,
    numTurns: 0,
    model: "",
  };
  if (!existsSync(rawLog)) {
    return { ...base, failReason: `no cached transcript at ${rawLog}` };
  }
  const events = parseJsonLines(readFileSync(rawLog, "utf8"));
  const resultEvent = lastResultEvent(events);
  const resultText = typeof resultEvent?.result === "string" ? resultEvent.result : "";
  const assistantText = collectAssistantText(events);
  let failReason: string | undefined;
  if (!resultEvent) {
    failReason = `cached transcript has no result event (original trial likely timed out); see ${rawLog}`;
  } else if (resultEvent.is_error === true) {
    failReason = `cached trial reported an error: ${resultText}`;
  }
  return {
    ...base,
    failReason,
    assistantText,
    toolCalls: collectToolCalls(events),
    resultText,
    output: `${assistantText}\n${resultText}`,
    numTurns: numTurns(resultEvent),
    model: initModel(events),
  };
}

/**
 * Matches one recorded tool call against a needle from the tool-call grader.
 *
 * @param call - A recorded call line, e.g. `Edit(src/a.ts)`.
 * @param needle - A tool name (`"Edit"` matches `Edit(src/a.ts)` and bare
 * `Edit`, but not `MultiEdit(...)` or a `Read` of `editor.ts`), or — when it
 * carries a paren — a call-line prefix, so `"Edit(brain/"` scopes to a path.
 * @returns Whether the call satisfies the needle. Case-insensitive.
 */
export function toolCallMatches(call: string, needle: string): boolean {
  const haystack = call.toLocaleLowerCase();
  const wanted = needle.toLocaleLowerCase();
  if (wanted.includes("(")) return haystack.startsWith(wanted);
  return haystack === wanted || haystack.startsWith(`${wanted}(`);
}

/**
 * Ordered tool-correctness check: every needle must match some call, in order.
 *
 * @param calls - The trial's recorded tool calls, in the order they happened.
 * @param ordered - Needles that must appear as a subsequence — other calls may
 * interleave, so the grader doesn't punish valid extra work.
 * @returns Whether the ordered needles all matched, in order.
 */
export function toolCallsInOrder(calls: string[], ordered: string[]): boolean {
  let next = 0;
  for (const call of calls) {
    if (next < ordered.length && toolCallMatches(call, ordered[next]!)) next += 1;
  }
  return next === ordered.length;
}

/**
 * Renders a trial into the transcript the judge grades: assistant prose, the
 * tool calls, and the final result, capped to a fixed character budget.
 *
 * @param trial - The trial to render.
 * @returns The transcript. Overflow is cut from the middle of the prose and
 * from the middle of an over-long tool list, never from the tail.
 */
export function buildTranscript(trial: TrialRecord): string {
  // The tool list and the final result are the highest-signal evidence for the
  // judge, so overflow is always cut from the middle of the assistant prose —
  // never from the tail, where a naive head-slice would drop exactly the parts
  // most assertions grade.
  let toolLines = trial.toolCalls;
  if (toolLines.length > maxToolCallLines) {
    const half = maxToolCallLines / 2;
    toolLines = [...toolLines.slice(0, half), `…[${toolLines.length - maxToolCallLines} tool calls omitted]…`, ...toolLines.slice(-half)];
  }
  const toolsPart = toolLines.length > 0 ? `Tools used:\n${toolLines.map((call) => `- ${call}`).join("\n")}` : "";
  const resultPart = trial.resultText ? `Final result:\n${trial.resultText}` : "";
  const fixedParts = [toolsPart, resultPart].filter(Boolean).join("\n\n");

  const proseBudget = Math.max(4000, transcriptCharLimit - fixedParts.length);
  let prose = trial.assistantText;
  if (prose.length > proseBudget) {
    const head = prose.slice(0, Math.floor(proseBudget * 0.7));
    const tail = prose.slice(-Math.floor(proseBudget * 0.3));
    prose = `${head}\n…[${prose.length - head.length - tail.length} chars truncated from the middle]…\n${tail}`;
  }
  return [prose, fixedParts].filter(Boolean).join("\n\n");
}

/**
 * Pulls the judge's JSON verdict object out of its raw reply.
 *
 * @param text - The judge's reply: optional `<thinking>` reasoning, optionally
 * fenced JSON, possibly with trailing commas.
 * @returns The parsed object, or `undefined` when nothing parseable is there —
 * the caller treats that as an unscored trial rather than a skill failure.
 */
export function extractJson(text: string): unknown {
  // Discard any <thinking>…</thinking> reasoning the judge emits before its JSON
  // so a brace inside the reasoning can't derail the first-{ / last-} scan below.
  const stripped = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]! : stripped;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return undefined;
  const slice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    // Second chance for the most common judge malformation: trailing commas.
    // Only after a direct parse fails, so string values containing ", }" are
    // never corrupted on the happy path.
    try {
      return JSON.parse(slice.replace(/,\s*([\]}])/g, "$1"));
    } catch {
      return undefined;
    }
  }
}

export type AssertionVerdict = "met" | "unmet" | "unknown";
export type JudgeResult = { score: number; verdicts: AssertionVerdict[] };

/**
 * Unwraps a saved `judge*.json` artifact — a `claude --output-format json`
 * envelope. Shared by the grader and `bun run eval:audit`, so an audit can
 * never disagree with the grader about what a verdict says.
 *
 * @param raw - The artifact's contents.
 * @returns The judge's cost, and its reply text — the raw input when the
 * envelope is unparseable, so a bare reply still audits.
 */
export function parseJudgeEnvelope(raw: string): { cost: number; text: string } {
  let envelope: Record<string, unknown> | undefined;
  try {
    envelope = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    envelope = undefined;
  }
  return { cost: eventCost(envelope), text: typeof envelope?.result === "string" ? envelope.result : raw };
}

/**
 * The model-based grader: an LLM judge scores one trial's transcript against a
 * rubric — a list of natural-language assertions, one verdict each.
 *
 * @param transcript - The rendered transcript, from {@link buildTranscript}.
 * @param assertions - The rubric: one natural-language check per entry, graded
 * met / unmet / unknown. `unknown` is the judge's way out when the transcript
 * shows no evidence either way, and counts as unmet.
 * @param taskDir - Where the raw judge reply is saved for auditing.
 * @param trialSuffix - The trial slot being graded, used in the artifact name.
 * @param signal - Aborts the judge call when the test is torn down.
 * @returns The judge's cost, plus its `result` — or `result: null` when the
 * reply was unparseable, which excludes the trial from the verdict instead of
 * counting it against the skill.
 */
export async function judgeRubric(
  transcript: string,
  assertions: string[],
  taskDir: string,
  trialSuffix: string,
  signal?: AbortSignal,
): Promise<{ cost: number; result: JudgeResult | null }> {
  const numbered = assertions.map((assertion, index) => `${index + 1}. ${assertion}`).join("\n");
  const judgePrompt = `You are grading whether an AI coding agent's behavior met a list of assertions.

Below is a transcript of the agent's response (its prose, the tools it used, and its final message), followed by a numbered list of assertions.

For each assertion, decide whether the transcript shows it was met. Judge only against what the transcript demonstrates; do not assume unseen behavior. Be strict: answer "met" only when the transcript completely demonstrates the assertion — partial compliance is not "met". When torn between "met" and "unmet", choose "unmet". Reserve "unknown" for when the transcript contains no evidence either way.

First, reason about each assertion inside a single <thinking>…</thinking> block. Then, AFTER the closing </thinking> tag, output STRICT JSON only — no prose, no code fences — in exactly this shape:
{"results":[{"reason":"...","met":true}]}
with one entry per assertion, in the same order. "reason" is one short sentence; "met" is true, false, or the string "unknown".

=== TRANSCRIPT START ===
${transcript}
=== TRANSCRIPT END ===

Assertions:
${numbered}`;

  const judgeDir = mkdtempSync(join(tmpdir(), "afk-eval-judge-"));
  const result = await withClaudeSlot(() =>
    runCommand(
      [
        "claude",
        "-p",
        judgePrompt,
        "--model",
        evalConfig.judgeModel,
        "--permission-mode",
        "bypassPermissions",
        "--max-budget-usd",
        evalConfig.judgeBudgetUsd,
        "--output-format",
        "json",
      ],
      { cwd: judgeDir, timeoutMs: evalConfig.timeoutMs, signal },
    ),
  );
  rmSync(judgeDir, { recursive: true, force: true });

  writeFileSync(join(taskDir, `judge${trialSuffix}.json`), `${result.stdout}${result.stderr}`);

  const { cost, text } = parseJudgeEnvelope(result.stdout);
  const parsed = extractJson(text) as { results?: { met?: unknown }[] } | undefined;
  if (!parsed || !Array.isArray(parsed.results)) {
    return { cost, result: null };
  }

  const verdicts: AssertionVerdict[] = assertions.map((_, index) => {
    const met = parsed.results?.[index]?.met;
    if (met === true) return "met";
    if (met === "unknown") return "unknown";
    return "unmet";
  });
  const metCount = verdicts.filter((verdict) => verdict === "met").length;
  return { cost, result: { score: metCount / assertions.length, verdicts } };
}
