import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { anchorSchema, patchRequestSchema, type Actor } from "../src/domain.js";
import { seedFeaturePlan, demoAgent } from "../src/demo.js";
import { FileWorkspaceStore, StorageError } from "../src/storage.js";
import { ReviewRequiredError, WorkspaceService } from "../src/service.js";

const human: Actor = { kind: "human", id: "tuur", displayName: "Tuur" };
async function fixture() { const root = await mkdtemp(join(tmpdir(), "visual-workspace-")); const service = new WorkspaceService(new FileWorkspaceStore(root)); await service.initialize(); return { root, service, demo: await seedFeaturePlan(service) }; }

describe("domain boundaries", () => {
  it("rejects malformed anchors and patches", () => {
    expect(() => anchorSchema.parse({ blockId: randomUUID(), targetKind: "diagram-node" })).toThrow();
    expect(() => patchRequestSchema.parse({ expectedRevision: 1, actor: human, operations: [{ op: "replaceEverything" }] })).toThrow();
  });
  it("rejects unsafe document ids", async () => {
    const store = new FileWorkspaceStore(await mkdtemp(join(tmpdir(), "visual-workspace-")));
    await expect(store.load("../../secret")).rejects.toBeInstanceOf(StorageError);
  });
});

describe("workspace lifecycle", () => {
  it("persists seeded documents, provenance, and ui state", async () => {
    const { service, demo } = await fixture();
    await service.setUiState(demo.document.id, { selectedBlockId: demo.document.blocks[0]?.id });
    const reload = await service.getDocument(demo.document.id);
    expect(reload.document.blocks).toHaveLength(7);
    expect(reload.revisions[0]?.operation).toBe("create_document");
    expect(reload.uiState).toEqual({ selectedBlockId: demo.document.blocks[0]?.id });
    expect((await service.listDocuments()).map((document) => document.id)).toContain(demo.document.id);
  });
  it("keeps semantic anchors stable through updates and moves", async () => {
    const { service, demo } = await fixture(); const graph = demo.document.blocks.find((block) => block.type === "architecture"); if (!graph) throw new Error("missing graph");
    const thread = await service.createComment(demo.document.id, { actor: human, body: "Clarify retry", anchor: { blockId: graph.id, targetKind: "diagram-node", targetId: "api" } });
    await service.applyPatch(demo.document.id, { expectedRevision: 2, actor: demoAgent, operations: [{ op: "updateBlock", blockId: graph.id, expectedBlockRevision: 1, changes: { title: "Request data flow" } }] });
    const after = await service.applyPatch(demo.document.id, { expectedRevision: 3, actor: demoAgent, operations: [{ op: "moveBlock", blockId: graph.id, expectedBlockRevision: 3, afterBlockId: null }] });
    expect(after.comments.find((item) => item.id === thread.id)?.anchor).toEqual(thread.anchor);
  });
  it("rebases stale non-overlapping patches but protects overlapping human content", async () => {
    const { service, demo } = await fixture(); const [first, second] = demo.document.blocks;
    if (!first || !second) throw new Error("missing blocks");
    await service.applyPatch(demo.document.id, { expectedRevision: 1, actor: human, operations: [{ op: "updateBlock", blockId: first.id, expectedBlockRevision: 1, changes: { content: "Human outcome" } }] });
    const rebased = await service.applyPatch(demo.document.id, { expectedRevision: 1, actor: demoAgent, operations: [{ op: "updateBlock", blockId: second.id, expectedBlockRevision: 1, changes: { content: "Agent graph notes" } }] });
    expect(rebased.document.blocks.find((block) => block.id === first.id)?.content).toBe("Human outcome");
    expect(rebased.document.blocks.find((block) => block.id === second.id)?.content).toBe("Agent graph notes");
    await expect(service.applyPatch(demo.document.id, { expectedRevision: 1, actor: demoAgent, operations: [{ op: "updateBlock", blockId: first.id, expectedBlockRevision: 1, changes: { content: "Unsafe overwrite" } }] })).rejects.toBeInstanceOf(ReviewRequiredError);
    expect((await service.getDocument(demo.document.id)).document.blocks.find((block) => block.id === first.id)?.content).toBe("Human outcome");
  });
  it("serializes concurrent stale writers from independent services and preserves both intents", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-workspace-"));
    const firstService = new WorkspaceService(new FileWorkspaceStore(root));
    const secondService = new WorkspaceService(new FileWorkspaceStore(root));
    await Promise.all([firstService.initialize(), secondService.initialize()]);
    const demo = await seedFeaturePlan(firstService);
    const target = demo.document.blocks[0];
    if (!target) throw new Error("missing target block");
    const firstRequest = {
      expectedRevision: 1,
      actor: { kind: "agent" as const, id: "first-agent", displayName: "First agent", client: "codex" as const },
      summary: "First agent outcome",
      operations: [{ op: "updateBlock" as const, blockId: target.id, expectedBlockRevision: 1, changes: { content: "First agent's intent" } }],
    };
    const secondRequest = {
      expectedRevision: 1,
      actor: { kind: "agent" as const, id: "second-agent", displayName: "Second agent", client: "claude-code" as const },
      summary: "Second agent outcome",
      operations: [{ op: "updateBlock" as const, blockId: target.id, expectedBlockRevision: 1, changes: { content: "Second agent's intent" } }],
    };

    const outcomes = await Promise.allSettled([
      firstService.applyPatch(demo.document.id, firstRequest),
      secondService.applyPatch(demo.document.id, secondRequest),
    ]);
    const rejected = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
    const accepted = outcomes.find((outcome): outcome is PromiseFulfilledResult<Awaited<ReturnType<WorkspaceService["applyPatch"]>>> => outcome.status === "fulfilled");
    expect(rejected?.reason).toBeInstanceOf(ReviewRequiredError);
    expect(accepted).toBeDefined();

    const persisted = await firstService.getDocument(demo.document.id);
    const conflict = persisted.document.conflicts[0];
    expect(persisted.document.revision).toBe(2);
    expect(conflict?.reason).toContain("Target block changed");
    const losingRequest = conflict?.actor.id === firstRequest.actor.id ? firstRequest : secondRequest;
    const winningRequest = conflict?.actor.id === firstRequest.actor.id ? secondRequest : firstRequest;
    expect(conflict?.intent).toEqual({ summary: losingRequest.summary, operations: losingRequest.operations });
    const winningOperation = winningRequest.operations[0];
    if (!winningOperation || winningOperation.op !== "updateBlock") throw new Error("missing winning block update");
    expect(persisted.document.blocks.find((block) => block.id === target.id)?.content).toBe(winningOperation.changes.content);
  });
  it("supports comment reply, resolve, and reopen", async () => {
    const { service, demo } = await fixture(); const block = demo.document.blocks[0]; if (!block) throw new Error("missing block");
    const thread = await service.createComment(demo.document.id, { actor: human, body: "Please add a metric", anchor: { blockId: block.id, targetKind: "block" } });
    await service.replyComment(demo.document.id, thread.id, { actor: demoAgent, body: "I will add it to the outcome." });
    await service.setCommentStatus(demo.document.id, thread.id, "resolved", human);
    const reopened = await service.setCommentStatus(demo.document.id, thread.id, "open", human);
    expect(reopened.status).toBe("open"); expect(reopened.messages).toHaveLength(2);
  });
  it("records feedback as revision events that agents can discover through changes", async () => {
    const { service, demo } = await fixture(); const block = demo.document.blocks[0]; if (!block) throw new Error("missing block");
    const thread = await service.createComment(demo.document.id, { actor: human, body: "Please add a metric", anchor: { blockId: block.id, targetKind: "block" } });
    const created = await service.getChanges(demo.document.id, 1);
    expect(created.currentRevision).toBe(2); expect(created.revisions[0]).toMatchObject({ operation: "create_comment", touchedBlockIds: [block.id], touchedCommentIds: [thread.id] });
    expect(created.comments).toEqual([thread]);
    await service.replyComment(demo.document.id, thread.id, { actor: demoAgent, body: "I will add it." });
    await service.setCommentStatus(demo.document.id, thread.id, "resolved", human);
    const status = await service.setCommentStatus(demo.document.id, thread.id, "open", human);
    const changes = await service.getChanges(demo.document.id, 2);
    expect(changes.revisions.map((event) => event.operation)).toEqual(["reply_comment", "resolve_comment", "reopen_comment"]);
    expect(changes.comments).toEqual([status]);
  });
  it("marks external projection edits for reconciliation without touching anchors", async () => {
    const { root, service, demo } = await fixture(); const block = demo.document.blocks[0]; if (!block) throw new Error("missing block");
    const thread = await service.createComment(demo.document.id, { actor: human, body: "Keep this", anchor: { blockId: block.id, targetKind: "block" } });
    const projectionPath = join(root, ".visual-workspace", "documents", demo.document.id, "document.md");
    await writeFile(projectionPath, `${await readFile(projectionPath, "utf8")}External raw edit\n`);
    const after = await service.getDocument(demo.document.id);
    expect(after.document.status).toBe("needs_reconcile"); expect(after.comments.find((item) => item.id === thread.id)?.anchor.blockId).toBe(block.id);
  });
  it("safely restores the canonical projection before clearing reconciliation", async () => {
    const { root, service, demo } = await fixture(); const block = demo.document.blocks[0]; if (!block) throw new Error("missing block");
    const thread = await service.createComment(demo.document.id, { actor: human, body: "Keep this anchor", anchor: { blockId: block.id, targetKind: "block" } });
    const projectionPath = join(root, ".visual-workspace", "documents", demo.document.id, "document.md");
    await writeFile(projectionPath, `${await readFile(projectionPath, "utf8")}External raw edit\n`);
    expect((await service.getDocument(demo.document.id)).document.status).toBe("needs_reconcile");
    const reconciled = await service.reconcileDocument(demo.document.id, human);
    expect(reconciled.document.status).toBe("active");
    expect(reconciled.revisions.at(-1)).toMatchObject({ operation: "reconcile_projection", touchedBlockIds: reconciled.document.blocks.map((item) => item.id) });
    expect(await readFile(projectionPath, "utf8")).not.toContain("External raw edit");
    expect(reconciled.comments.find((item) => item.id === thread.id)?.anchor).toEqual(thread.anchor);
    await expect(service.applyPatch(demo.document.id, { expectedRevision: reconciled.document.revision, actor: demoAgent, operations: [{ op: "updateBlock", blockId: block.id, expectedBlockRevision: block.revision, changes: { content: "Safe after reconcile" } }] })).resolves.toBeDefined();
  });
});
