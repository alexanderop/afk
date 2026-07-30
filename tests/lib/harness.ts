// The eval harness: `task` is the vitest-facing primitive for one eval task —
// a prompt, an environment, and success criteria. It hands the test a `run`
// fixture that drives a skill under claude for k trials, and extends expect
// with the graders:
//
//   code-based   toRoute, toUseTools, toHaveFile, toLeaveUnchanged,
//                toContainAll/None, trial.exec (outcome check)
//   model-based  toPassRubric (an LLM judge scores natural-language assertions)
//
// Trial-majority and per-assertion-majority semantics live in the graders; the
// cross-file run report is aggregated from summary.jsonl by tests/e2e/setup.ts.
// Trials, transcripts, and the judge call itself live in trials.ts.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { expect, inject, test as base } from "vitest";
import type { AssertionRow, SummaryRecord } from "./report";
import {
  buildTranscript,
  discoverCachedSuffixes,
  evalConfig,
  judgeRubric,
  loadTrialRecord,
  resolveRejudgeRoot,
  runTrial,
  toolCallMatches,
  toolCallsInOrder,
  type TrialRecord,
} from "./trials";
import { containsCaseInsensitive } from "./util";

/** A completed trial, plus the accessors the graders read it through. */
export type Trial = TrialRecord & {
  fixtureFiles: Record<string, string>;
  hasFile(path: string): boolean;
  // Returns "" when the file does not exist, so toContainAll reads naturally.
  file(path: string): string;
  // Runs a shell command against the trial's outcome — the deterministic
  // outcome grader for execution tasks ("do the tests the agent wrote pass?").
  exec(command: string): { exitCode: number; output: string };
};

/** What one task's k trials produced — the value every grader is handed. */
export type TaskResult = {
  skill: string;
  taskName: string;
  dir: string;
  summaryFile: string;
  // Trials attempted; `trials` holds only the completed ones. Failed trials
  // land in failReasons, and the verdict graders (toRoute / toPassRubric)
  // fail the task whenever any trial did not complete.
  totalTrials: number;
  trials: Trial[];
  failReasons: string[];
  annotate: (message: string, type?: string) => Promise<unknown>;
  // Aborted when the test is torn down (timeout, Ctrl+C), so a judge call
  // started by a grader can't outlive the test and keep billing.
  signal: AbortSignal;
  // Deterministic (expect.soft) failures recorded so far on this task — the
  // fast-mode rubric skip keys off it.
  softFailures: () => number;
};

/** Per-task overrides for `run(prompt, options)`. */
export type TaskOptions = {
  // The environment each trial starts from: seeded into a fresh temp git repo.
  files?: Record<string, string>;
  trials?: number;
  maxBudgetUsd?: number;
  timeoutMs?: number;
  // Execution tasks let the skill actually do the work and are graded on the
  // outcome; the harness drops the narrate-for-assertions prompt.
  execution?: boolean;
};

/** The routing grader's criteria: substrings the output must / must not carry. */
export type RouteCheck = {
  expect?: string[];
  forbid?: string[];
  // Marks a task that guards against over-eager refusals; the run report
  // counts its failures separately as over-blocking.
  overblockGuard?: boolean;
  // capability: true marks a capability task — the score is recorded and
  // reported but never fails the suite. Capability tasks graduate to regression
  // tasks (the default) once they pass reliably.
  capability?: boolean;
};

// Deterministic tool-call grader over what a trial actually did. Needles match
// by tool name ("Edit"), or by call-line prefix when they carry a paren
// ("Edit(brain/"). `ordered` requires its needles as an in-order subsequence.
export type ToolCallCheck = {
  required?: string[];
  forbidden?: string[];
  ordered?: string[];
};

/** Grading options for the rubric grader. */
export type RubricOptions = {
  // Opt-out to the legacy mean-score gate for genuinely fuzzy tasks; without
  // it, every assertion must be met in a strict majority of scored trials.
  threshold?: number;
  // capability: true marks a capability task — recorded and reported, never
  // failing the suite.
  capability?: boolean;
};

