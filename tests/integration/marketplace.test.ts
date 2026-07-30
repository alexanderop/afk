import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { fromPluginRoot } from "../lib/paths";

describe("marketplace", () => {
  const pluginJson = JSON.parse(readFileSync(fromPluginRoot(".claude-plugin", "plugin.json"), "utf8")) as Record<string, unknown>;
  const marketplace = JSON.parse(readFileSync(fromPluginRoot(".claude-plugin", "marketplace.json"), "utf8")) as Record<string, unknown>;
  const firstPlugin = Array.isArray(marketplace.plugins) ? (marketplace.plugins[0] as Record<string, unknown> | undefined) : undefined;

  test("marketplace plugin name matches plugin.json", () => {
    expect(marketplace.name).toBe(pluginJson.name);
    expect(firstPlugin?.name).toBe(pluginJson.name);
  });

  test("marketplace plugin source points at repository root", () => {
    expect(firstPlugin?.source).toBe("./");
  });

  test("plugin.json has version anchor", () => {
    expect(typeof pluginJson.version).toBe("string");
    expect((pluginJson.version as string).length).toBeGreaterThan(0);
  });
});
