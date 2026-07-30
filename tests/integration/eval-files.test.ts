// Eval files are code (tests/e2e/evals/<skill>.eval.ts), so TypeScript owns
// shape validation; what's left to check is that every eval file targets a
// real skill (the filename routes the /afk:<skill> prompt) and uses the kit.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { describe, expect, test } from "vitest";
import { skillNames } from "../lib/catalog";
import { listFiles } from "../lib/fs";
import { fromPluginRoot } from "../lib/paths";

const validSkills = new Set(skillNames());
const evalsDir = fromPluginRoot("tests", "e2e", "evals");
const evalFiles = listFiles(evalsDir, (path) => path.endsWith(".eval.ts"));

test("at least one eval file exists", () => {
  expect(evalFiles.length).toBeGreaterThan(0);
});

test("the evals directory contains only .eval.ts files", () => {
  const strays = listFiles(evalsDir, (path) => !path.endsWith(".eval.ts")).map((file) => basename(file));
  expect(strays).toEqual([]);
});

describe.each(evalFiles.map((file) => ({ name: basename(file), file })))("$name", ({ name, file }) => {
  const skill = name.replace(/\.eval\.ts$/, "");

  test("is named after an existing skill", () => {
    expect(validSkills.has(skill), `unknown skill: ${skill}`).toBe(true);
  });

  test("uses the eval harness", () => {
    const source = readFileSync(file, "utf8");
    // Matched by module name, not by relative depth, so moving the evals dir
    // doesn't fail a lint that has nothing to say about where files live.
    expect(source, "no import of tests/lib/harness").toMatch(/from "[^"]*\/harness"/);
    // Tasks come from the harness primitive, never a bare vitest `test`, or the
    // trials/graders/reporting layer is bypassed entirely.
    expect(source, "no task() call").toMatch(/\btask\(/);
  });
});