declare module "vitest" {
  interface Matchers<R = unknown> {
    toContainAll: (needles: string[]) => R;
    toContainNone: (needles: string[]) => R;
    toHaveFile: (path: string) => R;
    toLeaveUnchanged: (path: string) => R;
    toUseTools: (usage: ToolCallCheck) => R;
    toRoute: (routing: RouteCheck) => Promise<void>;
    toPassRubric: (assertions: string[], options?: RubricOptions) => Promise<void>;
  }
  interface ProvidedContext {
    evalRunDir: string;
  }
}

/**
 * Turns a task name into a filesystem-safe artifact directory name.
 *
 * @param name - The task name as written in the eval file.
 * @returns A lowercase kebab-case slug, capped at 80 characters.
 */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Wraps a completed trial record in the accessors the graders use to read its
 * outcome: `hasFile`, `file`, and `exec` against the trial's outcome dir.
 *
 * @param attempt - A trial record that completed (no `failReason`).
 * @param fixtureFiles - The environment the trial started from, so
 * `toLeaveUnchanged` can compare against it.
 * @returns The gradable trial.
 */
function makeTrial(attempt: TrialRecord, fixtureFiles: Record<string, string>): Trial {
  return {
    ...attempt,
    fixtureFiles,
    hasFile: (path) => existsSync(join(attempt.outcomeDir, path)),
    file: (path) => (existsSync(join(attempt.outcomeDir, path)) ? readFileSync(join(attempt.outcomeDir, path), "utf8") : ""),
    exec: (command) => {
      const proc = spawnSync(command, { cwd: attempt.outcomeDir, shell: true, encoding: "utf8", timeout: 120_000 });
      return { exitCode: proc.status ?? -1, output: `${proc.stdout ?? ""}${proc.stderr ?? ""}` };
    },
  };
}

/**
 * Appends one event to the run's summary, which tests/e2e/setup.ts aggregates
 * into the run report and qa/evals/history.jsonl.
 *
 * @param summaryFile - The run's summary.jsonl.
 * @param entry - A `task`, `rubric`, or `routing` record. One JSON line per
 * event; O_APPEND keeps writes from parallel workers whole. Typed so the
 * producer and the report that reads it can't drift apart silently.
 */
function record(summaryFile: string, entry: SummaryRecord): void {
  appendFileSync(summaryFile, `${JSON.stringify(entry)}\n`);
}

/**
 * The eval primitive: one task — a prompt, an environment, and success
 * criteria — written as a vitest test.
 *
 * The test gets a `run(prompt, options)` fixture that drives the skill named by
 * the eval file for k trials (`AFK_EVAL_TRIALS`, default 3) and returns a
 * {@link TaskResult} to hand to the graders. `run` may be called more than once
 * per task; each call gets its own artifact dir.
 *
 * @example
 * task("writes the plan artifact", async ({ run, expect }) => {
 *   const result = await run("Finish the grill session.", { files: {} });
 *   for (const trial of result.trials) expect.soft(trial).toHaveFile("brain/plans/x.md");
 *   await expect(result).toPassRubric(["Creates a plan artifact"]);
 * });
 */
