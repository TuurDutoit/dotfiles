import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { safeStaticFile, startHttpServer, type RunningHttpServer } from "../src/http.js";
import { callMcpTool, mcpTools } from "../src/mcp.js";
import { WorkspaceService } from "../src/service.js";
import { FileWorkspaceStore } from "../src/storage.js";
import type { Actor } from "../src/domain.js";

const human: Actor = { kind: "human", id: "tuur", displayName: "Tuur" };
const agents: RunningHttpServer[] = [];
afterEach(async () => { await Promise.all(agents.splice(0).map((server) => server.close())); });
const fixture = async () => { const root = await mkdtemp(join(tmpdir(), "visual-workspace-adapter-")); const service = new WorkspaceService(new FileWorkspaceStore(root)); await service.initialize(); return service; };
const json = async (response: Response) => response.json() as Promise<Record<string, unknown>>;

describe("HTTP adapter", () => {
  it("serves a revision-safe document and comment workflow on loopback", async () => {
    const service = await fixture(); const running = await startHttpServer(service, { port: 0 }); agents.push(running);
    expect(running.url.startsWith("http://127.0.0.1:")).toBe(true);
    expect((await json(await fetch(`${running.url}/health`))).ok).toBe(true);
    const created = await fetch(`${running.url}/api/documents`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Plan", actor: human }) });
    expect(created.status).toBe(201); const snapshot = await json(created); const document = snapshot.document as { id: string; revision: number };
    const createBlock = { expectedRevision: document.revision, actor: human, operations: [{ op: "createBlock", block: { id: randomUUID(), type: "overview", title: "Outcome", content: "Ship it", props: {} }, afterBlockId: null }] };
    const patched = await fetch(`${running.url}/api/documents/${document.id}/patch`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(createBlock) });
    expect(patched.status).toBe(200); const afterPatch = await json(patched); const block = ((afterPatch.document as { blocks: Array<{ id: string }> }).blocks[0]); if (!block) throw new Error("missing block");
    const commented = await fetch(`${running.url}/api/documents/${document.id}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anchor: { blockId: block.id, targetKind: "block" }, body: "Add a metric", actor: human }) });
    expect(commented.status).toBe(201); const thread = await json(commented);
    const replies = await fetch(`${running.url}/api/documents/${document.id}/comments/${thread.id}/replies`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: "Acknowledged", actor: { kind: "agent", id: "codex", displayName: "Codex", client: "codex" } }) });
    expect(replies.status).toBe(201);
    const stale = await fetch(`${running.url}/api/documents/${document.id}/patch`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...createBlock, operations: [{ op: "updateBlock", blockId: block.id, expectedBlockRevision: 1, changes: { content: "overwrite" } }] }) });
    expect(stale.status).toBe(409); expect((await json(stale)).error).toMatchObject({ code: "review_required" });
  });
  it("returns validation errors and refuses LAN hosts without opt-in", async () => {
    const service = await fixture();
    await expect(startHttpServer(service, { host: "0.0.0.0", port: 0 })).rejects.toThrow("require --lan");
    const running = await startHttpServer(service, { port: 0 }); agents.push(running);
    const response = await fetch(`${running.url}/api/documents/not-a-uuid`);
    expect(response.status).toBe(400); expect((await json(response)).error).toMatchObject({ code: "validation_error" });
  });
  it("restores an externally edited projection only through the explicit API reconcile flow", async () => {
    const service = await fixture(); const snapshot = await service.createDocument({ title: "Reconcile API", actor: human });
    const projectionPath = join(service.store.root, ".visual-workspace", "documents", snapshot.document.id, "document.md");
    await writeFile(projectionPath, "# external raw edit\n");
    const running = await startHttpServer(service, { port: 0 }); agents.push(running);
    const marked = await fetch(`${running.url}/api/documents/${snapshot.document.id}`);
    expect(((await json(marked)).document as { status: string }).status).toBe("needs_reconcile");
    const reconciled = await fetch(`${running.url}/api/documents/${snapshot.document.id}/reconcile`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ actor: human }) });
    expect(reconciled.status).toBe(200); expect(((await json(reconciled)).document as { status: string }).status).toBe("active");
    expect(await readFile(projectionPath, "utf8")).not.toContain("external raw edit");
  });
  it("serves a built browser safely with an SPA fallback", async () => {
    const service = await fixture(); const staticDir = await mkdtemp(join(tmpdir(), "visual-workspace-static-"));
    await mkdir(join(staticDir, "assets")); await writeFile(join(staticDir, "index.html"), "<main>Visual Workspace</main>"); await writeFile(join(staticDir, "assets", "app.js"), "console.log('workspace')");
    const running = await startHttpServer(service, { port: 0, staticDir }); agents.push(running);
    expect(await (await fetch(`${running.url}/review/plan`)).text()).toContain("Visual Workspace");
    expect((await fetch(`${running.url}/assets/app.js`)).headers.get("content-type")).toContain("text/javascript");
    expect(safeStaticFile(staticDir, "/assets/../../secret")).toBeUndefined();
    expect((await fetch(`${running.url}/assets/missing.js`)).status).toBe(404);
  });
});

describe("MCP adapter", () => {
  it("exposes focused workspace tools over the shared service", async () => {
    const service = await fixture();
    expect(mcpTools.map((item) => item.name)).toContain("workspace_create_document");
    const created = await callMcpTool(service, "workspace_create_document", { title: "MCP plan", actor: human });
    const createdText = (created as { content: Array<{ text: string }> }).content[0]?.text;
    if (!createdText) throw new Error("missing MCP creation content");
    const snapshot = JSON.parse(createdText) as { document: { id: string; title: string } };
    expect(snapshot.document.title).toBe("MCP plan");
    expect(mcpTools.map((item) => item.name)).toContain("workspace_apply_patch");
    const result = await callMcpTool(service, "workspace_get_document", { documentId: snapshot.document.id });
    const content = (result as { content: Array<{ text: string }> }).content[0];
    expect(content?.text).toContain("MCP plan");
  });
  it("reconciles a raw projection through the MCP surface", async () => {
    const service = await fixture(); const snapshot = await service.createDocument({ title: "MCP reconcile", actor: human });
    const root = service.store.root;
    const projectionPath = join(root, ".visual-workspace", "documents", snapshot.document.id, "document.md");
    await writeFile(projectionPath, "# manually edited\n");
    expect((await service.getDocument(snapshot.document.id)).document.status).toBe("needs_reconcile");
    const result = await callMcpTool(service, "workspace_reconcile_document", { documentId: snapshot.document.id, actor: human });
    const text = (result as { content: Array<{ text: string }> }).content[0]?.text;
    expect(text).toContain('"status": "active"');
  });
});
