import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { skillNames } from "../lib/catalog";
import { fromPluginRoot } from "../lib/paths";

const validSkills = new Set(skillNames());
const corpusPath = fromPluginRoot("tests", "e2e", "triggers", "corpus.json");

describe("trigger corpus", () => {
  test("corpus.json exists", () => {
    expect(existsSync(corpusPath)).toBe(true);
  });

  const corpus = (() => {
    try {
      return JSON.parse(readFileSync(corpusPath, "utf8")) as unknown;
    } catch {
      return undefined;
    }
  })();

  test("corpus.json is a non-empty array", () => {
    expect(Array.isArray(corpus) && corpus.length > 0).toBe(true);
  });

  if (!Array.isArray(corpus)) {
    return;
  }

  const entries = corpus as { query?: unknown; owner?: unknown }[];

  test("entries have required fields", () => {
    const invalid = entries.filter(
      (entry) =>
        typeof entry !== "object" ||
        entry === null ||
        typeof entry.query !== "string" ||
        entry.query.length === 0 ||
        typeof entry.owner !== "string" ||
        entry.owner.length === 0,
    );
    expect(invalid).toEqual([]);
  });

  test("every owner is none or an existing skill", () => {
    const unknownOwners = entries
      .map((entry) => String(entry.owner))
      .filter((owner) => owner !== "none" && !validSkills.has(owner));
    expect(unknownOwners).toEqual([]);
  });

  test("every skill covered by at least one query", () => {
    const coveredSkills = new Set(entries.map((entry) => String(entry.owner)).filter((owner) => owner !== "none"));
    expect([...validSkills].filter((skill) => !coveredSkills.has(skill))).toEqual([]);
  });

  test("has at least one none query", () => {
    expect(entries.some((entry) => entry.owner === "none")).toBe(true);
  });
});