export const task = base
  // Eval files are named <skill>.eval.ts; the filename is the routing target.
  .extend("skill", ({ task: testCase }) => basename(testCase.file.filepath).replace(/\.eval\.ts$/, ""))
  .extend("run", ({ skill, task: testCase, signal, annotate }) => {
    const outDir = inject("evalRunDir");
    const summaryFile = join(outDir, "summary.jsonl");
    let calls = 0;

    return async (prompt: string, options: TaskOptions = {}): Promise<TaskResult> => {
      calls += 1;
      const taskName = calls > 1 ? `${slug(testCase.name)}-${calls}` : slug(testCase.name);
      const dir = join(outDir, skill, taskName);
      mkdirSync(dir, { recursive: true });

      const files = options.files ?? {};
      const trials: Trial[] = [];
      const failReasons: string[] = [];
      const rejudgeRoot = resolveRejudgeRoot(outDir);
      let cost = 0;
      let totalTrials: number;
      let attempts: TrialRecord[];

      if (rejudgeRoot) {
        // Re-judge mode: replay the previous run's saved transcripts and
        // outcomes — grading changes cost judge calls, not skill runs.
        const prevDir = join(rejudgeRoot, skill, taskName);
        const suffixes = discoverCachedSuffixes(prevDir);
        totalTrials = Math.max(1, suffixes.length);
        attempts = suffixes.length > 0 ? suffixes.map((suffix) => loadTrialRecord(prevDir, suffix)) : [loadTrialRecord(prevDir, "")];
        await annotate(`re-judging cached trials from ${prevDir}`);
      } else {
        totalTrials = Math.max(1, options.trials ?? evalConfig.trials);
        // Trials run concurrently; the global claude-slot semaphore in trials.ts
        // keeps the total number of live claude processes bounded. A trial that
        // dies on infra (timeout, nonzero exit) is retried before it counts as
        // incomplete — infra flake is not evidence about the skill.
        attempts = await Promise.all(
          Array.from({ length: totalTrials }, async (_, index) => {
            const baseSuffix = totalTrials > 1 ? `.trial${index + 1}` : "";
            const trialOptions = {
              files,
              maxBudgetUsd: options.maxBudgetUsd,
              timeoutMs: options.timeoutMs,
              execution: options.execution,
              signal,
            };
            let attempt = await runTrial(skill, prompt, dir, baseSuffix, trialOptions);
            for (let retry = 1; attempt.failReason && retry <= evalConfig.trialRetries; retry += 1) {
              cost += attempt.cost;
              await annotate(`trial ${index + 1} did not complete (${attempt.failReason}); retrying`, "warning");
              attempt = await runTrial(skill, prompt, dir, `${baseSuffix}.retry${retry}`, trialOptions);
            }
            return attempt;
          }),
        );
      }

      for (const [index, attempt] of attempts.entries()) {
        cost += attempt.cost;
        if (attempt.failReason) {
          failReasons.push(attempt.failReason);
          await annotate(`trial ${index + 1} did not complete: ${attempt.failReason}`, "error");
        } else {
          trials.push(makeTrial(attempt, files));
        }
      }

      record(summaryFile, {
        type: "task",
        skill,
        task: testCase.name,
        cost,
        trials: totalTrials,
        completed: trials.length,
        rejudged: rejudgeRoot !== undefined,
        model: attempts.find((attempt) => attempt.model)?.model ?? "",
        // Tracked per-trial metrics: turns, tool calls, wall clock.
        turns: attempts.map((attempt) => attempt.numTurns),
        toolCalls: attempts.map((attempt) => attempt.toolCalls.length),
        durationsMs: attempts.map((attempt) => attempt.durationMs),
      });
      await annotate(`${totalTrials} trial(s), $${cost.toFixed(4)} — ${dir}`);

      return {
        skill,
        taskName: testCase.name,
        dir,
        summaryFile,
        totalTrials,
        trials,
        failReasons,
        annotate,
        signal,
        softFailures: () => testCase.result?.errors?.length ?? 0,
      };
    };
  });

/**
 * Narrows a matcher's received value to a {@link Trial}.
 *
 * @param received - Whatever was passed to `expect(...)`.
 * @param grader - The grader name, for the error message.
 * @returns The trial.
 * @throws TypeError when the grader was pointed at something else — usually the
 * whole TaskResult instead of one of its `trials`.
 */
function asTrial(received: unknown, grader: string): Trial {
  const trial = received as Trial | undefined;
  if (!trial || typeof trial.file !== "function") {
    throw new TypeError(`${grader} expects a Trial from result.trials (got ${typeof received})`);
  }
  return trial;
}

