import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function listFiles(root: string, predicate: (path: string) => boolean): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if ([".git", "node_modules"].includes(entry)) {
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
