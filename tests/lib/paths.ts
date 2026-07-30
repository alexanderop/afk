import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const testsDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const pluginDir = dirname(testsDir);

export function fromPluginRoot(...parts: string[]): string {
  return join(pluginDir, ...parts);
}

/**
 * @returns A compact UTC timestamp (`20260730T091500Z`) naming one run's
 * artifact directory. Shared by every paid suite so artifact dirs under `qa/`
 * stay sortable and parseable by one rule.
 */
export function runDirName(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