/**
 * Narrows a matcher's received value to a {@link TaskResult}.
 *
 * @param received - Whatever was passed to `expect(...)`.
 * @param grader - The grader name, for the error message.
 * @returns The task result.
 * @throws TypeError when the grader was pointed at something else — usually a
 * single trial instead of the value `run()` returned.
 */
function asResult(received: unknown, grader: string): TaskResult {
  const result = received as TaskResult | undefined;
  if (!result || !Array.isArray(result.trials)) {
    throw new TypeError(`${grader} expects the TaskResult returned by run() (got ${typeof received})`);
  }
  return result;
}

expect.extend({
  toContainAll(received: unknown, needles: string[]) {
    const text = String(received ?? "");
    const missing = needles.filter((needle) => !containsCaseInsensitive(text, needle));
    return {
      pass: missing.length === 0,
      message: () =>
        missing.length > 0
          ? `missing (case-insensitive): ${missing.map((needle) => `'${needle}'`).join(", ")}`
          : `expected text not to contain all of: ${needles.join(", ")}`,
    };
  },

  toContainNone(received: unknown, needles: string[]) {
    const text = String(received ?? "");
    const present = needles.filter((needle) => containsCaseInsensitive(text, needle));
    return {
      pass: present.length === 0,
      message: () =>
        present.length > 0
          ? `forbidden text present (case-insensitive): ${present.map((needle) => `'${needle}'`).join(", ")}`
          : `expected text to contain one of: ${needles.join(", ")}`,
    };
  },

  // Outcome graders: what the environment looks like after the trial, not what
  // the agent said about it.
  toHaveFile(received: unknown, path: string) {
    const trial = asTrial(received, "toHaveFile");
    return {
      pass: trial.hasFile(path),
      message: () => `expected the trial to ${this.isNot ? "not " : ""}create ${path} (see ${trial.outcomeDir})`,
    };
  },

  toLeaveUnchanged(received: unknown, path: string) {
    const trial = asTrial(received, "toLeaveUnchanged");
    const expected = trial.fixtureFiles[path];
    const actual = trial.hasFile(path) ? trial.file(path) : undefined;
    return {
      pass: actual === expected,
      message: () => `expected ${path} to be left unchanged (see ${trial.outcomeDir})`,
      actual,
      expected,
    };
  },

  // Tool-call grader over what the trial actually did — the "grade the outcome,
  // not the self-report" check for tool behavior. A rubric assertion grades what
  // the skill says; this grades the calls it made.
  toUseTools(received: unknown, usage: ToolCallCheck) {
    const trial = asTrial(received, "toUseTools");
    const missing = (usage.required ?? []).filter((needle) => !trial.toolCalls.some((call) => toolCallMatches(call, needle)));
    const present = (usage.forbidden ?? []).filter((needle) => trial.toolCalls.some((call) => toolCallMatches(call, needle)));
    const orderedOk = usage.ordered === undefined || toolCallsInOrder(trial.toolCalls, usage.ordered);
    const problems = [
      missing.length > 0 ? `missing tool calls [${missing.join(", ")}]` : "",
      present.length > 0 ? `forbidden tool calls present [${present.join(", ")}]` : "",
      orderedOk ? "" : `calls out of order, expected subsequence [${(usage.ordered ?? []).join(" -> ")}]`,
    ].filter(Boolean);
    const callList = trial.toolCalls.length > 0 ? trial.toolCalls.map((call) => `  - ${call}`).join("\n") : "  (none)";
    return {
      pass: problems.length === 0,
      message: () =>
        problems.length > 0
          ? `${problems.join("; ")}; the trial's tool calls were:\n${callList}\nsee ${trial.rawLog}`
          : `expected tool usage not to satisfy ${JSON.stringify(usage)}`,
    };
  },

  // Routing grader: a strict majority of completed trials must contain every
  // expected substring and none of the forbidden ones — and a strict majority
  // of attempted trials must have completed at all (quorum), so infra failures
  // are excluded from grading without letting them masquerade as evidence.
  // Needles should be identifiers (skill/agent/file names) or output-template
  // markers — prose phrases false-fail on negated mentions ("we do NOT
  // dispatch …").
  async toRoute(received: unknown, routing: RouteCheck) {
    const result = asResult(received, "toRoute");
    const capability = routing.capability === true;
    let correct = 0;
    const details: string[] = [];

    for (const [index, trial] of result.trials.entries()) {
      const missing = (routing.expect ?? []).filter((needle) => !containsCaseInsensitive(trial.output, needle));
      const present = (routing.forbid ?? []).filter((needle) => containsCaseInsensitive(trial.output, needle));
      const ok = missing.length === 0 && present.length === 0;
      if (ok) {
        correct += 1;
      } else {
        details.push(
          `trial ${index + 1}: ${[
            missing.length > 0 ? `missing [${missing.join(", ")}]` : "",
            present.length > 0 ? `forbidden present [${present.join(", ")}]` : "",
          ]
            .filter(Boolean)
            .join("; ")}`,
        );
      }
      await result.annotate(`trial ${index + 1} route: ${ok ? "correct" : "wrong"}`, ok ? "notice" : "warning");
    }

    const completed = result.trials.length;
    const hasQuorum = completed * 2 > result.totalTrials;
    const verdict = hasQuorum && correct * 2 > completed;
    record(result.summaryFile, {
      type: "routing",
      skill: result.skill,
      task: result.taskName,
      correct,
      // pass@k / pass^k input: how many of the k trials passed on their own.
      passedTrials: correct,
      total: result.totalTrials,
      completed,
      infra: result.totalTrials - completed,
      passed: verdict,
      capability,
      overblockGuard: routing.overblockGuard === true,
    });
    if (capability) {
      await result.annotate(`capability task (not gating): routing ${correct}/${completed} completed trials correct`, verdict ? "notice" : "warning");
      return { pass: true, message: () => "capability task (capability: true) never fails the suite" };
    }
    return {
      pass: verdict,
      message: () =>
        hasQuorum
          ? `routing ${correct}/${completed} completed trials correct${details.length > 0 ? `: ${details.join(" | ")}` : ""}${
              result.failReasons.length > 0 ? `; excluded infra failures: ${result.failReasons.join(" | ")}` : ""
            }; see ${result.dir}`
          : `only ${completed}/${result.totalTrials} trials completed — no quorum to grade: ${result.failReasons.join(" | ")}; see ${result.dir}`,
    };
  },

  // Rubric grader (model-based): the LLM judge scores each completed trial
  // against the assertions. Default gate: every assertion must be met in a
  // strict majority of scored trials — a mean score would let one
  // systematically failing assertion hide behind the others — and a strict
  // majority of attempted trials must have produced a score at all (quorum).
  // Trials lost to infra or an unparseable judge are excluded, not counted
  // against the skill. options.threshold opts back into the mean-score gate for
  // genuinely fuzzy tasks.
  async toPassRubric(received: unknown, assertions: string[], options?: RubricOptions) {
    const result = asResult(received, "toPassRubric");
    const capability = options?.capability === true;

    // Fast mode: when the task's code-based graders have already failed, the
    // task fails regardless of the judge — skip the spend (DAG-style gating:
    // cheap deterministic graders first, the LLM only for survivors).
    if (evalConfig.fast && result.softFailures() > 0) {
      record(result.summaryFile, {
        type: "rubric",
        skill: result.skill,
        task: result.taskName,
        cost: 0,
        avgPct: 0,
        scored: 0,
        passedTrials: 0,
        total: result.totalTrials,
        passed: false,
        capability,
        skipped: true,
        assertions: [],
      });
      await result.annotate("AFK_EVAL_FAST: code-based graders already failed — rubric skipped", "warning");
      return {
        pass: false,
        message: () => `rubric skipped (AFK_EVAL_FAST=1) because the code-based graders already failed; see ${result.dir}`,
      };
    }

    const judged = await Promise.all(
      result.trials.map((trial) => judgeRubric(buildTranscript(trial), assertions, result.dir, trial.suffix, result.signal)),
    );

    let cost = 0;
    let scored = 0;
    // Trials that met every assertion — the pass@k / pass^k input.
    let passedTrials = 0;
    const scores: number[] = [];
    const metCounts = assertions.map(() => 0);
    const unknownCounts = assertions.map(() => 0);

    for (const [index, graded] of judged.entries()) {
      const trial = result.trials[index]!;
      cost += graded.cost;
      if (graded.result) {
        scored += 1;
        scores.push(graded.result.score);
        if (graded.result.verdicts.every((verdict) => verdict === "met")) passedTrials += 1;
        for (const [assertionIndex, verdict] of graded.result.verdicts.entries()) {
          if (verdict === "met") metCounts[assertionIndex]! += 1;
          if (verdict === "unknown") unknownCounts[assertionIndex]! += 1;
        }
        await result.annotate(
          `trial${trial.suffix ? ` ${trial.suffix.replace(".trial", "")}` : ""} judge: ${Math.round(graded.result.score * 100)}% (${graded.result.verdicts.filter((verdict) => verdict === "met").length}/${assertions.length})`,
        );
      } else {
        await result.annotate(`judge: unparseable (see ${join(result.dir, `judge${trial.suffix}.json`)})`, "warning");
      }
    }

    const average = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const pct = Math.round(average * 100);
    // The per-assertion table: an assertion passes when met in a strict
    // majority of scored trials.
    const failing = assertions.filter((_, index) => !(metCounts[index]! * 2 > scored));
    const assertionTable: AssertionRow[] = assertions.map((text, index) => ({
      text,
      met: metCounts[index]!,
      unknown: unknownCounts[index]!,
      of: scored,
    }));

    // Quorum: a strict majority of attempted trials must have been scored
    // (completed and judged parseably) for the verdict to mean anything.
    const hasQuorum = scored * 2 > result.totalTrials;
    let verdict: boolean;
    if (!hasQuorum) {
      verdict = false;
    } else if (options?.threshold !== undefined) {
      verdict = pct >= options.threshold;
    } else {
      verdict = failing.length === 0;
    }

    record(result.summaryFile, {
      type: "rubric",
      skill: result.skill,
      task: result.taskName,
      cost,
      avgPct: pct,
      scored,
      passedTrials,
      total: result.totalTrials,
      infra: result.totalTrials - result.trials.length,
      passed: verdict,
      capability,
      assertions: assertionTable,
    });

    if (capability) {
      await result.annotate(`capability task (not gating): rubric ${pct}% avg over ${scored} trial(s)`, verdict ? "notice" : "warning");
      return { pass: true, message: () => "capability task (capability: true) never fails the suite" };
    }
    if (!hasQuorum) {
      return {
        pass: false,
        message: () =>
          `only ${scored}/${result.totalTrials} trials scored — no quorum to grade${
            result.failReasons.length > 0 ? ` (infra: ${result.failReasons.join(" | ")})` : " (judge output unparseable)"
          }; see ${result.dir}`,
      };
    }
    await result.annotate(`rubric: ${pct}% avg over ${scored} trial(s)`);
    const failedTable = assertionTable
      .filter((row) => !(row.met * 2 > scored))
      .map((row) => `  ${row.met}/${row.of} met${row.unknown > 0 ? ` (${row.unknown} unknown)` : ""} — ${row.text}`)
      .join("\n");
    return {
      pass: verdict,
      message: () =>
        options?.threshold !== undefined
          ? `rubric score ${pct}% below threshold ${options.threshold}%; see ${join(result.dir, "judge*.json")}`
          : `${failing.length} assertion(s) missed the strict-majority gate:\n${failedTable}\nsee ${join(result.dir, "judge*.json")}`,
      actual: `${pct}%`,
      expected: options?.threshold !== undefined ? `>= ${options.threshold}%` : "every assertion met in a strict majority of trials",
    };
  },
});
