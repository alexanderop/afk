// Test registrars shared by the skill and agent lints. Each function is called
// inside a describe() block at collection time and registers one test per rule.
import { expect, test } from "vitest";
import { maxDescriptionChars, maxNameChars, requiredFrontmatterKeys, reservedNameWords, xmlTagPattern } from "./rules";

export function registerNameRuleTests(name: string): void {
  test(`name within ${maxNameChars} chars`, () => {
    expect(name.length).toBeLessThanOrEqual(maxNameChars);
  });

  test("name has no XML tags", () => {
    expect(name).not.toMatch(xmlTagPattern);
  });

  test("name has no reserved words", () => {
    expect(reservedNameWords.filter((word) => name.toLowerCase().includes(word))).toEqual([]);
  });
}

export function registerDescriptionRuleTests(description: string): void {
  test("description present", () => {
    expect(description.length).toBeGreaterThan(0);
  });

  test(`description within ${maxDescriptionChars} chars`, () => {
    expect(description.length).toBeLessThanOrEqual(maxDescriptionChars);
  });

  test("description has no XML tags", () => {
    expect(description).not.toMatch(xmlTagPattern);
  });

  test("description starts with 'Use when'", () => {
    expect(description).toMatch(/^Use when/);
  });
}

export function registerFrontmatterKeyTests(keys: string[], allowed: Set<string>): void {
  for (const required of requiredFrontmatterKeys) {
    test(`required field '${required}' present`, () => {
      expect(keys).toContain(required);
    });
  }

  test("only allowed frontmatter keys", () => {
    expect(keys.filter((key) => !allowed.has(key))).toEqual([]);
  });
}
