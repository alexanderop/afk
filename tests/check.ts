import { spawnSync } from "bun";

console.log("=== AFK static checks (Bun, zero-token) ===");
console.log("");

const scripts = ["./unit/run-unit-tests.ts", "./integration/run-integration-tests.ts"];

for (const script of scripts) {
  const result = spawnSync({
    cmd: ["bun", new URL(script, import.meta.url).pathname],
    stdout: "inherit",
    stderr: "inherit",
  });

  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}
