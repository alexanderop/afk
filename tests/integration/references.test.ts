import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { expect, test } from "vitest";
import { skillNames } from "../lib/catalog";
import { listFiles, stripMarkdownCodeBlocks } from "../lib/fs";
import { fromPluginRoot, pluginDir } from "../lib/paths";

function rel(path: string): string {
  return relative(pluginDir, path);
}

function resolveFileRef(src: string, ref: string): boolean {
  if (!ref || /^https?:\/\//.test(ref) || ref.startsWith("mailto:") || ref.startsWith("#")) {
    return true;
  }

  const normalizedRef = ref.split("#")[0]!.split("?")[0]!;
  return [join(dirname(src), normalizedRef), fromPluginRoot(normalizedRef)].some((candidate) => existsSync(candidate));
}

test("all internal file references resolve", () => {
  const referencePattern = /\b(?:references|skills)(?:\/[A-Za-z0-9._-]+)+\.(?:md|sh)\b/g;
  const skillDirs = skillNames().map((name) => fromPluginRoot("skills", name));
  const deadRefs: string[] = [];

  for (const src of listFiles(fromPluginRoot("skills"), (path) => path.endsWith(".md"))) {
    for (const match of readFileSync(src, "utf8").matchAll(referencePattern)) {
      const ref = match[0];
      const candidates = [dirname(src), pluginDir, ...skillDirs];
      if (!candidates.some((base) => existsSync(join(base, ref)))) {
        deadRefs.push(`${rel(src)}: ${ref}`);
      }
    }
  }

  expect(deadRefs).toEqual([]);
});

test("all markdown links resolve", () => {
  const deadLinks: string[] = [];

  for (const markdownFile of listFiles(pluginDir, (path) => path.endsWith(".md"))) {
    if (rel(markdownFile).startsWith("docs/templates/")) {
      continue;
    }

    const body = stripMarkdownCodeBlocks(readFileSync(markdownFile, "utf8"));
    for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const ref = match[1]!;
      if (/\.md($|#|\?)/.test(ref) && !resolveFileRef(markdownFile, ref)) {
        deadLinks.push(`${rel(markdownFile)}: ${ref}`);
      }
    }
  }

  expect(deadLinks).toEqual([]);
});
