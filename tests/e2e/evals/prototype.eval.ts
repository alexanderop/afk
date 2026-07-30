// Behavioral evals for afk:prototype (throwaway UI/logic exploration).
import { task } from "../../lib/harness";

task("routes UI variants through an existing route with a switcher", async ({ run, expect }) => {
  const result = await run(
    "Prototype three different layouts for the settings page. Eval mode: do not edit files; explain the AFK Prototype route and artifact shape.",
  );

  await expect(result).toRoute({
    expect: ["UI", "three", "?variant=", "brain/prototypes", "throwaway"],
  });
});

task("routes a state-machine sanity check to the logic/terminal branch", async ({ run, expect }) => {
  const result = await run(
    "I want to sanity-check whether this onboarding state machine handles invite accepted then account deleted. Eval mode: do not edit files; explain the AFK Prototype route and artifact shape.",
  );

  await expect(result).toRoute({
    expect: ["logic", "terminal", "state", "pure", "brain/prototypes"],
  });
});

task("routes a playable data-model question to logic, not UI", async ({ run, expect }) => {
  const result = await run(
    "Let me play with how our pricing tier calculation behaves for weird edge inputs like zero seats or a 100% discount. Eval mode: do not edit files; explain the AFK Prototype route and artifact shape.",
  );

  await expect(result).toRoute({
    expect: ["logic", "terminal", "brain/prototypes"],
  });
});
