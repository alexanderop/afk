import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const testsDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const pluginDir = dirname(testsDir);

export function fromPluginRoot(...parts: string[]): string {
  return join(pluginDir, ...parts);
}
