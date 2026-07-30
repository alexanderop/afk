// Shared discovery of the skill/agent catalog: one definition of what counts as
// a skill or an agent, used by the lints and the integration checks alike.
import { existsSync } from "node:fs";
import { basename, dirname } from "node:path";
import { listFiles } from "./fs";
import { fromPluginRoot } from "./paths";

/** A catalog member: its name, and the file that defines it. */
export type CatalogEntry = { name: string; file: string };

export function skillEntries(): CatalogEntry[] {
  return listFiles(fromPluginRoot("skills"), (path) => basename(path) === "SKILL.md")
    .map((file) => ({ name: basename(dirname(file)), file }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function agentEntries(): CatalogEntry[] {
  const agentRoot = fromPluginRoot("agents");
  if (!existsSync(agentRoot)) {
    return [];
  }

  return listFiles(agentRoot, (path) => path.endsWith(".md"))
    .map((file) => ({ name: basename(file, ".md"), file }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function skillNames(): string[] {
  return skillEntries().map((entry) => entry.name);
}

export function agentNames(): string[] {
  return agentEntries().map((entry) => entry.name);
}
