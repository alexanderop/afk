import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { skillEntries } from "../lib/catalog";
import { frontmatterKeys, frontmatterValue, parseFrontmatter } from "../lib/frontmatter";
import { registerDescriptionRuleTests, registerFrontmatterKeyTests, registerNameRuleTests } from "../lib/lint-tests";
import { allowedSkillContexts, allowedSkillKeys, maxSkillLines, requiredSkillContexts, requiredSkillSections, skillNamePattern } from "../lib/rules";

const skills = skillEntries().map((entry) => ({ dir: entry.name, file: entry.file }));

test("skills directory has skills", () => {
  expect(skills.length).toBeGreaterThan(0);
});

describe.each(skills)("$dir", ({ dir, file }) => {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  const parsed = parseFrontmatter(content);

  test("frontmatter parses", () => {
    expect("error" in parsed ? parsed.error : undefined).toBeUndefined();
  });

  if ("error" in parsed) {
    return;
  }

  const { frontmatter, body } = parsed;
  const name = frontmatterValue(frontmatter, "name");
  const description = frontmatterValue(frontmatter, "description");
  const context = frontmatterValue(frontmatter, "context");

  registerFrontmatterKeyTests(frontmatterKeys(frontmatter), allowedSkillKeys);

  test(`name matches directory '${dir}'`, () => {
    expect(name).toBe(dir);
  });

  test("name is lowercase kebab-case", () => {
    expect(name).toMatch(skillNamePattern);
  });

  registerNameRuleTests(name);
  registerDescriptionRuleTests(description);

  test("context value is supported", () => {
    if (context) {
      expect(allowedSkillContexts.has(context), `unsupported context: ${context}`).toBe(true);
    }
  });

  const requiredContext = requiredSkillContexts[dir];
  if (requiredContext) {
    test(`declares required context: ${requiredContext}`, () => {
      expect(context).toBe(requiredContext);
    });
  }

  test("SKILL.md has body content", () => {
    expect(body.replace(/\s/g, "").length).toBeGreaterThan(0);
  });

  test.each(requiredSkillSections)("required section '%s' exists", (section) => {
    expect(lines).toContain(section);
  });

  test(`SKILL.md within ${maxSkillLines} lines`, () => {
    // move detail into references/ files when this fails
    expect(lines.length - 1).toBeLessThanOrEqual(maxSkillLines);
  });
});
