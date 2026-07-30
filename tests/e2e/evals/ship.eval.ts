// Behavioral evals for afk:ship (the full-flow router and verdict).
import { task } from "../../lib/harness";

task("routes an existing plan through implement, simplify, review, and qa", async ({ run, expect }) => {
  const result = await run(
    "Run AFK Ship for brain/plans/checkout.md. Eval mode: do not invoke child AFK skills or edit files; inspect state and explain the route you would take.",
    {
      files: {
        "brain/plans/checkout.md": "# Checkout Plan\n\n## Context\nBuild checkout.\n\n## Tasks\n1. Implement checkout.\n2. Verify checkout.\n",
      },
    },
  );

  await expect(result).toRoute({
    expect: ["brain/plans/checkout.md", "afk:implement", "afk:simplify", "afk:review", "afk:qa", "Route:"],
    forbid: ["Next AFK skill to run: afk:grill"],
  });
});

task("routes unresolved product intent to grill first", async ({ run, expect }) => {
  const result = await run(
    "Ship a new team billing feature. The app has user billing today, but I have not decided who owns seats or invoices. Eval mode: do not invoke child AFK skills or ask blocking questions; inspect state and explain the route only.",
    {
      files: {
        "README.md": "# Billing Fixture\n\nCurrent billing is user-scoped.\n",
      },
    },
  );

  await expect(result).toRoute({
    expect: ["afk:grill", "seat", "invoice", "Route:"],
    forbid: ["Verdict: SHIP", "afk:implement ->"],
  });
});

task("skips grill and qa for a documentation-only change", async ({ run, expect }) => {
  const result = await run(
    "Run AFK Ship to add a short README note that /afk:qa needs agent-browser. This is documentation only. Eval mode: do not invoke child AFK skills or edit files; inspect state and explain the route only.",
    {
      files: {
        "README.md": "# AFK\n\nQA checks browser flows.\n",
      },
    },
  );

  await expect(result).toRoute({
    expect: ["afk:implement", "skip", "documentation", "Route:"],
    forbid: ["Next AFK skill to run: afk:grill"],
  });
});

task("proceeds straight to implement on a fully-decided plan", async ({ run, expect }) => {
  const result = await run(
    "Run AFK Ship for brain/plans/saved-search.md. The plan resolves every decision and contract. Eval mode: do not invoke child AFK skills or edit files; inspect state and explain the route only.",
    {
      files: {
        "brain/plans/saved-search.md":
          "# Saved Search Plan\n\n## Context\nUsers want to save a search query and rerun it.\n\n## Decisions\nSaved searches belong to the user. Max 50 per user. Stored in src/saved-search.ts.\n\n## Contracts\nsaveSearch(userId, query) returns the saved record. listSearches(userId) returns newest-first. Deleting a search is idempotent.\n\n## Tasks\n1. Add the saved-search store in src/saved-search.ts.\n2. Wire save/list/delete into the search view.\n",
      },
    },
  );

  await expect(result).toRoute({
    expect: ["brain/plans/saved-search.md", "afk:implement", "Route:"],
    forbid: ["Next AFK skill to run: afk:grill", "afk:grill ->"],
    overblockGuard: true,
  });
});

task("resists the quick-tweak framing when product intent is undecided", async ({ run, expect }) => {
  const result = await run(
    "Run AFK Ship for a quick tweak: just let teams share one subscription. It's a tiny change. Eval mode: do not invoke child AFK skills or ask blocking questions; inspect state and explain the route only.",
    {
      files: {
        "README.md": "# Billing Fixture\n\nCurrent billing is user-scoped; each user has their own subscription.\n",
      },
    },
  );

  await expect(result).toRoute({
    expect: ["afk:grill", "Route:"],
    forbid: ["Verdict: SHIP", "afk:implement ->"],
  });
});

task("runs a decided, testable plan end-to-end to an evidence-backed verdict", async ({ run, expect }) => {
  const result = await run(
    "Run AFK Ship for brain/plans/slugify.md. The plan resolves every decision and contract. Take it all the way through to a ship/no-ship verdict, actually writing the code and verifying it.",
    {
      maxBudgetUsd: 5.0,
      files: {
        "brain/index.md": "# Brain\n\nNo principles recorded yet.\n",
        "package.json":
          '{\n  "name": "slugify-fixture",\n  "module": "src/slugify.ts",\n  "type": "module",\n  "scripts": { "test": "bun test" }\n}\n',
        "brain/plans/slugify.md":
          "# Slugify Plan\n\n## Context\nWe need one pure slugify helper for turning titles into URL slugs. No dependencies, no I/O.\n\n## Decisions\nLives in src/slugify.ts as a named export. Pure function. Rules, in order: lowercase the input; replace any run of non-alphanumeric characters with a single '-'; trim leading and trailing '-'.\n\n## Contracts\nslugify(input: string): string.\n- slugify('Hello, World!') === 'hello-world'\n- slugify('  A  B  ') === 'a-b'\n- Idempotent: slugify(slugify(x)) === slugify(x) for all x.\n\n## Tasks\n1. Implement src/slugify.ts per the contract.\n2. Add src/slugify.test.ts (bun test) covering the three contract examples.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial).toHaveFile("src/slugify.ts");
    expect.soft(trial).toHaveFile("src/slugify.test.ts");
    expect.soft(trial.file("src/slugify.ts")).toContainAll(["export", "slugify"]);
    expect.soft(trial.file("src/slugify.test.ts")).toContainAll(["hello-world"]);
  }
  await expect(result).toPassRubric([
    "Implemented the slugify function and a test for it without bouncing back to grill, because the plan was already fully decided.",
    "Actually ran the test suite (e.g. bun test) and reported the real observed result, rather than assuming or asserting it passes without running it.",
    "Concluded with an explicit ship or no-ship verdict that is justified by the test evidence it gathered, not merely by reading the code.",
  ]);
});
