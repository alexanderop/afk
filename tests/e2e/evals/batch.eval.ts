// Behavioral evals for afk:batch (parallel fan-out, one PR per unit).
import { task } from "../../lib/harness";

const extractValidatorsPlan =
  "# Extract Validators Plan\n\n## Context\nEach module in src/ hand-rolls input validation inline, duplicated logic.\n\n## Decisions\nExtract a validator per module into its own file with shared shape checks, error formatting, and tests.\n\n## Contracts\nEach validate<Name>(input) returns {ok, errors}. No two modules share a file.\n\n## Tasks\n1. Extract and test validateOrder in src/order-validator.ts.\n2. Extract and test validateUser in src/user-validator.ts.\n3. Extract and test validateInvoice in src/invoice-validator.ts.\n";

const sourceModules = {
  "src/order.ts": "export function placeOrder() { return true; }\n",
  "src/user.ts": "export function createUser() { return true; }\n",
  "src/invoice.ts": "export function makeInvoice() { return true; }\n",
};

task("fans independent units out in parallel, one PR each", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/extract-validators.md by fanning it out. Eval mode: do not edit files, spawn workers, or open PRs; inspect the plan and explain how AFK Batch schedules the units and what each produces.",
    {
      files: { "brain/plans/extract-validators.md": extractValidatorsPlan, ...sourceModules },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("brain/plans/extract-validators.md");
    expect.soft(trial).toLeaveUnchanged("src/order.ts");
    expect.soft(trial).toLeaveUnchanged("src/user.ts");
    expect.soft(trial).toLeaveUnchanged("src/invoice.ts");
  }
  await expect(result).toRoute({
    expect: ["parallel", "PR"],
  });
});

task("runs workers as synchronous worktree subagents so verification cannot silently skip", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/extract-validators.md by fanning it out. Eval mode: do not edit files, spawn workers, or open PRs; inspect the plan and explain how each worker is spawned and what guarantees its test command, e2e check, and `gh pr create` actually run rather than being silently skipped.",
    {
      files: { "brain/plans/extract-validators.md": extractValidatorsPlan, ...sourceModules },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("brain/plans/extract-validators.md");
    expect.soft(trial).toLeaveUnchanged("src/order.ts");
    expect.soft(trial).toLeaveUnchanged("src/user.ts");
    expect.soft(trial).toLeaveUnchanged("src/invoice.ts");
  }
  await expect(result).toPassRubric([
    "Spawns each unit's worker as a synchronous worktree subagent",
    "Does not run workers in fire-and-forget background mode",
    "Explains that synchronous execution is what guarantees the test command, e2e check, and gh pr create actually run instead of being silently skipped",
  ]);
});

task("runs simplify before the PR when the per-unit change is substantial", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/extract-validators.md by fanning it out. Eval mode: do not edit files, spawn workers, or open PRs; inspect the plan and explain the per-unit worker loop — specifically what each worker does between finishing the change and opening its PR, and why.",
    {
      files: {
        "brain/plans/extract-validators.md":
          "# Extract Validators Plan\n\n## Context\nEach module in src/ hand-rolls input validation inline, ~40 lines each, duplicated logic.\n\n## Decisions\nExtract a validator per module into its own file with shared shape checks, error formatting, and tests.\n\n## Contracts\nEach validate<Name>(input) returns {ok, errors}. No two modules share a file.\n\n## Tasks\n1. Extract and test validateOrder in src/order-validator.ts (rewrite ~50 lines from src/order.ts).\n2. Extract and test validateUser in src/user-validator.ts (rewrite ~45 lines from src/user.ts).\n3. Extract and test validateInvoice in src/invoice-validator.ts (rewrite ~55 lines from src/invoice.ts).\n",
        ...sourceModules,
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("brain/plans/extract-validators.md");
    expect.soft(trial).toLeaveUnchanged("src/order.ts");
    expect.soft(trial).toLeaveUnchanged("src/user.ts");
    expect.soft(trial).toLeaveUnchanged("src/invoice.ts");
  }
  await expect(result).toRoute({
    expect: ["afk:simplify", "before", "PR"],
  });
});

task("skips simplify for trivial one-line units", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/bump-copyright.md by fanning it out. Eval mode: do not edit files, spawn workers, or open PRs; inspect the plan and explain the per-unit worker loop — specifically whether each worker should run afk:simplify before opening its PR, and why or why not.",
    {
      files: {
        "brain/plans/bump-copyright.md":
          "# Bump Copyright Year Plan\n\n## Context\nThe copyright year is hardcoded as 2024 in the footer of each package's LICENSE header.\n\n## Decisions\nChange the single year line from 2024 to 2025 in each file. One line per file, no logic.\n\n## Contracts\nEach file changes exactly one line. No two files share a file.\n\n## Tasks\n1. Bump the year in pkg-a/LICENSE.\n2. Bump the year in pkg-b/LICENSE.\n3. Bump the year in pkg-c/LICENSE.\n",
        "pkg-a/LICENSE": "Copyright 2024 Acme\n",
        "pkg-b/LICENSE": "Copyright 2024 Acme\n",
        "pkg-c/LICENSE": "Copyright 2024 Acme\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("brain/plans/bump-copyright.md");
    expect.soft(trial).toLeaveUnchanged("pkg-a/LICENSE");
    expect.soft(trial).toLeaveUnchanged("pkg-b/LICENSE");
    expect.soft(trial).toLeaveUnchanged("pkg-c/LICENSE");
  }
  await expect(result).toRoute({
    expect: ["afk:simplify", "skip", "one-line"],
  });
});

task("re-scopes a horizontal tests-then-implement split into vertical units", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/extract-validators-horizontal.md by fanning it out. Eval mode: do not edit files, spawn workers, or open PRs; inspect the plan's two units and explain how AFK Batch should decompose this work into units and why.",
    {
      files: {
        "brain/plans/extract-validators-horizontal.md":
          "# Extract Validators Plan\n\n## Context\nEach module in src/ hand-rolls input validation inline, duplicated logic.\n\n## Decisions\nExtract a validator per module into its own file with shared shape checks and tests.\n\n## Contracts\nEach validate<Name>(input) returns {ok, errors}.\n\n## Tasks\n1. Write the full test suite for all three validators in tests/validators.test.ts.\n2. Implement validateOrder (src/order-validator.ts), validateUser (src/user-validator.ts), and validateInvoice (src/invoice-validator.ts) so the tests pass.\n",
        ...sourceModules,
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["vertical"]);
    expect.soft(trial).toLeaveUnchanged("brain/plans/extract-validators-horizontal.md");
    expect.soft(trial).toLeaveUnchanged("src/order.ts");
    expect.soft(trial).toLeaveUnchanged("src/user.ts");
    expect.soft(trial).toLeaveUnchanged("src/invoice.ts");
  }
  await expect(result).toPassRubric([
    "Recognizes the plan's two units are a horizontal split — a tests-only unit and a separate implementation-only unit — not vertical slices",
    "Declines to fan the tests-only and implementation-only units out as separate parallel PRs",
    "Re-scopes the work into vertical units where each unit is one validator with its implementation and its own test together",
    "Notes that being independently mergeable does not make a tests-only or implementation-only unit an acceptable batch unit",
  ]);
});
