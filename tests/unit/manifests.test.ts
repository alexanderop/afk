import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { describe, expect, test } from "vitest";
import { listFiles } from "../lib/fs";
import { fromPluginRoot } from "../lib/paths";

describe("plugin manifests", () => {
  const pluginJsonPath = fromPluginRoot(".claude-plugin", "plugin.json");

  test("plugin.json is valid JSON with name and version", () => {
    const pluginJson = JSON.parse(readFileSync(pluginJsonPath, "utf8")) as Record<string, unknown>;
    expect(typeof pluginJson.name).toBe("string");
    expect(typeof pluginJson.version).toBe("string");
  });

  const otherManifests = listFiles(fromPluginRoot(".claude-plugin"), (path) => path.endsWith(".json")).filter(
    (manifest) => basename(manifest) !== "plugin.json",
  );

  test.each(otherManifests.map((manifest) => ({ name: basename(manifest), manifest })))(
    "$name is valid JSON",
    ({ manifest }) => {
      expect(() => JSON.parse(readFileSync(manifest, "utf8"))).not.toThrow();
    },
  );
});
