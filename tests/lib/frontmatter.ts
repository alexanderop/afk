export type ParsedFrontmatter = {
  frontmatter: string[];
  body: string;
};

export type FrontmatterError = { error: string };

export function parseFrontmatter(content: string): ParsedFrontmatter | FrontmatterError {
  const lines = content.split("\n");

  if (lines[0] !== "---") {
    return { error: "frontmatter does not open on line 1" };
  }

  const closeIndex = lines.slice(1).findIndex((line) => line === "---");
  if (closeIndex === -1) {
    return { error: "frontmatter is never closed" };
  }

  return {
    frontmatter: lines.slice(1, closeIndex + 1),
    body: lines.slice(closeIndex + 2).join("\n"),
  };
}

export function frontmatterValue(frontmatter: string[], key: string): string {
  return frontmatter.find((line) => line.startsWith(`${key}:`))?.replace(new RegExp(`^${key}:\\s*`), "") ?? "";
}

export function frontmatterKeys(frontmatter: string[]): string[] {
  return frontmatter
    .filter((line) => /^[A-Za-z][\w-]*:/.test(line))
    .map((line) => line.slice(0, line.indexOf(":")));
}

export function parseTools(value: string): string[] {
  return value
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean);
}
