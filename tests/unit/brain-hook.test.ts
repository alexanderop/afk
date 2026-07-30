import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { fromPluginRoot } from "../lib/paths";

describe("auto-index-brain hook", () => {
  const hook = fromPluginRoot("hooks", "auto-index-brain.sh");
  let dir: string;
  let index: string;
  let rebuiltIndex: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "afk-brain-"));
    mkdirSync(join(dir, "brain", "principles"), { recursive: true });
    mkdirSync(join(dir, "brain", "codebase"), { recursive: true });
    // A note with a summary line under its title.
    writeFileSync(
      join(dir, "brain", "principles", "prove-it-works.md"),
      "# Prove It Works\n\nNever claim done without evidence the change runs.\n\n- Show output\n",
    );
    // A note whose first content is a bullet (marker should be stripped).
    writeFileSync(join(dir, "brain", "codebase", "deploy-gotchas.md"), "# Deploy Gotchas\n- Staging mirrors prod env vars\n");
    // A note with only a title — no description available.
    writeFileSync(join(dir, "brain", "principles.md"), "# Principles\n");

    const exec = () => execFileSync("bash", [hook], { input: "{}", env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
    const indexPath = join(dir, "brain", "index.md");

    exec();
    index = readFileSync(indexPath, "utf8");
    exec();
    rebuiltIndex = readFileSync(indexPath, "utf8");
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("summary line becomes the entry description", () => {
    expect(index).toContain("[[principles/prove-it-works]] — Never claim done without evidence the change runs.");
  });

  test("leading list marker stripped from description", () => {
    expect(index).toContain("[[codebase/deploy-gotchas]] — Staging mirrors prod env vars");
  });

  test("title-only note stays a bare wikilink", () => {
    expect(index).toMatch(/- \[\[principles\]\]\s*$/m);
  });

  test("rebuild is idempotent", () => {
    expect(rebuiltIndex).toBe(index);
  });
});
