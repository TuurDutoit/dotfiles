import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, "..");
const tsx = resolve(root, "node_modules", "tsx", "dist", "cli.mjs");

async function runCli(...args: string[]) {
  return execFile(process.execPath, [tsx, "src/cli.ts", ...args], { cwd: root });
}

describe("CLI help", () => {
  it("explains the shared workflow, workspace, and every top-level command", async () => {
    const { stdout, stderr } = await runCli("--help");

    expect(stderr).toBe("");
    expect(stdout).toContain("Workflow:");
    expect(stdout).toContain("workspace is the project directory");
    expect(stdout).toContain("init");
    expect(stdout).toContain("demo");
    expect(stdout).toContain("serve");
    expect(stdout).toContain("doc");
    expect(stdout).toContain("doc list");
    expect(stdout).toContain("doc export");
    expect(stdout).toContain("doc reconcile");
    expect(stdout).toContain("mcp");
  });

  it.each([
    { path: ["init"], description: "Initialize the local Visual Workspace data directory." },
    { path: ["demo"], description: "Create a realistic example feature plan." },
    { path: ["serve"], description: "Start the local browser review surface and JSON API." },
    { path: ["mcp"], description: "Start the stdio MCP server for an agent client." },
    { path: ["doc"], description: "Manage documents in a workspace." },
    { path: ["doc", "list"], description: "List document summaries in the workspace." },
    { path: ["doc", "export"], description: "Export one document as readable Markdown." },
    { path: ["doc", "reconcile"], description: "Restore a document's canonical Markdown projection after a raw edit." },
  ])("returns successful, command-specific help for $path", async ({ path, description }) => {
    const { stdout, stderr } = await runCli(...path, "--help");

    expect(stderr).toBe("");
    expect(stdout).toContain(description);
  });
});
