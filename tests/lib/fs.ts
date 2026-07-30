import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fromPluginRoot } from "./paths";

const skippedDirs = [".git", "node_modules"];
// The plugin root's qa/ is gitignored per-run eval output — thousands of
// agent-written files that grow with every paid run — so walking it is pure
// waste. Matched by full path, not by name: skills/qa/ is a real skill.
// Passing a qa run dir as `root` still walks it.
const artifactsRoot = fromPluginRoot("qa");

export function listFiles(root: string, predicate: (path: string) => boolean): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (skippedDirs.includes(entry) || path === artifactsRoot) {
        continue;
      }
      found.push(...listFiles(path, predicate));
    } else if (predicate(path)) {
      found.push(path);
    }
  }
  return found.sort();
}

export function stripMarkdownCodeBlocks(markdown: string): string {
  let inCodeBlock = false;
  const kept: string[] = [];

  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (!inCodeBlock) {
      kept.push(line);
    }
  }

  return kept.join("\n");
}
