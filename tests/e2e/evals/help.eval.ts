// Behavioral evals for afk:help (the flow router).
import { task } from "../../lib/harness";

task("recommends the eval-first path on a fresh project", async ({ run, expect }) => {
  const result = await run("What should I do next?");

  await expect(result).toRoute({
    expect: ["afk:write-evals"],
    forbid: ["Next step: [Q]"],
  });
});

task("recommends grill when no plan artifact exists", async ({ run, expect }) => {
  const result = await run("What should I do next?", {
    files: {
      "brain/index.md": "# Brain\n\nReturning AFK user.\n",
    },
  });

  await expect(result).toRoute({
    expect: ["afk:grill"],
    forbid: ["Next step: [Q]"],
  });
});

task("recommends implement when a plan exists with no diff", async ({ run, expect }) => {
  const result = await run("What now? Assume brain/plans/checkout.md exists and there is no implementation diff.", {
    files: {
      "brain/index.md": "# Brain\n\nReturning AFK user.\n",
      "brain/plans/checkout.md": "# Checkout Plan\n\n## Context\nBuild checkout.\n\n## Tasks\n1. Implement checkout.\n",
    },
  });

  await expect(result).toRoute({
    expect: ["afk:implement"],
    forbid: ["Next step: [Q]"],
  });
});

task("recommends prototype for throwaway layout exploration", async ({ run, expect }) => {
  const result = await run("Which AFK skill should I use to mock up three dashboard layouts?", {
    files: {
      "brain/index.md": "# Brain\n\nReturning AFK user.\n",
    },
  });

  await expect(result).toRoute({
    expect: ["afk:prototype"],
    forbid: ["Next step: [Q]"],
  });
});

task("recommends research for a prior-art scan before planning", async ({ run, expect }) => {
  const result = await run(
    "Which AFK skill should I use to scan the prior art for how other teams do multi-tenant rate limiting before we plan this?",
    {
      files: {
        "brain/index.md": "# Brain\n\nReturning AFK user.\n",
      },
    },
  );

  await expect(result).toRoute({
    expect: ["afk:research"],
    forbid: ["Next step: [Q]"],
  });
});

task("explains a specific skill from the catalog", async ({ run, expect }) => {
  const result = await run("When should I use afk:simplify?");

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["afk:simplify", "diff"]);
  }
  await expect(result).toPassRubric([
    "Answers from the AFK catalog and simplify skill contract",
    "States that simplify runs after implementation or for cleanup requests",
    "Says it focuses on quality cleanup rather than bug hunting",
    "Names the expected output as simplification fixes or a no-change report",
  ]);
});
