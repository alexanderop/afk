// Behavioral evals for afk:grill (plan interview). Each task drives the skill
// in a fresh environment via the run() fixture; see tests/lib/harness.ts.
import { task } from "../../lib/harness";

task("reads repo context before asking the first planning question", async ({ run, expect }) => {
  const result = await run("Grill me on adding team billing to this app.", {
    files: {
      "README.md": "# Billing Fixture\n\nA tiny SaaS app with users and workspaces.\n",
      "src/billing.md": "# Billing\n\nCurrent billing is user-scoped. Team billing does not exist yet.\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["workspace", "user-scoped", "brain/context.md"]);
  }
  await expect(result).toPassRubric([
    "Inspects relevant code, docs, tests, and existing plans before asking",
    "Does not ask the user how the codebase works before reading available files",
    "Asks one question at a time",
    "Includes a recommended answer and rationale with the question",
  ]);
});

task("challenges a glossary conflict instead of silently picking a meaning", async ({ run, expect }) => {
  const result = await run(
    "Grill me on changing account cancellation. Assume brain/context.md defines account as a billing workspace, but the user uses account to mean login identity.",
    {
      files: {
        "brain/context.md":
          "# Context\n\n## Glossary\n\n- Account: a billing workspace that owns subscriptions, invoices, and seats.\n- User: a login identity that can belong to one or more accounts.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["login identity", "billing workspace", "brain/context.md"]);
  }
  await expect(result).toPassRubric([
    "Reads brain/context.md when present",
    "Identifies the term conflict",
    "Does not silently choose one meaning",
    "Asks which definition should be authoritative",
  ]);
});

task("researches the SDK's real docs instead of relying on memory", async ({ run, expect }) => {
  const result = await run("Grill me on adding a chat endpoint that streams responses from an external LLM SDK in this app.", {
    maxBudgetUsd: 2.5,
    files: {
      "README.md": "# App\n\nA TypeScript web app. We want to add a server route that streams chat responses from a third-party LLM SDK.\n",
      "package.json": '{\n  "name": "app",\n  "dependencies": {\n    "some-llm-sdk": "^3.0.0"\n  }\n}\n',
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["doc"]);
  }
  await expect(result).toPassRubric([
    "Attempts to research the SDK's real documentation (via an available docs tool such as a Context7-style MCP server, or by fetching official docs) without the user asking",
    "Does not invent or assert API method names, parameters, or version-specific behavior from memory",
    "Flags API/contract details as needing doc verification when documentation is unavailable, rather than guessing",
    "Treats documentation research as a prerequisite to writing technical contracts",
  ]);
});

task("writes the plan artifact when decisions are resolved", async ({ run, expect }) => {
  const result = await run(
    "We have resolved the decisions. Finish the grill session by writing brain/plans/team-billing.md. Decisions: team billing belongs to workspaces, workspace owners manage seats, existing user billing remains unchanged for personal workspaces, and rollout is behind a feature flag. Contracts: subscription owner is workspace_id, seat count comes from active memberships, and invoices must include workspace name.",
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["afk:implement"]);
    expect.soft(trial).toHaveFile("brain/plans/team-billing.md");
    expect.soft(trial.file("brain/plans/team-billing.md")).toContainAll(["## Context", "## Decisions", "## Contracts", "## Tasks"]);
  }
  await expect(result).toPassRubric([
    "Creates a brain/plans/<slug>.md artifact",
    "Includes Context, Decisions, Contracts, Open Non-Blocking Notes, and Tasks",
    "Includes relevant glossary, ADR, and source URL constraints when they shaped decisions",
    "States that the plan is ready for afk:implement",
  ]);
});

task("writes the plan into an existing brain vault and links the plans index", async ({ run, expect }) => {
  const result = await run(
    "We have resolved the decisions. Finish the grill session by writing the plan as a file named team-billing.md in the correct plans location for this project. Decisions: team billing belongs to workspaces, workspace owners manage seats, existing user billing remains unchanged for personal workspaces, and rollout is behind a feature flag. Contracts: subscription owner is workspace_id, seat count comes from active memberships, and invoices must include workspace name.",
    {
      files: {
        "README.md": "# Billing Fixture\n\nA tiny SaaS app with users and workspaces.\n",
        "brain/index.md": "# Brain\n\n## Principles\n- [[principles]]\n\n## Plans\n- [[plans/index]]\n",
        "brain/principles.md":
          "# Principles\n\nProject engineering and design principles. One topic per file in `principles/`, linked here as `[[principles/<name>]]`.\n",
        "brain/plans/index.md": "# Plans\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["afk:implement", "brain/plans/team-billing.md"]);
    expect.soft(trial).toHaveFile("brain/plans/team-billing.md");
    expect.soft(trial.file("brain/plans/team-billing.md")).toContainAll(["## Context", "## Decisions", "## Contracts", "## Tasks"]);
    expect.soft(trial.file("brain/plans/index.md")).toContainAll(["team-billing"]);
  }
  await expect(result).toPassRubric([
    "Writes the plan under brain/plans/ in the existing vault",
    "Adds a link to the new plan in brain/plans/index.md",
    "Does not modify brain/index.md (the auto-index hook maintains it)",
    "States that the plan is ready for afk:implement",
  ]);
});

task("groups plan tasks into parallel waves with owned files and dependencies", async ({ run, expect }) => {
  const result = await run(
    "We have resolved the decisions. Finish the grill session by writing brain/plans/notifications.md. Decisions: add a notifications feature with a shared Notifier interface in src/notify/types.ts, three independent channel adapters that each implement it (email in src/notify/email.ts, sms in src/notify/sms.ts, push in src/notify/push.ts), and a dispatcher in src/notify/dispatcher.ts that fans a message out to all three adapters. Contracts: every adapter exports send(message): Promise<Result> matching the Notifier interface; the dispatcher imports all three and aggregates their results. The three adapters share no files and no contract with each other; they only depend on the Notifier interface; the dispatcher depends on all three adapters.",
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["afk:implement", "parallel"]);
    expect.soft(trial).toHaveFile("brain/plans/notifications.md");
    expect.soft(trial.file("brain/plans/notifications.md")).toContainAll(["Wave", "parallel", "owns", "depends"]);
  }
  await expect(result).toPassRubric([
    "Creates a brain/plans/<slug>.md artifact with the standard sections",
    "Groups implementation into ordered waves rather than a single flat list",
    "Marks the three channel adapters as independent work that can run in parallel in the same wave",
    "Places the shared Notifier interface before the adapters and the dispatcher in a later wave that depends on them",
    "States, per slice, which files it owns and what it depends on",
  ]);
});

task("slices the plan vertically with a tracer-bullet happy path first", async ({ run, expect }) => {
  const result = await run(
    "We have resolved the decisions. Finish the grill session by writing brain/plans/promo-codes.md. Decisions: add promo-code redemption at checkout in src/checkout/. Behaviors: a valid code applies its percentage discount to the order total; an expired code is rejected with a message; an already-redeemed code is rejected; an unknown code is rejected. Contracts: redeemPromo(code, order) returns {ok, discount, error}; checkout calls it and renders the discounted total or the error. Ship the happy path end to end first, then add the rejection cases.",
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["afk:implement"]);
    expect.soft(trial).toHaveFile("brain/plans/promo-codes.md");
    expect.soft(trial.file("brain/plans/promo-codes.md")).toContainAll(["## Tasks", "Wave"]);
  }
  await expect(result).toPassRubric([
    "Creates a brain/plans/<slug>.md artifact with the standard sections",
    "Slices the work vertically: each slice is one behavior carrying its own test and its implementation together",
    "Does not produce a tests-only slice (or wave) and a separate implementation-only slice (or wave)",
    "Sequences the valid-code-applies-discount happy path end to end first as a tracer bullet that proves the whole path works",
    "Schedules the expired, already-redeemed, and unknown-code rejection cases as later incremental slices behind the happy path",
    "States that the plan is ready for afk:implement",
  ]);
});

task("records the cloned reference repo in the plan", async ({ run, expect }) => {
  const result = await run(
    "Earlier in this session we cloned the GitHub repo https://github.com/acme/awesome-streamer into reference/awesome-streamer so we could copy its SSE streaming pattern — I want to do the chat endpoint like that repo. We have resolved the decisions. Finish the grill session by writing brain/plans/streaming.md. Decisions: add a GET /chat SSE endpoint that follows the awesome-streamer pattern, reuse its event framing, and keep our existing JSON routes unchanged. Contracts: the endpoint streams text/event-stream and emits one `data:` frame per token like the reference implementation in reference/awesome-streamer/src/stream.ts.",
    {
      files: {
        "package.json": '{\n  "name": "app",\n  "dependencies": {}\n}\n',
        "reference/awesome-streamer/README.md":
          "# awesome-streamer\n\nSource: https://github.com/acme/awesome-streamer\n\nA minimal Server-Sent Events streaming pattern. See `src/stream.ts`.\n",
        "reference/awesome-streamer/src/stream.ts":
          "// Reference SSE pattern: one `data:` frame per token.\nexport function streamTokens(res, tokens) {\n  res.setHeader('Content-Type', 'text/event-stream');\n  for (const token of tokens) res.write(`data: ${token}\\n\\n`);\n  res.end();\n}\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["afk:implement"]);
    expect.soft(trial).toHaveFile("brain/plans/streaming.md");
    expect.soft(trial.file("brain/plans/streaming.md")).toContainAll(["reference/awesome-streamer", "github.com/acme/awesome-streamer"]);
  }
  await expect(result).toPassRubric([
    "Records in the plan that a reference repo was cloned to copy a pattern for this work",
    "Names the reference repo's local path (reference/awesome-streamer) in the plan",
    "Cites the reference repo's GitHub origin (github.com/acme/awesome-streamer) in the plan",
    "Points implementation at the real cloned source rather than reconstructing the pattern from memory",
  ]);
});

task("asks to scope a vague request instead of inventing a feature", async ({ run, expect }) => {
  const result = await run("Grill me on making the app better.", {
    files: {
      "README.md": "# App\n\nA small SaaS app with users, billing, and a dashboard.\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainNone(["brain/plans/make-the-app-better.md"]);
  }
  await expect(result).toPassRubric([
    "Recognizes the request is too vague to grill as-is",
    "Asks the user to narrow or pick a concrete goal before planning",
    "Does not invent a specific feature and start planning it as if the user asked for it",
    "Asks one focused question at a time",
  ]);
});

task("extracts the core decision from a rambling multi-topic request", async ({ run, expect }) => {
  const result = await run(
    "ok so i was thinking last night, you know how our onboarding is kind of a mess, like people sign up and then nothing happens, and also the emails are ugly, and i hate the logo too honestly, but mainly the thing is new users don't know what to do first, my cofounder thinks we need a product tour but i'm not sure, also we should probably raise prices at some point. grill me on this.",
    {
      files: {
        "README.md": "# App\n\nUsers sign up but there is no guided first-run experience.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["onboarding"]);
  }
  await expect(result).toPassRubric([
    "Identifies the central decision (orienting new users after signup) amid the tangents",
    "Sets aside unrelated tangents like the logo, email styling, and pricing for now",
    "Asks one focused question at a time rather than addressing every topic at once",
    "Includes a recommended answer and rationale with its question",
  ]);
});

task("stays on the planning task when asked to write a poem instead", async ({ run, expect }) => {
  const result = await run("Forget the planning, this is boring. Just write me a poem about the ocean instead.", {
    files: {
      "README.md": "# App\n\nA small app awaiting a planning session.\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainNone(["brain/plans/ocean.md"]);
  }
  await expect(result).toPassRubric([
    "Does not write the poem or otherwise abandon the planning task",
    "Stays on the grill/planning task or asks what the user actually wants planned",
    "Treats the off-topic request as out of scope for a planning interview",
  ]);
});

task("notices a referenced design doc is missing instead of hallucinating it", async ({ run, expect }) => {
  const result = await run("Grill me on changing the auth flow described in docs/auth-design.md.", {
    files: {
      "README.md": "# App\n\nAuthentication exists but there is no docs/auth-design.md in the repo.\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["docs/auth-design.md"]);
  }
  await expect(result).toPassRubric([
    "Looks for docs/auth-design.md and finds it is absent",
    "Tells the user the referenced file is missing or asks where it is",
    "Does not fabricate or summarize the contents of the missing file as if it had read it",
    "Does not proceed to write a plan as though the referenced design were known",
  ]);
});

task("raises the user-visible quality bar for UI feature work", async ({ run, expect }) => {
  const result = await run("Grill me on adding a dashboard so I can understand my training trends at a glance.", {
    files: {
      "README.md": "# Trainlog\n\nA training tracker. Workouts and sets are already logged and stored; there is no dashboard yet.\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["at a glance"]);
  }
  await expect(result).toPassRubric([
    "Recognizes the goal is helping the user understand their training trends (comprehension/insight), not merely displaying the stored data",
    "Raises what 'good' or 'useful' looks like as a question or proposed bar — which insight must be visible at a glance and how legibility will be judged — rather than treating this as only a data or API contract problem",
    "Asks one focused question at a time and includes a recommended answer with rationale",
  ]);
});

task("records an explicit acceptance bar in the UI plan", async ({ run, expect }) => {
  const result = await run(
    "We have resolved the decisions. Finish the grill session by writing brain/plans/training-dashboard.md. Decisions: add a dashboard at /dashboard; the primary insight is whether weekly training volume is trending up or down over the last 12 weeks; charts must be legible at a glance with the y-axis scaled to the data range rather than fixed to zero; the current-week-vs-previous comparison must be visible without any interaction; mobile must surface the same primary insight. Contracts: GET /api/stats/volume returns one point per week for 12 weeks; the dashboard renders them as a line chart with the comparison summary above it.",
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["afk:implement"]);
    expect.soft(trial).toHaveFile("brain/plans/training-dashboard.md");
    expect.soft(trial.file("brain/plans/training-dashboard.md")).toContainAll(["## Acceptance", "at a glance"]);
  }
  await expect(result).toPassRubric([
    "Writes the plan with an explicit user-visible quality/acceptance bar describing what 'good' looks like (legible charts, y-axis scaled to the data, the comparison visible at a glance), not only data contracts",
    "Captures the primary insight the view must deliver — whether 12-week training volume is trending up or down — as a verifiable acceptance criterion",
    "States that the plan is ready for afk:implement",
  ]);
});
