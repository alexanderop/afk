// Behavioral evals for afk:implement (orchestrated TDD flow). Routing tasks
// verify the direct-vs-orchestrate decision; rubric-graded tasks verify
// worker-brief shape, slicing, and sequencing. See tests/lib/harness.ts.
import { task } from "../../lib/harness";

task("routes a tiny documentation edit to direct implementation", async ({ run, expect }) => {
  const result = await run(
    "Add one sentence to README.md saying QA needs agent-browser. Eval mode: do not edit files; inspect state and explain whether AFK Implement should do this directly or use the orchestrator.",
    {
      files: {
        "README.md": "# Fixture\n\nQA checks browser flows.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("README.md");
    expect.soft(trial.output).toContainAll(["README.md"]);
  }
  await expect(result).toPassRubric([
    "Classifies the one-sentence README edit as small enough for direct implementation",
    "Does not route the edit through implement-orchestrator or plan implementation-worker dispatch",
    "Names README.md as the file to change",
  ]);
});

task("routes a one-file fix that needs a test through the orchestrator", async ({ run, expect }) => {
  const result = await run(
    "Fix the off-by-one bug in src/pagination.ts so the last page is included, and add a regression test for it. Eval mode: do not edit files or invoke subagents; inspect state and explain the AFK Implement route.",
    {
      files: {
        "src/pagination.ts": "export function pageCount(total: number, perPage: number): number {\n  return Math.floor(total / perPage);\n}\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("src/pagination.ts");
  }
  await expect(result).toRoute({
    expect: ["src/pagination.ts", "implement-orchestrator", "implementation-worker", "test"],
  });
});

task("routes a multi-file plan through the orchestrator with worker briefs", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/team-billing.md. Eval mode: do not edit files or invoke subagents; inspect the plan and explain the AFK Implement route and worker brief shape.",
    {
      files: {
        "brain/plans/team-billing.md":
          "# Team Billing Plan\n\n## Context\nCurrent billing is user-scoped.\n\n## Decisions\nTeam billing belongs to workspaces. Workspace owners manage seats.\n\n## Contracts\nSubscription owner is workspace_id. Seat count comes from active memberships. Invoices include workspace name.\n\n## Tasks\n1. Add workspace subscription ownership.\n2. Add seat-count tests.\n3. Update invoice rendering.\n",
        "src/billing.md": "# Billing\n\nCurrent billing is user-scoped.\n",
        "src/invoices.md": "# Invoices\n\nInvoices currently display user email.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["brain/plans/team-billing.md", "orchestrate", "implement-orchestrator", "implementation-worker", "TDD", "verification"]);
    expect.soft(trial).toLeaveUnchanged("brain/plans/team-billing.md");
    expect.soft(trial).toLeaveUnchanged("src/billing.md");
    expect.soft(trial).toLeaveUnchanged("src/invoices.md");
  }
  await expect(result).toPassRubric([
    "Reads the supplied brain/plans/team-billing.md plan",
    "Classifies the work as needing orchestration",
    "Routes through implement-orchestrator",
    "Names implementation-worker for bounded TDD slices",
    "Describes exact files, contracts, tests, and verification in worker briefs",
  ]);
});

task("hands the plan straight to the orchestrator without lead research", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/inbox-search.md. Eval mode: do not edit files or invoke subagents; inspect the plan and explain how AFK Implement routes it. Be specific about what the lead (main conversation) does before the orchestrator is involved, and about who reads the source files and decides the architecture and contracts.",
    {
      files: {
        "brain/plans/inbox-search.md":
          "# Inbox Search Plan\n\n## Context\nThe inbox in src/inbox.ts lists messages but has no search.\n\n## Decisions\nAdd full-text search over message subject and body, ranked by recency.\n\n## Contracts\nsearchInbox(query) returns matching messages newest-first. Empty query returns the full list. Indexing lives in src/search.ts.\n\n## Tasks\n1. Add a search index module in src/search.ts.\n2. Wire searchInbox into src/inbox.ts.\n3. Render the search box in src/inbox-view.ts.\n",
        "src/inbox.ts": "export function listInbox() {\n  return [];\n}\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["brain/plans/inbox-search.md", "implement-orchestrator"]);
    expect.soft(trial).toLeaveUnchanged("brain/plans/inbox-search.md");
    expect.soft(trial).toLeaveUnchanged("src/inbox.ts");
  }
  await expect(result).toPassRubric([
    "Passes the plan directly to implement-orchestrator without doing its own research or context-gathering first",
    "Assigns reading the source files and deciding the architecture and contracts to the orchestrator, not the lead",
    "States the lead does not implement or research the touched modules itself before delegating",
    "Limits the lead's role to handing over the plan and final acceptance after workers edit",
  ]);
});

task("describes the orchestrator as read-only with verification in the lead", async ({ run, expect }) => {
  const result = await run(
    "For a complex auth refactor, explain what the AFK implement orchestrator is allowed to do. Eval mode: do not invoke subagents or edit files.",
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["implement-orchestrator", "read-only", "edit files", "diff", "verification"]);
    expect.soft(trial.output).toContainNone(["orchestrator can edit", "orchestrator runs the final test suite"]);
  }
  await expect(result).toPassRubric([
    "Names implement-orchestrator",
    "States that the orchestrator is read-only",
    "States that it cannot edit files",
    "States that final diff review and verification happen after workers edit",
  ]);
});

task("stops parallel dispatch when tasks share the same file", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/settings-refactor.md. Eval mode: do not edit files or invoke subagents; inspect the plan and explain whether workers can run in parallel.",
    {
      files: {
        "brain/plans/settings-refactor.md":
          "# Settings Refactor Plan\n\n## Context\nSettings are configured in src/settings.ts.\n\n## Decisions\nSplit defaults, validation, and environment loading.\n\n## Contracts\nAll changes must preserve getSettings().\n\n## Tasks\n1. Update src/settings.ts default loading.\n2. Update src/settings.ts validation errors.\n3. Update src/settings.ts environment parsing.\n",
        "src/settings.ts": "export function getSettings() {\n  return { mode: 'dev' };\n}\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("brain/plans/settings-refactor.md");
    expect.soft(trial).toLeaveUnchanged("src/settings.ts");
    expect.soft(trial.output).toContainAll(["src/settings.ts"]);
  }
  await expect(result).toPassRubric([
    "Detects that all three tasks edit the same file, src/settings.ts",
    "Does not schedule the three tasks as parallel workers",
    "Schedules the shared-file tasks sequentially or folds them into a single worker slice",
  ]);
});

task("schedules disjoint adapter slices in one parallel wave", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/notifications.md. Eval mode: do not edit files or invoke subagents; inspect the plan and explain how AFK Implement would schedule the worker slices — what runs in parallel and what runs after, and why.",
    {
      files: {
        "brain/plans/notifications.md":
          "# Notifications Plan\n\n## Context\nAdd a notifications feature that fans a message out to email, sms, and push.\n\n## Decisions\nA shared Notifier interface; three independent channel adapters; a dispatcher that calls all three.\n\n## Contracts\nEvery adapter exports send(message): Promise<Result> matching Notifier. The dispatcher imports all three and aggregates results.\n\n## Tasks\n\n- **Wave 1:**\n  - Notifier interface · owns `src/notify/types.ts` · depends: none\n- **Wave 2 — parallel:**\n  - email adapter · owns `src/notify/email.ts` · depends: Notifier interface\n  - sms adapter · owns `src/notify/sms.ts` · depends: Notifier interface\n  - push adapter · owns `src/notify/push.ts` · depends: Notifier interface\n- **Wave 3:**\n  - dispatcher · owns `src/notify/dispatcher.ts` · depends: all three adapters\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["implement-orchestrator", "parallel", "src/notify"]);
    expect.soft(trial).toLeaveUnchanged("brain/plans/notifications.md");
  }
  await expect(result).toPassRubric([
    "Routes the work through implement-orchestrator with implementation-worker slices",
    "Schedules the email, sms, and push adapter slices to run in parallel because they own disjoint files and share no contract",
    "Builds the shared Notifier interface before the adapters",
    "Runs the dispatcher slice after the adapters because it depends on all three",
    "Does not propose running every slice sequentially one at a time",
  ]);
});

task("blocks implementation when product intent is undecided", async ({ run, expect }) => {
  const result = await run(
    "Implement team billing. We have not decided whether seats belong to workspaces or organizations, and invoices might be per team or per owner. Eval mode: do not edit files or ask blocking questions; inspect state and explain the AFK Implement decision.",
    {
      files: {
        "README.md": "# Billing Fixture\n\nCurrent billing is user-scoped.\n",
        "src/billing.md": "# Billing\n\nNo team billing contracts exist yet.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("README.md");
    expect.soft(trial).toLeaveUnchanged("src/billing.md");
    expect.soft(trial.output).toContainAll(["seat", "invoice"]);
  }
  await expect(result).toPassRubric([
    "Identifies the unresolved product decisions: seat ownership (workspaces vs organizations) and invoice ownership (per team vs per owner)",
    "Stops before dispatching implementation-worker subagents",
    "Routes the open decisions back to planning (afk:grill) or states they must be resolved first",
    "Does not guess the missing decisions and proceed to implement",
  ]);
});

task("proceeds on a fully-decided plan without bouncing to planning", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/team-billing-decided.md. Every ownership and invoice decision is resolved in the plan. Eval mode: do not edit files or invoke subagents; inspect the plan and explain the AFK Implement route.",
    {
      files: {
        "brain/plans/team-billing-decided.md":
          "# Team Billing Plan\n\n## Context\nCurrent billing is user-scoped.\n\n## Decisions\nTeam billing belongs to workspaces. Workspace owners manage seats. Invoices are per workspace and include the workspace name.\n\n## Contracts\nSubscription owner is workspace_id in src/billing.ts. Seat count comes from active memberships. Invoice rendering in src/invoices.ts includes workspace name.\n\n## Tasks\n1. Add workspace subscription ownership in src/billing.ts.\n2. Add seat-count tests.\n3. Update invoice rendering in src/invoices.ts.\n",
        "src/billing.ts": "export function ownerOf() {\n  return null;\n}\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("brain/plans/team-billing-decided.md");
    expect.soft(trial).toLeaveUnchanged("src/billing.ts");
  }
  await expect(result).toRoute({
    expect: ["implement-orchestrator", "implementation-worker"],
    overblockGuard: true,
  });
});

task("blocks a destructive migration with no safety policy", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/delete-legacy-users.md. It drops legacy user records after migrating accounts. Eval mode: do not edit files or invoke subagents; inspect the plan and explain the AFK Implement decision.",
    {
      files: {
        "brain/plans/delete-legacy-users.md":
          "# Delete Legacy Users Plan\n\n## Context\nLegacy user records may duplicate account owners.\n\n## Decisions\nDelete legacy users after migration.\n\n## Contracts\nTODO: retention, rollback, backup, and dry-run policy.\n\n## Tasks\n1. Add migration.\n2. Drop legacy users.\n",
        "db/schema.sql": "create table users (id text primary key);\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("brain/plans/delete-legacy-users.md");
    expect.soft(trial).toLeaveUnchanged("db/schema.sql");
  }
  await expect(result).toPassRubric([
    "Recognizes the plan performs a destructive, hard-to-reverse data operation (dropping legacy user records)",
    "Identifies the missing safety policy (backup, rollback, retention, dry-run) as the blocker",
    "Stops before dispatching implementation-worker subagents",
    "Does not proceed to implement the migration with the safety policy still marked TODO",
  ]);
});

task("allows a destructive migration with an explicit safety policy", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/migrate-legacy-users.md. The plan migrates legacy user records and specifies the full safety policy. Eval mode: do not edit files or invoke subagents; inspect the plan and explain the AFK Implement route.",
    {
      files: {
        "brain/plans/migrate-legacy-users.md":
          "# Migrate Legacy Users Plan\n\n## Context\nLegacy user records duplicate account owners.\n\n## Decisions\nMigrate legacy users to accounts, then archive the legacy rows.\n\n## Contracts\nTake a full backup before migrating. Run a dry-run that reports affected rows first. Keep legacy rows for a 90-day retention window before archival. Rollback restores from the pre-migration backup. All steps are reversible within the retention window.\n\n## Tasks\n1. Add the dry-run reporter in src/migrate.ts.\n2. Add the backup-and-migrate step.\n3. Schedule archival after the retention window.\n",
        "db/schema.sql": "create table users (id text primary key);\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toLeaveUnchanged("brain/plans/migrate-legacy-users.md");
    expect.soft(trial).toLeaveUnchanged("db/schema.sql");
  }
  await expect(result).toRoute({
    expect: ["implement-orchestrator", "implementation-worker"],
    overblockGuard: true,
  });
});

task("stops when the referenced plan file does not exist", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/saved-export.md. Eval mode: do not edit files or invoke subagents; inspect state and explain the AFK Implement route.",
    {
      files: {
        "README.md": "# Fixture\n\nA small app. There is no brain/plans directory yet.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["brain/plans/saved-export.md"]);
    expect.soft(trial).toLeaveUnchanged("README.md");
  }
  await expect(result).toPassRubric([
    "Detects that brain/plans/saved-export.md does not exist in the project",
    "Does not fabricate the plan's contents, decisions, or tasks",
    "Stops to ask for the plan or for the missing intent instead of proceeding",
    "Does not dispatch implementation-worker against a guessed plan",
  ]);
});

task("carries the constraining brain principle into each worker brief", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/add-invoice-totals.md. Eval mode: do not edit files or invoke subagents; inspect the plan and the brain/ vault, then explain the AFK Implement route and exactly what each implementation-worker brief includes.",
    {
      files: {
        "brain/index.md":
          "# Brain\n\n## Principles\n- [[principles]] — Project engineering and design principles.\n- [[principles/money-is-integer-cents]] — All monetary amounts are integer cents, never floats.\n",
        "brain/principles.md": "# Principles\n\nProject engineering and design principles.\n\n- [[principles/money-is-integer-cents]]\n",
        "brain/principles/money-is-integer-cents.md":
          "# Money Is Integer Cents\n\nAll monetary amounts are stored and computed as integer cents, never floats.\n\n- Functions take and return cents (1099), never dollars (10.99).\n- Rounding happens only at display time.\n",
        "brain/plans/add-invoice-totals.md":
          "# Invoice Totals Plan\n\n## Context\nInvoices in src/invoices.ts list line items but show no total.\n\n## Decisions\nAdd a total computed from line items, plus a tax helper.\n\n## Contracts\ninvoiceTotal(items) sums line item amounts in src/invoices.ts. taxFor(amount) computes tax in src/tax.ts.\n\n## Tasks\n1. Add invoiceTotal in src/invoices.ts.\n2. Add taxFor in src/tax.ts.\n",
        "src/invoices.ts": "export type LineItem = { label: string; amount: number };\n\nexport function lineItems(): LineItem[] {\n  return [];\n}\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["implement-orchestrator", "implementation-worker", "cents", "brain"]);
    expect.soft(trial).toLeaveUnchanged("brain/plans/add-invoice-totals.md");
    expect.soft(trial).toLeaveUnchanged("src/invoices.ts");
    expect.soft(trial).toLeaveUnchanged("brain/principles/money-is-integer-cents.md");
  }
  await expect(result).toPassRubric([
    "Reads the brain principles before deciding contracts",
    "Routes the work through implement-orchestrator with implementation-worker slices",
    "Identifies money-is-integer-cents as a principle that constrains these slices",
    "States the constraining principle is carried into each implementation-worker brief as frozen text",
    "Explains that workers start with zero context, so they receive the principle in the brief rather than reading the brain themselves",
  ]);
});

task("re-slices a tests-then-implement plan into vertical slices", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/csv-parser.md. Eval mode: do not edit files or invoke subagents; inspect the plan and explain how AFK Implement turns it into implementation-worker slices — specifically, for each worker, whether it writes the test, the implementation, or both, and how a single worker's red-green-refactor loop runs.",
    {
      files: {
        "brain/plans/csv-parser.md":
          "# CSV Parser Plan\n\n## Context\nWe need a small CSV parser in src/csv.ts.\n\n## Decisions\nParse rows and files; support quoted fields containing commas.\n\n## Contracts\nparseRow(line) returns an array of fields. parseFile(text) returns an array of rows. Quoted fields preserve embedded commas. All live in src/csv.ts.\n\n## Tasks\n1. Write the full test suite for parseRow, parseFile, and quoted fields.\n2. Implement parseRow, parseFile, and quoted-field handling to pass the suite.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["implement-orchestrator", "implementation-worker", "vertical"]);
    expect.soft(trial).toLeaveUnchanged("brain/plans/csv-parser.md");
  }
  await expect(result).toPassRubric([
    "Routes the work through implement-orchestrator with implementation-worker slices",
    "Each worker slice pairs one behavior's failing test with its implementation (a vertical slice), rather than one worker writing all tests and another writing all implementation",
    "Rejects the plan's split into a tests-only task and a separate implementation-only task (horizontal slicing) and re-slices it vertically by behavior",
    "Each slice runs red-green-refactor within its own boundary",
  ]);
});

task("sets the test-quality bar in the worker brief", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/checkout-charge.md. Eval mode: do not edit files or invoke subagents; inspect the plan and explain exactly what each implementation-worker brief says about HOW to write the slice's test — what the test should assert against, and how to handle the external payment client.",
    {
      files: {
        "brain/plans/checkout-charge.md":
          "# Checkout Charge Plan\n\n## Context\ncheckout() in src/checkout.ts must charge an order total via an external payment client.\n\n## Decisions\nThe payment client is injected. checkout returns a confirmed result on success.\n\n## Contracts\ncheckout(cart, paymentClient) returns { status } and calls paymentClient.charge at the system boundary. paymentClient is the only external dependency.\n\n## Tasks\n1. Add checkout in src/checkout.ts that charges via the injected payment client.\n",
        "src/checkout.ts": "export function checkout() {\n  return { status: 'pending' };\n}\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["implement-orchestrator", "boundary", "interface"]);
    expect.soft(trial).toLeaveUnchanged("brain/plans/checkout-charge.md");
    expect.soft(trial).toLeaveUnchanged("src/checkout.ts");
  }
  await expect(result).toPassRubric([
    "Routes the work through implement-orchestrator with an implementation-worker slice",
    "The worker brief says the test verifies observable behavior through the public interface, not internal structure",
    "The worker brief says to mock only at system boundaries (the external payment client), not internal collaborators",
    "The worker brief or review forbids implementation-coupled tests such as asserting on call counts/order or testing private methods",
  ]);
});

// Execution tier: unlike the explain-the-route cases above, this one lets the
// orchestrator actually dispatch workers and grades the project's end state —
// the only kind of case that catches "explains the route perfectly, then the
// orchestration falls apart in practice".
task("implements the csv-parser plan end to end with passing tests", async ({ run, expect }) => {
  const result = await run("Implement brain/plans/csv-parser.md. Carry it through: write the code and tests, and run the suite.", {
    execution: true,
    trials: 2,
    maxBudgetUsd: 5.0,
    timeoutMs: 600_000,
    files: {
      "package.json": '{\n  "name": "csv-fixture",\n  "type": "module",\n  "scripts": { "test": "bun test" }\n}\n',
      "brain/plans/csv-parser.md":
        "# CSV Parser Plan\n\n## Context\nWe need a small CSV parser in src/csv.ts. Tests run with `bun test`.\n\n## Decisions\nParse rows and files; support quoted fields containing commas. No dependencies.\n\n## Contracts\nparseRow(line) returns an array of fields. parseFile(text) returns an array of rows (split on newlines, ignore a trailing empty line). Quoted fields preserve embedded commas and drop the surrounding quotes. All live in src/csv.ts; tests in src/csv.test.ts.\n- parseRow('a,b,c') deep-equals ['a','b','c']\n- parseRow('a,\"b,c\",d') deep-equals ['a','b,c','d']\n- parseFile('a,b\\nc,d\\n') deep-equals [['a','b'],['c','d']]\n\n## Tasks\n- **Wave 1:** parseRow happy path (test + implementation) · owns src/csv.ts, src/csv.test.ts\n- **Wave 2:** quoted fields (test + implementation) · same files, after Wave 1 is green\n- **Wave 3:** parseFile (test + implementation) · same files, after Wave 2 is green\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial).toHaveFile("src/csv.ts");
    expect.soft(trial).toHaveFile("src/csv.test.ts");
    // Worker dispatch is a Task tool call — deterministic evidence the lead
    // delegated instead of editing everything itself.
    expect.soft(trial).toUseTools({ required: ["Task"] });
    const suite = trial.exec("bun test");
    expect.soft(suite.exitCode, `bun test failed in ${trial.outcomeDir}:\n${suite.output.slice(0, 2000)}`).toBe(0);
  }
  await expect(result).toPassRubric([
    "Had implementation-worker subagents make the edits rather than the lead editing every file directly",
    "Worked in vertical slices: each behavior's test landed with its implementation, not all tests first then all implementation",
    "Ran the test suite and reported the real observed result rather than asserting success without running it",
  ]);
});

task("sequences a tracer-bullet happy path before the edge cases", async ({ run, expect }) => {
  const result = await run(
    "Implement brain/plans/signup-flow.md. Eval mode: do not edit files or invoke subagents; inspect the plan and explain the ORDER in which AFK Implement sequences the worker slices — which slice runs first and why, before the edge cases.",
    {
      files: {
        "brain/plans/signup-flow.md":
          "# Signup Flow Plan\n\n## Context\nAdd user signup spanning src/signup.ts (logic) and src/signup-view.ts (form).\n\n## Decisions\nHappy path: a valid email and password create an account and return a session. Then add validation and duplicate-email handling.\n\n## Contracts\nsignup(email, password) creates an account and returns a session on the happy path. Edge cases: invalid email, weak password, duplicate email.\n\n## Tasks\n1. Implement the signup happy path end-to-end across src/signup.ts and src/signup-view.ts.\n2. Add email and password validation.\n3. Add duplicate-email handling.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["implement-orchestrator", "tracer"]);
    expect.soft(trial).toLeaveUnchanged("brain/plans/signup-flow.md");
  }
  await expect(result).toPassRubric([
    "Routes the work through implement-orchestrator with implementation-worker slices",
    "Sequences a thin end-to-end happy-path slice first as a tracer bullet that proves the whole path works",
    "Schedules validation and duplicate-email edge cases as incremental slices after the tracer bullet is green",
    "Does not start with edge cases or partial non-runnable layers before the end-to-end path exists",
  ]);
});
