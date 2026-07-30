#!/usr/bin/env node
import { resolve } from "node:path";
import { actorSchema } from "./domain.js";
import { seedFeaturePlan } from "./demo.js";
import { startHttpServer } from "./http.js";
import { startMcpServer } from "./mcp.js";
import { WorkspaceService } from "./service.js";
import { FileWorkspaceStore } from "./storage.js";

const command = "vw";
const globalHelp = `Visual Workspace (local-first)

Usage:
  ${command} <command> [options]

Workflow:
  1. Choose a workspace and create a plan with \`${command} init\`, \`${command} demo\`, or an agent over MCP.
  2. Start \`${command} serve\` and review, edit, and comment in the local browser UI.
  3. Let the agent read feedback and apply small revision-safe patches; resolve or reopen threads as you review.

A workspace is the project directory whose local \`.visual-workspace/\` folder stores
documents, comments, revision history, browser state, and readable Markdown exports.
It defaults to your current directory; use \`--workspace PATH\` to target another project.

Commands:
  init                    Initialize the local Visual Workspace data directory.
  demo                    Create a realistic example feature plan.
  serve                   Start the local browser review surface and JSON API.
  doc list                List document summaries in the workspace.
  doc export <id>         Export one document as readable Markdown.
  doc reconcile <id>      Restore a Markdown projection after a raw edit.
  mcp                     Start the stdio MCP server for an agent client.

Run \`${command} <command> --help\` for command details.
`;

const help = {
  init: `Usage: ${command} init [--workspace PATH]

Initialize the local Visual Workspace data directory.

Options:
  --workspace PATH  Project directory to initialize (default: current directory).
`,
  demo: `Usage: ${command} demo [--workspace PATH]

Create a realistic example feature plan.

Options:
  --workspace PATH  Project directory to store the demo (default: current directory).
`,
  serve: `Usage: ${command} serve [--port PORT] [--workspace PATH] [--lan]

Start the local browser review surface and JSON API.

Options:
  --port PORT       Port to listen on (default: automatic).
  --workspace PATH  Project directory to serve (default: current directory).
  --lan             Explicitly bind to 0.0.0.0 instead of loopback only.
`,
  mcp: `Usage: ${command} mcp [--workspace PATH]

Start the stdio MCP server for an agent client. Keep it connected in your agent's MCP configuration.

Options:
  --workspace PATH  Project directory the agent can access (default: current directory).
`,
  doc: `Usage: ${command} doc <command> [options]

Manage documents in a workspace.

Commands:
  list                       List document summaries in the workspace.
  export <document-id>       Export one document as readable Markdown.
  reconcile <document-id>    Restore the canonical Markdown projection after a raw edit.

Run \`${command} doc <command> --help\` for command details.
`,
  list: `Usage: ${command} doc list [--workspace PATH]

List document summaries in the workspace.

Options:
  --workspace PATH  Project directory to inspect (default: current directory).
`,
  export: `Usage: ${command} doc export <document-id> [--workspace PATH]

Export one document as readable Markdown.

Options:
  --workspace PATH  Project directory containing the document (default: current directory).
`,
  reconcile: `Usage: ${command} doc reconcile <document-id> --actor-id <id> --actor-name <name> [--agent-client codex|claude-code|other] [--workspace PATH]

Restore a document's canonical Markdown projection after a raw edit. This preserves structured blocks and comment anchors.

Options:
  --actor-id ID      Provenance identifier for the person or agent reconciling.
  --actor-name NAME  Display name for reconciliation provenance.
  --agent-client CLIENT
                     Mark the reconciler as a Codex, Claude Code, or other agent.
  --workspace PATH   Project directory containing the document (default: current directory).
`,
};

const args = process.argv.slice(2);
const option = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const workspace = () => resolve(option("--workspace") ?? process.cwd());
const serviceFor = async () => { const service = new WorkspaceService(new FileWorkspaceStore(workspace())); await service.initialize(); return service; };
const commandActor = () => {
  const id = option("--actor-id"); const displayName = option("--actor-name"); const client = option("--agent-client");
  if (!id || !displayName) throw new Error("Reconciliation requires --actor-id and --actor-name for provenance");
  return actorSchema.parse(client ? { kind: "agent", id, displayName, client } : { kind: "human", id, displayName });
};
const isHelpRequested = () => args.includes("--help") || args.includes("-h");
const helpFor = () => {
  if (args[0] === "init") return help.init;
  if (args[0] === "demo") return help.demo;
  if (args[0] === "serve") return help.serve;
  if (args[0] === "mcp") return help.mcp;
  if (args[0] !== "doc") return globalHelp;
  if (args[1] === "list") return help.list;
  if (args[1] === "export") return help.export;
  if (args[1] === "reconcile") return help.reconcile;
  return help.doc;
};
const main = async () => {
  const selectedCommand = args[0];
  if (!selectedCommand || selectedCommand === "help" || isHelpRequested()) { process.stdout.write(helpFor()); return; }
  const service = await serviceFor();
  if (selectedCommand === "init") { process.stdout.write(`Initialized visual workspace in ${workspace()}\n`); return; }
  if (selectedCommand === "demo") { const snapshot = await seedFeaturePlan(service); process.stdout.write(`Created demo document ${snapshot.document.id}\n`); return; }
  if (selectedCommand === "serve") { const rawPort = option("--port"); const port = rawPort ? Number(rawPort) : undefined; const running = await startHttpServer(service, { port, allowLan: args.includes("--lan") }); process.stdout.write(`Visual Workspace API listening at ${running.url}\nWorkspace: ${workspace()}\n`); return; }
  if (selectedCommand === "mcp") { startMcpServer(service); return; }
  if (selectedCommand === "doc" && args[1] === "list") { process.stdout.write(`${JSON.stringify(await service.listDocuments(), null, 2)}\n`); return; }
  if (selectedCommand === "doc" && args[1] === "export" && args[2]) { process.stdout.write(`${(await service.exportDocument(args[2])).markdown}`); return; }
  if (selectedCommand === "doc" && args[1] === "reconcile" && args[2]) { const snapshot = await service.reconcileDocument(args[2], commandActor()); process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`); return; }
  process.stderr.write(globalHelp); process.exitCode = 1;
};
main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
