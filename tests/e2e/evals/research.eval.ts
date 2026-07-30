// Behavioral evals for afk:research (external-grounding digests).
import { task } from "../../lib/harness";

task("grounds in the brain's pinned sources before searching the web", async ({ run, expect }) => {
  const result = await run("Research how teams do idempotency keys for payment APIs so we can design ours.", {
    files: {
      "README.md": "# Payments Fixture\n\nA service that will add idempotent payment endpoints.\n",
      "brain/index.md":
        "# Brain\n\n## Principles\n- [[principles]]\n\n## Sources\n- [[sources/stripe-idempotency]] — Stripe's idempotency-key design: scope, retries, key lifetime.\n",
      "brain/principles.md": "# Principles\n\nProject engineering and design principles.\n",
      "brain/sources.md":
        "# Sources\n\nPointers to external authoritative docs. Read them in place; never copy their content here.\n\n- [[sources/stripe-idempotency]]\n",
      "brain/sources/stripe-idempotency.md":
        "# Stripe Idempotency\n\nAuthoritative reference for idempotency-key design on payment APIs.\n\n- https://docs.stripe.com/api/idempotent_requests\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["idempotency"]);
  }
  await expect(result).toPassRubric([
    "Reads brain/index.md and the sources index before issuing web searches",
    "Recognizes that brain/sources/stripe-idempotency already pins an authoritative source for this exact topic",
    "Does not re-research from scratch what the brain already pins as authoritative; reads the pinned source in place",
    "Any web research is scoped to genuine gaps the pinned source does not cover, not a duplicate landscape scan",
  ]);
});

task("asks narrowing questions before researching an unscoped topic", async ({ run, expect }) => {
  const result = await run("Research the best database for us.", {
    files: {
      "README.md": "# App\n\nA small product. No database constraints have been stated yet.\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainNone(["Research value: high"]);
  }
  await expect(result).toPassRubric([
    "Recognizes the request is too vague to research as-is (no workload, constraints, or use case given)",
    "Asks one or two narrowing questions before doing the research",
    "Does not fire a broad batch of web searches against an unscoped question",
    "Does not invent a specific scope and present findings as if the user had asked for it",
  ]);
});

task("persists a thin brain source pointer instead of copying the doc", async ({ run, expect }) => {
  const result = await run(
    "Research current approaches to server-sent-events backpressure, and save anything durable into our memory so future sessions have it.",
    {
      maxBudgetUsd: 2.5,
      files: {
        "README.md": "# App\n\nA streaming service exploring SSE backpressure handling.\n",
        "brain/index.md": "# Brain\n\n## Sources\n- [[sources/index]]\n",
        "brain/sources.md": "# Sources\n\nPointers to external authoritative docs. Read them in place; never copy their content here.\n",
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["brain/sources"]);
  }
  await expect(result).toPassRubric([
    "Persists durable findings as a thin brain/sources/ pointer: a URL plus a one-line description, not a copy of the source's body text",
    "Does not paste large verbatim external documentation content into the brain vault",
    "Defers to the brain skill's rules for writing the pointer (one topic per file, update the sources entrypoint) and asks before writing rather than silently dumping notes",
    "Still returns the synthesized digest to the caller separately from the brain pointer",
  ]);
});

task("returns a structured digest with a research-value assessment", async ({ run, expect }) => {
  const result = await run("Research the landscape of open-source feature-flag systems we could adopt.", {
    maxBudgetUsd: 2.5,
    files: {
      "README.md": "# App\n\nA web app that wants to add feature flags and is comparing build-vs-adopt.\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["Research value"]);
  }
  await expect(result).toPassRubric([
    "Opens the output with a one-line research-value assessment (high / moderate / low) with a short justification",
    "Organizes findings into the named digest sections (such as Prior Art, Market and Competitor Signals, Sources) rather than a flat list of links",
    "Names specific systems or projects with concrete details, not vague competitive-landscape prose",
    "Returns a compact synthesis and a used-sources list, not raw fetched page dumps",
  ]);
});

task("defers an exact API-signature question to the docs-lookup path", async ({ run, expect }) => {
  const result = await run(
    "Research the exact method signature and options object for the official Stripe Node SDK's paymentIntents.create call.",
    {
      files: {
        "README.md": "# App\n\nA Node service integrating the Stripe SDK.\n",
        "package.json": '{\n  "name": "app",\n  "dependencies": {\n    "stripe": "^17.0.0"\n  }\n}\n',
      },
    },
  );

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["doc"]);
  }
  await expect(result).toPassRubric([
    "Recognizes this is a precise API-reference lookup for a specific library, not open-ended external landscape research",
    "Points to the documentation-lookup path (a Context7-style docs MCP or official versioned docs) as the right tool for an exact current signature",
    "Does not assert the method's parameters or options from memory as if confirmed",
    "Does not run a broad prior-art / competitor landscape sweep for a single API-signature question",
  ]);
});
