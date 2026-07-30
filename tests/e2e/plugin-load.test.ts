// Plugin-load smoke test: one cheap headless turn (~$0.01) asserting Claude
// Code actually loads the plugin — catches manifest/frontmatter/hook-wiring
// breakage the static lint can't see.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { eventCost, lastResultEvent, parseJsonLines, runCommand } from "../lib/claude";
import { pluginDir } from "../lib/paths";

describe("plugin-load smoke", () => {
  let projectDir: string;
  let rawOutput = "";
  let events: Record<string, unknown>[] = [];
  let init: Record<string, unknown> | undefined;

  beforeAll(async () => {
    projectDir = mkdtempSync(join(tmpdir(), "afk-smoke-project-"));
    const result = await runCommand(
      [
        "claude",
        "-p",
        "Reply with the single word: ok",
        "--plugin-dir",
        pluginDir,
        "--setting-sources",
        "project",
        "--max-turns",
        "1",
        "--output-format",
        "stream-json",
        "--verbose",
      ],
      { cwd: projectDir, timeoutMs: 120_000 },
    );
    rawOutput = result.stdout;
    events = parseJsonLines(rawOutput);
    init = events.find((event) => event.type === "system" && event.subtype === "init") as Record<string, unknown> | undefined;

    const cost = eventCost(lastResultEvent(events));
    if (cost > 0) {
      console.log(`plugin-load smoke cost: $${cost}`);
    }
  });

  afterAll(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  test("headless run produced a system/init event", () => {
    expect(init, rawOutput.slice(-500)).toBeDefined();
  });

  test("afk appears in the loaded plugins list", () => {
    const plugins = Array.isArray(init?.plugins) ? (init.plugins as Record<string, unknown>[]) : [];
    expect(
      plugins.some((plugin) => plugin.name === "afk"),
      JSON.stringify(init?.plugins ?? null),
    ).toBe(true);
  });

  test("no plugin_errors reported", () => {
    const pluginErrors = init?.plugin_errors;
    expect(pluginErrors == null || (Array.isArray(pluginErrors) && pluginErrors.length === 0), JSON.stringify(pluginErrors)).toBe(true);
  });

  test("headless run completed without Claude error", () => {
    const resultEvent = lastResultEvent(events);
    expect(resultEvent?.is_error, String(resultEvent?.result ?? "")).toBe(false);
  });
});
