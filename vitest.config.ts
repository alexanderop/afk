import { defineConfig } from "vitest/config";

// The suite reads markdown/JSON from the repo instead of importing it, so watch
// mode needs explicit triggers — without these, editing a SKILL.md would never
// rerun the lint.
const watchTriggers = [
  "skills/**",
  "agents/**",
  "hooks/**",
  ".claude-plugin/**",
  "docs/**/*.md",
  "README.md",
];

// Model-backed suites spend real money, so these projects only exist when
// explicitly requested — a bare `vitest run` can never trigger LLM calls. Each
// one owns an include glob and one package script runs it, so every file under
// tests/e2e/ lands in exactly one paid command (enforced in
// tests/integration/eval-files.test.ts).
export const e2eProjects = [
  { name: "smoke", include: ["tests/e2e/plugin-load.test.ts"] },
  { name: "evals", include: ["tests/e2e/evals/*.eval.ts", "tests/e2e/judge-selfcheck.test.ts"] },
  { name: "triggers", include: ["tests/e2e/triggers/**/*.test.ts"] },
];

export default defineConfig({
  test: {
    projects: [
      ...["unit", "integration"].map((name) => ({
        test: {
          name,
          include: [`tests/${name}/**/*.test.ts`],
          testTimeout: 10_000,
          forceRerunTriggers: watchTriggers,
          // These run on every edit and do nothing but read files; worker
          // threads start ~200ms faster than the default forked processes.
          pool: "threads" as const,
        },
      })),
      ...(process.env.AFK_E2E
        ? e2eProjects.map(({ name, include }) => ({
            test: {
              name,
              include,
              globalSetup: "./tests/e2e/setup.ts",
              // One rubric-graded task = up to 3 trials x (skill run + judge run).
              testTimeout: 1_800_000,
              hookTimeout: 120_000,
              // Trial-majority voting handles flakiness; retry would skew it.
              retry: 0,
              // Tests run concurrently within one worker; live claude processes
              // are bounded by the AFK_EVAL_CONCURRENCY semaphore in
              // tests/lib/trials.ts, which is the single authority — trials
              // within a task spawn in parallel, so a vitest-level test cap
              // would not bound them.
              sequence: { concurrent: true },
              maxWorkers: 1,
            },
          }))
        : []),
    ],
  },
});
