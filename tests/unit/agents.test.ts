import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { agentEntries } from "../lib/catalog";
import { frontmatterKeys, frontmatterValue, parseFrontmatter, parseTools } from "../lib/frontmatter";
import { registerDescriptionRuleTests, registerFrontmatterKeyTests, registerNameRuleTests } from "../lib/lint-tests";
import { agentPolicies, allowedAgentKeys, maxAgentLines, skillNamePattern, supportedAgentModels, supportedAgentTools } from "../lib/rules";

const agents = agentEntries().map((entry) => ({ agentName: entry.name, file: entry.file }));

test("agents directory has agent definitions", () => {
  expect(agents.length).toBeGreaterThan(0);
});

describe.each(agents)("$agentName", ({ agentName, file }) => {
  const content = readFileSync(file, "utf8");
  const parsed = parseFrontmatter(content);

  test("frontmatter parses", () => {
    expect("error" in parsed ? parsed.error : undefined).toBeUndefined();
  });

  if ("error" in parsed) {
    return;
  }

  const { frontmatter, body } = parsed;
  const keys = frontmatterKeys(frontmatter);
  const name = frontmatterValue(frontmatter, "name");
  const description = frontmatterValue(frontmatter, "description");
  const model = frontmatterValue(frontmatter, "model");
  const tools = parseTools(frontmatterValue(frontmatter, "tools"));
  const hasTools = keys.includes("tools");
  const hasModel = keys.includes("model");

  registerFrontmatterKeyTests(keys, allowedAgentKeys);

  test("name matches filename", () => {
    expect(name).toBe(agentName);
  });

  test("name is lowercase kebab-case", () => {
    expect(name).toMatch(skillNamePattern);
  });

  registerNameRuleTests(name);
  registerDescriptionRuleTests(description);

  // Policed agents pin their exact tier, declare a tools allowlist, and hold to
  // the tool shape their guarantee rests on. For every other agent `model` and
  // `tools` are optional.
  const policy = agentPolicies[agentName];
  if (policy) {
    test(`model pinned to '${policy.model}'`, () => {
      // omitting model silently inherits the user's default tier
      expect(model).toBe(policy.model);
    });

    test("declares a tools allowlist", () => {
      expect(hasTools, "no tools: line (omitting it inherits ALL tools, erasing least-privilege)").toBe(true);
    });

    if (policy.requiredTools) {
      test(`includes ${policy.requiredTools.join(", ")}`, () => {
        expect(policy.requiredTools!.filter((tool) => !tools.includes(tool))).toEqual([]);
      });
    }

    if (policy.forbiddenTools) {
      test(`excludes ${policy.forbiddenTools.join(", ")}`, () => {
        expect(policy.forbiddenTools!.filter((tool) => tools.includes(tool))).toEqual([]);
      });
    }
  } else {
    test("model is supported when declared", () => {
      if (hasModel) {
        expect(supportedAgentModels.has(model), `unsupported model: ${model || "empty model: line"}`).toBe(true);
      }
    });
  }

  test("tools are supported when declared", () => {
    if (hasTools) {
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.filter((tool) => !supportedAgentTools.has(tool))).toEqual([]);
    }
  });

  // disallowedTools (defense-in-depth denylist): when declared, values must be real tools and must
  // not contradict the tools allowlist.
  if (keys.includes("disallowedTools")) {
    const disallowed = parseTools(frontmatterValue(frontmatter, "disallowedTools"));

    test("disallowedTools are supported", () => {
      expect(disallowed.length).toBeGreaterThan(0);
      expect(disallowed.filter((tool) => !supportedAgentTools.has(tool))).toEqual([]);
    });

    test("disallowedTools and tools do not overlap", () => {
      expect(disallowed.filter((tool) => tools.includes(tool))).toEqual([]);
    });
  }

  test("agent file has body content", () => {
    expect(body.replace(/\s/g, "").length).toBeGreaterThan(0);
  });

  test(`agent file within ${maxAgentLines} lines`, () => {
    expect(content.split("\n").length - 1).toBeLessThanOrEqual(maxAgentLines);
  });
});
