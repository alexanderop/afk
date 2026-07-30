// Async wrapper around spawning the `claude` CLI (and parsing its stream-json
// output). Async so that test.concurrent can keep several headless claude runs
// in flight at once — a synchronous spawn would serialize the whole suite.
import { spawn, spawnSync } from "node:child_process";

export type CommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export function runCommand(cmd: string[], options: { cwd: string; timeoutMs: number; signal?: AbortSignal }): Promise<CommandResult> {
  const [bin, ...args] = cmd;
  return new Promise((resolve, reject) => {
    const child = spawn(bin!, args, {
      cwd: options.cwd,
      timeout: options.timeoutMs,
      // Vitest aborts the signal on test timeout / Ctrl+C; without it an
      // orphaned claude run would keep billing after the test is dead.
      signal: options.signal,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      timedOut = code === null && signal !== null;
      resolve({ exitCode: code, stdout, stderr, timedOut });
    });
  });
}

export function commandExists(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

export function parseJsonLines(text: string): Record<string, unknown>[] {
  return text
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as Record<string, unknown>];
      } catch {
        return [];
      }
    });
}

export function collectAssistantText(events: Record<string, unknown>[]): string {
  return assistantContentBlocks(events)
    .filter((content) => content.type === "text" && typeof content.text === "string")
    .map((content) => content.text as string)
    .join("\n");
}

export function collectToolCalls(events: Record<string, unknown>[]): string[] {
  return assistantContentBlocks(events)
    .filter((content) => content.type === "tool_use" && typeof content.name === "string")
    .map((content) => {
      const name = content.name as string;
      const input = content.input as Record<string, unknown> | undefined;
      const hint = input?.file_path ?? input?.path ?? input?.pattern ?? input?.command ?? input?.prompt ?? input?.description;
      const hintText = typeof hint === "string" ? hint.slice(0, 120) : "";
      return hintText ? `${name}(${hintText})` : name;
    });
}

export function assistantContentBlocks(events: Record<string, unknown>[]): Record<string, unknown>[] {
  return events
    .filter((event) => event.type === "assistant")
    .flatMap((event) => {
      const message = event.message as Record<string, unknown> | undefined;
      return Array.isArray(message?.content) ? message.content : [];
    })
    .filter((content): content is Record<string, unknown> => typeof content === "object" && content !== null);
}

export function lastResultEvent(events: Record<string, unknown>[]): Record<string, unknown> | undefined {
  return events.filter((event) => event.type === "result").at(-1) as Record<string, unknown> | undefined;
}

export function initModel(events: Record<string, unknown>[]): string {
  const init = events.find((event) => event.type === "system" && event.subtype === "init");
  const model = init?.model;
  return typeof model === "string" ? model : "";
}

export function numTurns(event: Record<string, unknown> | undefined): number {
  const turns = Number(event?.num_turns ?? 0);
  return Number.isFinite(turns) ? turns : 0;
}

export function eventCost(event: Record<string, unknown> | undefined): number {
  const cost = Number(event?.total_cost_usd ?? 0);
  return Number.isFinite(cost) ? cost : 0;
}
