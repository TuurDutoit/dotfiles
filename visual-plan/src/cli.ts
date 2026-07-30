#!/usr/bin/env node
import { resolve } from "node:path";
import { actorSchema } from "./domain.js";
import { seedFeaturePlan } from "./demo.js";
import { startHttpServer } from "./http.js";
import { startMcpServer } from "./mcp.js";
import { WorkspaceService } from "./service.js";
import { FileWorkspaceStore } from "./storage.js";

const usage = `Visual Workspace (local-first)\n\nUsage:\n  visual-workspace init [--workspace PATH]\n  visual-workspace demo [--workspace PATH]\n  visual-workspace serve [--port PORT] [--workspace PATH] [--lan]\n  visual-workspace doc list [--workspace PATH]\n  visual-workspace doc export <document-id> [--workspace PATH]\n  visual-workspace doc reconcile <document-id> --actor-id <id> --actor-name <name> [--agent-client codex|claude-code|other] [--workspace PATH]\n  visual-workspace mcp [--workspace PATH]\n\nThe HTTP server binds to 127.0.0.1 by default. Pass --lan to explicitly expose it on 0.0.0.0.\n\nMCP setup (Codex / Claude Code):\n  { "mcpServers": { "visual-workspace": { "command": "npx", "args": ["tsx", "src/cli.ts", "mcp", "--workspace", "/absolute/project/path"] } } }\n`;
const args = process.argv.slice(2);
const option = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const workspace = () => resolve(option("--workspace") ?? process.cwd());
const serviceFor = async () => { const service = new WorkspaceService(new FileWorkspaceStore(workspace())); await service.initialize(); return service; };
const commandActor = () => {
  const id = option("--actor-id"); const displayName = option("--actor-name"); const client = option("--agent-client");
  if (!id || !displayName) throw new Error("Reconciliation requires --actor-id and --actor-name for provenance");
  return actorSchema.parse(client ? { kind: "agent", id, displayName, client } : { kind: "human", id, displayName });
};
const main = async () => {
  const command = args[0];
  if (!command || command === "help" || command === "--help" || command === "-h") { process.stdout.write(usage); return; }
  const service = await serviceFor();
  if (command === "init") { process.stdout.write(`Initialized visual workspace in ${workspace()}\n`); return; }
  if (command === "demo") { const snapshot = await seedFeaturePlan(service); process.stdout.write(`Created demo document ${snapshot.document.id}\n`); return; }
  if (command === "serve") { const rawPort = option("--port"); const port = rawPort ? Number(rawPort) : undefined; const running = await startHttpServer(service, { port, allowLan: args.includes("--lan") }); process.stdout.write(`Visual Workspace API listening at ${running.url}\nWorkspace: ${workspace()}\n`); return; }
  if (command === "mcp") { startMcpServer(service); return; }
  if (command === "doc" && args[1] === "list") { process.stdout.write(`${JSON.stringify(await service.listDocuments(), null, 2)}\n`); return; }
  if (command === "doc" && args[1] === "export" && args[2]) { process.stdout.write(`${(await service.exportDocument(args[2])).markdown}`); return; }
  if (command === "doc" && args[1] === "reconcile" && args[2]) { const snapshot = await service.reconcileDocument(args[2], commandActor()); process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`); return; }
  process.stderr.write(usage); process.exitCode = 1;
};
main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
