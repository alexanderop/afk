import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { expect, test } from "vitest";
import { e2eProjects } from "../../vitest.config";
import { listFiles } from "../lib/fs";
import { fromPluginRoot, pluginDir } from "../lib/paths";

test("tests pipeline has no .sh runners", () => {
  const shellTests = listFiles(fromPluginRoot("tests"), (path) => path.endsWith(".sh"));
  expect(shellTests.map((path) => relative(pluginDir, path))).toEqual([]);
});

test("test files do not import bun-only modules", () => {
  // Vitest workers run under Node, so importing the bun-runtime module would
  // only fail at runtime in the model-backed suites — catch it statically.
  const offenders = listFiles(fromPluginRoot("tests"), (path) => path.endsWith(".ts")).filter((path) =>
    /from\s+["']bun["']/.test(readFileSync(path, "utf8")),
  );
  expect(offenders.map((path) => relative(pluginDir, path))).toEqual([]);
});

// Converts a vitest include glob to a regex. Handles the two constructs these
// globs use: `**/` (zero or more directories) and `*` (within one segment).
// `**/` becomes a sentinel first so the `*` pass can't rewrite its expansion.
const anyDirs = "\0";

function globToRegExp(glob: string): RegExp {
  const source = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, anyDirs)
    .replace(/\*/g, "[^/]*")
    .replaceAll(anyDirs, "(?:[^/]+/)*");
  return new RegExp(`^${source}$`);
}

test("every model-backed test file belongs to exactly one e2e project", () => {
  // Each e2e project is run by its own package script, so a file matched by no
  // project silently never runs — in CI or locally — with nothing failing.
  const e2eFiles = listFiles(fromPluginRoot("tests", "e2e"), (path) => /\.(test|eval)\.ts$/.test(path)).map((path) => relative(pluginDir, path));
  const matchers = e2eProjects.map((project) => ({ name: project.name, patterns: project.include.map(globToRegExp) }));

  const coverage = e2eFiles.map((file) => ({
    file,
    projects: matchers.filter((matcher) => matcher.patterns.some((pattern) => pattern.test(file))).map((matcher) => matcher.name),
  }));

  expect(e2eFiles.length).toBeGreaterThan(0);
  expect(coverage.filter((entry) => entry.projects.length !== 1)).toEqual([]);
});
