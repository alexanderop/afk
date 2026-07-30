// Grader validation (the "reference solution" check): run the rubric grader
// against canned ideal and sabotaged transcripts for the two judge-heaviest
// suites. An ideal transcript that fails means an assertion is unmeetable as
// worded; a sabotaged transcript that passes means an assertion is trivially
// satisfiable. Either would otherwise masquerade as a skill regression. Also a
// canary for judge-model drift. Costs a few haiku calls, no skill runs.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, inject, test } from "vitest";
import { judgeRubric } from "../lib/trials";

const selfcheckDir = () => {
  const dir = join(inject("evalRunDir"), "judge-selfcheck");
  mkdirSync(dir, { recursive: true });
  return dir;
};

const grillAssertions = [
  "Inspects relevant code, docs, tests, and existing plans before asking",
  "Does not ask the user how the codebase works before reading available files",
  "Asks one question at a time",
  "Includes a recommended answer and rationale with the question",
];

const grillIdeal = `I'll start by reading the repo before asking anything.

Reading README.md: the app is a tiny SaaS with users and workspaces. Reading src/billing.md: current billing is user-scoped; team billing does not exist yet. I checked brain/ for existing plans and found none, and there are no tests covering billing yet.

Tools used:
- Read(README.md)
- Read(src/billing.md)
- Glob(brain/**)
- Glob(tests/**)

Final result:
Based on what I read, billing is user-scoped today and team billing is new ground. First question (one at a time):

**Q1: Who owns a team subscription — the workspace or an individual owner user?**

Recommended answer: the workspace. Rationale: src/billing.md shows workspaces already group users, so hanging the subscription off workspace_id avoids a parallel ownership concept and keeps seat counting derivable from memberships.`;

const grillSabotaged = `Great, let's plan team billing! Before I look at anything, can you explain how your codebase is structured and how billing currently works?

Also, all at once:
1. Who owns subscriptions?
2. How should seats be counted?
3. What should invoices look like?
4. When do you want to ship?

Final result:
Answer the four questions above and I'll write the plan.`;

const implementAssertions = [
  "Names implement-orchestrator",
  "States that the orchestrator is read-only",
  "States that it cannot edit files",
  "States that final diff review and verification happen after workers edit",
];

const implementIdeal = `For a complex auth refactor, AFK Implement routes the plan to the implement-orchestrator.

The implement-orchestrator is read-only: it reads the plan and the touched modules, decides contracts, and slices the work into worker briefs, but it cannot edit files — it has no Write, Edit, or Bash access. All edits are made by implementation-worker subagents running bounded TDD slices.

Final result:
Route: implement-orchestrator plans read-only; implementation-worker subagents make every edit; after the workers finish, the lead runs the final diff review and verification (test suite, lint) before accepting.`;

const implementSabotaged = `For a complex auth refactor, the orchestrator takes over the whole job.

Final result:
The orchestrator reads the plan, edits the auth modules itself, runs the tests as it goes, and reports done when its own edits pass. No separate review is needed since the orchestrator already verified its own work.`;

const suites = [
  { skill: "grill", assertions: grillAssertions, ideal: grillIdeal, sabotaged: grillSabotaged },
  { skill: "implement", assertions: implementAssertions, ideal: implementIdeal, sabotaged: implementSabotaged },
];

test.each(suites)("judge self-check: $skill assertions pass an ideal transcript and fail a sabotaged one", async (suite) => {
  const dir = selfcheckDir();
  const [ideal, sabotaged] = await Promise.all([
    judgeRubric(suite.ideal, suite.assertions, dir, `.${suite.skill}-ideal`),
    judgeRubric(suite.sabotaged, suite.assertions, dir, `.${suite.skill}-sabotaged`),
  ]);

  expect(ideal.result, `ideal ${suite.skill} judge unparseable; see ${dir}`).not.toBeNull();
  expect(sabotaged.result, `sabotaged ${suite.skill} judge unparseable; see ${dir}`).not.toBeNull();
  expect(
    ideal.result!.score,
    `ideal ${suite.skill} transcript scored low — an assertion may be unmeetable as worded; see ${dir}`,
  ).toBeGreaterThanOrEqual(0.75);
  expect(
    sabotaged.result!.score,
    `sabotaged ${suite.skill} transcript scored high — an assertion may be trivially satisfiable; see ${dir}`,
  ).toBeLessThanOrEqual(0.5);
});
