import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { agentNames, skillNames } from "../lib/catalog";
import { listFiles } from "../lib/fs";
import { fromPluginRoot } from "../lib/paths";

const validSkills = new Set(skillNames());
const validAgents = new Set(agentNames());

// Read once: both reference checks below scan the same corpus.
const refSources = [
  fromPluginRoot("README.md"),
  ...listFiles(fromPluginRoot("docs"), (path) => path.endsWith(".md")),
  ...listFiles(fromPluginRoot("skills"), (path) => path.endsWith(".md")),
].map((path) => readFileSync(path, "utf8"));

describe("skill catalog", () => {
  const readme = readFileSync(fromPluginRoot("README.md"), "utf8");
  const readmeSkills = [...new Set([...readme.matchAll(/\/afk:[a-z0-9-]+/g)].map(([ref]) => ref.replace("/afk:", "")))];

  test.each(readmeSkills)("README skill '/afk:%s' exists", (skill) => {
    expect(validSkills.has(skill), `unknown skill: ${skill}`).toBe(true);
  });

  const helpRows = readFileSync(fromPluginRoot("skills", "help", "afk-help.csv"), "utf8")
    .split("\n")
    .slice(1)
    .filter((row) => row.trim());

  test.each(helpRows.map((row) => row.split(",")[0]!))("help catalog skill '%s' exists", (skillRef) => {
    expect(validSkills.has(skillRef.replace("afk:", "")), `unknown skill: ${skillRef}`).toBe(true);
  });

  test("all afk: skill references resolve", () => {
    const badRefs: string[] = [];
    for (const source of refSources) {
      for (const match of source.matchAll(/\/?afk:[a-z0-9-]+/g)) {
        const skillName = match[0].replace(/^\/?afk:/, "");
        const commandRef = match[0].startsWith("/afk:");
        if (validSkills.has(skillName)) {
          continue;
        }
        // Bare afk: references may also point at an agent (e.g. afk:implementation-worker).
        if (!commandRef && validAgents.has(skillName)) {
          continue;
        }
        badRefs.push(match[0]);
      }
    }
    expect(badRefs).toEqual([]);
  });
});

describe("agent references", () => {
  test("all agent references resolve", () => {
    const badRefs: string[] = [];
    for (const source of refSources) {
      for (const match of source.matchAll(/`(?:afk:)?([a-z0-9]+(?:-[a-z0-9]+)*)`/g)) {
        const agentName = match[1]!;
        if (!agentName.includes("worker") && !agentName.includes("orchestrator")) {
          continue;
        }
        if (!validAgents.has(agentName)) {
          badRefs.push(match[0]);
        }
      }
    }
    expect(badRefs).toEqual([]);
  });

  test("implementation agent pair exists", () => {
    expect(validAgents.has("implement-orchestrator"), [...validAgents].join(", ")).toBe(true);
    expect(validAgents.has("implementation-worker"), [...validAgents].join(", ")).toBe(true);
  });
});
