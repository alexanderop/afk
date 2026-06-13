import { dirname } from "node:path";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "bun";
import { pluginDir } from "../lib/paths";
import { TestRun } from "../lib/runner";

const run = new TestRun();
const logPath = join(mkdtempSync(join(tmpdir(), "afk-smoke-log-")), "raw.jsonl");
const projectDir = mkdtempSync(join(tmpdir(), "afk-smoke-project-"));

function readJsonLines(): Record<string, unknown>[] {
  return readFileSync(logPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as Record<string, unknown>];
      } catch {
        return [];
      }
    });
}

try {
  console.log("=== Plugin-load smoke test (1 headless turn, ~$0.01) ===");
  console.log("");

  const commandResult = spawnSync({
    cmd: [
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
    cwd: projectDir,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  });
  writeFileSync(logPath, commandResult.stdout.toString());

  const events = readJsonLines();
  const init = events.find((event) => event.type === "system" && event.subtype === "init") as Record<string, unknown> | undefined;

  if (init) {
    run.pass("headless run produced a system/init event");
  } else {
    run.fail("headless run produced a system/init event", readFileSync(logPath, "utf8").slice(-500));
    run.summary();
    process.exit(1);
  }

  const plugins = Array.isArray(init.plugins) ? (init.plugins as Record<string, unknown>[]) : [];
  if (plugins.some((plugin) => plugin.name === "afk")) {
    run.pass("afk appears in the loaded plugins list");
  } else {
    run.fail("afk appears in the loaded plugins list", JSON.stringify(init.plugins ?? null));
  }

  const pluginErrors = init.plugin_errors;
  if (pluginErrors == null || (Array.isArray(pluginErrors) && pluginErrors.length === 0)) {
    run.pass("no plugin_errors reported");
  } else {
    run.fail("no plugin_errors reported", JSON.stringify(pluginErrors));
  }

  const resultEvent = events.filter((event) => event.type === "result").at(-1) as Record<string, unknown> | undefined;
  if (resultEvent?.is_error === false) {
    run.pass("headless run completed without Claude error");
  } else {
    run.fail("headless run completed without Claude error", String(resultEvent?.result ?? ""));
  }

  const cost = events.find((event) => event.type === "result" && event.total_cost_usd != null)?.total_cost_usd;
  run.summary(cost != null ? [`  (cost: $${cost})`] : []);
  process.exit(run.exitCode());
} finally {
  rmSync(projectDir, { recursive: true, force: true });
  rmSync(dirname(logPath), { recursive: true, force: true });
}
