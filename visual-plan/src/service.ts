import { randomUUID } from "node:crypto";
import { z } from "zod";
import { anchorSchema, actorSchema, blockSchema, commentSchema, documentSchema, messageSchema, patchRequestSchema, type Actor, type Block, type CommentThread, type PatchRequest, type RevisionEvent, type WorkspaceDocument } from "./domain.js";
import { FileWorkspaceStore, StorageError, sha256 } from "./storage.js";

export class NotFoundError extends Error {}
export class ReviewRequiredError extends Error {
  constructor(readonly conflict: { currentRevision: number; touchedBlockIds: string[]; reason: string }) { super(conflict.reason); }
}
export type Snapshot = { document: WorkspaceDocument; comments: CommentThread[]; revisions: RevisionEvent[]; uiState: Record<string, unknown> };
const now = () => new Date().toISOString();
const reorder = (blocks: Block[]): Block[] => blocks.map((block, order) => ({ ...block, order }));
const markdown = (document: WorkspaceDocument) => `# ${document.title}\n\n${document.blocks.slice().sort((a, b) => a.order - b.order).map((block) => `## ${block.title}\n\n${block.content}`).join("\n\n")}\n`;

export class WorkspaceService {
  constructor(readonly store: FileWorkspaceStore) {}
  async initialize() { await this.store.initialize(); }
  private async state(id: string): Promise<Snapshot> {
    let state: Snapshot;
    try { state = await this.store.load(id); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new NotFoundError(`Document ${id} was not found`); throw e; }
    const projection = await this.store.readProjection(id).catch(() => "");
    if (projection && sha256(projection) !== state.document.sourceHash && state.document.status !== "needs_reconcile") {
      state.document = { ...state.document, status: "needs_reconcile", updatedAt: now() };
    }
    return state;
  }
  private async mutate<T>(id: string, work: (state: Snapshot) => Promise<T>): Promise<T> {
    return this.store.withDocumentLock(id, async () => work(await this.state(id)));
  }
  private async persist(state: Snapshot) {
    if (state.document.status !== "active") { await this.store.save(state); return; }
    const projection = markdown(state.document);
    state.document = { ...state.document, sourceHash: sha256(projection) };
    await this.store.save(state); await this.store.writeProjection(state.document.id, projection);
  }
  async createDocument(input: { title: string; actor: Actor; blocks?: Array<Omit<Block, "revision" | "createdAt" | "updatedAt" | "author" | "order">> }): Promise<Snapshot> {
    const actor = actorSchema.parse(input.actor); const createdAt = now(); const id = randomUUID();
    const blocks = (input.blocks ?? []).map((block, order) => blockSchema.parse({ ...block, order, revision: 1, createdAt, updatedAt: createdAt, author: actor }));
    const document = documentSchema.parse({ schemaVersion: 1, id, title: z.string().min(1).max(300).parse(input.title), revision: 1, status: "active", blocks, createdAt, updatedAt: createdAt, lastEditedBy: actor, sourceHash: "0".repeat(64), conflicts: [] });
    const state: Snapshot = { document, comments: [], revisions: [{ revision: 1, at: createdAt, actor, touchedBlockIds: blocks.map((b) => b.id), touchedCommentIds: [], operation: "create_document" }], uiState: {} };
    await this.store.withDocumentLock(id, async () => {
      if (await this.store.exists(id)) throw new StorageError("Document id already exists");
      await this.persist(state);
    });
    return state;
  }
  async getDocument(id: string) { return this.state(id); }
  async listDocuments() {
    const ids = await this.store.listIds();
    const documents = await Promise.all(ids.map(async (id) => (await this.state(id)).document));
    return documents.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
  async setUiState(id: string, uiState: Record<string, unknown>) {
    return this.mutate(id, async (state) => { state.uiState = uiState; await this.persist(state); return state; });
  }
  async deleteDocument(id: string) { await this.mutate(id, async () => { await this.store.delete(id); }); }
  async exportDocument(id: string) { const state = await this.state(id); return { markdown: await this.store.readProjection(id), document: state.document }; }
  async getChanges(id: string, sinceRevision: number) {
    const state = await this.state(id);
    const revisions = state.revisions.filter((event) => event.revision > sinceRevision);
    const changedCommentIds = new Set(revisions.flatMap((event) => event.touchedCommentIds));
    return { currentRevision: state.document.revision, revisions, blocks: state.document.blocks, comments: state.comments.filter((thread) => changedCommentIds.has(thread.id)) };
  }
  private recordRevision(state: Snapshot, input: { actor: Actor; operation: string; touchedBlockIds?: string[]; touchedCommentIds?: string[]; summary?: string }) {
    const at = now(); const actor = actorSchema.parse(input.actor); const revision = state.document.revision + 1;
    state.document = { ...state.document, revision, updatedAt: at, lastEditedBy: actor };
    state.revisions.push({ revision, at, actor, summary: input.summary, touchedBlockIds: input.touchedBlockIds ?? [], touchedCommentIds: input.touchedCommentIds ?? [], operation: input.operation });
  }
  private async conflict(state: Snapshot, request: PatchRequest, ids: string[], reason: string): Promise<ReviewRequiredError> {
    const conflict = {
      id: randomUUID(), at: now(), expectedRevision: request.expectedRevision, currentRevision: state.document.revision,
      touchedBlockIds: ids, reason, actor: request.actor,
      intent: { summary: request.summary, operations: request.operations },
    };
    state.document = { ...state.document, conflicts: [...state.document.conflicts, conflict] };
    await this.store.save(state);
    return new ReviewRequiredError({ currentRevision: state.document.revision, touchedBlockIds: ids, reason });
  }
  async applyPatch(id: string, raw: PatchRequest): Promise<Snapshot> {
    const request = patchRequestSchema.parse(raw);
    return this.mutate(id, async (state) => {
    if (state.document.status === "needs_reconcile") throw new ReviewRequiredError({ currentRevision: state.document.revision, touchedBlockIds: [], reason: "Raw projection requires reconciliation" });
    const byId = new Map(state.document.blocks.map((block) => [block.id, block]));
    const touched = request.operations.flatMap((operation) => operation.op === "createBlock" ? [] : [operation.blockId]);
    const stale = request.expectedRevision !== state.document.revision;
    // Comment and UI-adjacent revisions advance the document revision but do not
    // change a block's revision. They must not turn a safe block-level rebase
    // into a conflict merely because feedback arrived while an agent drafted.
    const changedSince = new Set(state.revisions
      .filter((event) => event.revision > request.expectedRevision && /(?:^|,)(?:createBlock|updateBlock|deleteBlock|moveBlock)(?:,|$)/.test(event.operation))
      .flatMap((event) => event.touchedBlockIds));
    const orderingChanged = state.revisions.some((event) => event.revision > request.expectedRevision && event.operation === "moveBlock");
    if (request.expectedRevision > state.document.revision) throw await this.conflict(state, request, touched, "Patch is based on a future revision");
    for (const operation of request.operations) {
      if (operation.op === "createBlock") { if (byId.has(operation.block.id)) throw await this.conflict(state, request, [operation.block.id], "Block id already exists"); if (stale && orderingChanged && operation.afterBlockId !== undefined) throw await this.conflict(state, request, [], "Ordering changed since this patch was drafted"); continue; }
      const current = byId.get(operation.blockId);
      if (!current) throw await this.conflict(state, request, [operation.blockId], "Target block was deleted");
      if (current.revision !== operation.expectedBlockRevision || (stale && changedSince.has(operation.blockId))) throw await this.conflict(state, request, [operation.blockId], "Target block changed since this patch was drafted");
      if (operation.op === "moveBlock" && operation.afterBlockId && !byId.has(operation.afterBlockId)) throw await this.conflict(state, request, [operation.afterBlockId], "Move target does not exist");
    }
    const revision = state.document.revision + 1; let blocks = [...state.document.blocks]; const stamp = now();
    for (const operation of request.operations) {
      if (operation.op === "createBlock") {
        const block = blockSchema.parse({ ...operation.block, revision, createdAt: stamp, updatedAt: stamp, author: request.actor, order: blocks.length });
        const insertAfter = operation.afterBlockId === undefined ? blocks.length - 1 : operation.afterBlockId === null ? -1 : blocks.findIndex((item) => item.id === operation.afterBlockId);
        blocks.splice(insertAfter + 1, 0, block);
      } else if (operation.op === "updateBlock") {
        blocks = blocks.map((block) => block.id === operation.blockId ? { ...block, ...operation.changes, revision, updatedAt: stamp, author: request.actor } : block);
      } else if (operation.op === "deleteBlock") {
        blocks = blocks.filter((block) => block.id !== operation.blockId);
        state.comments = state.comments.map((thread) => thread.anchor.blockId === operation.blockId ? { ...thread, status: "orphaned" as const } : thread);
      } else {
        const index = blocks.findIndex((block) => block.id === operation.blockId); const [moving] = blocks.splice(index, 1); if (!moving) throw new StorageError("Missing moved block");
        const target = operation.afterBlockId === null ? -1 : blocks.findIndex((block) => block.id === operation.afterBlockId); blocks.splice(target + 1, 0, { ...moving, revision, updatedAt: stamp, author: request.actor });
      }
    }
    blocks = reorder(blocks);
    state.document = { ...state.document, revision, blocks, updatedAt: stamp, lastEditedBy: request.actor };
    state.revisions.push({ revision, at: stamp, actor: request.actor, summary: request.summary, touchedBlockIds: [...new Set(touched)], touchedCommentIds: [], operation: request.operations.map((operation) => operation.op).join(",") });
    await this.persist(state); return state;
    });
  }
  async createComment(id: string, input: { anchor: CommentThread["anchor"]; body: string; actor: Actor }) {
    const anchor = anchorSchema.parse(input.anchor); const actor = actorSchema.parse(input.actor);
    return this.mutate(id, async (state) => {
      if (!state.document.blocks.some((block) => block.id === anchor.blockId)) throw new NotFoundError("Anchor block was not found");
      const createdAt = now(); const thread = commentSchema.parse({ id: randomUUID(), anchor, status: "open", createdBy: actor, createdAt, messages: [{ id: randomUUID(), body: input.body, author: actor, createdAt }] }); state.comments.push(thread);
      this.recordRevision(state, { actor, operation: "create_comment", touchedBlockIds: [anchor.blockId], touchedCommentIds: [thread.id], summary: `Created comment thread ${thread.id}` });
      await this.persist(state); return thread;
    });
  }
  async listComments(id: string, unresolvedOnly = false) { const state = await this.state(id); return unresolvedOnly ? state.comments.filter((thread) => thread.status === "open") : state.comments; }
  async replyComment(id: string, threadId: string, input: { body: string; actor: Actor }) {
    const actor = actorSchema.parse(input.actor);
    return this.mutate(id, async (state) => {
      const index = state.comments.findIndex((thread) => thread.id === threadId); if (index < 0) throw new NotFoundError("Comment thread was not found");
      const message = messageSchema.parse({ id: randomUUID(), body: input.body, author: actor, createdAt: now() }); const existing = state.comments[index]; if (!existing) throw new NotFoundError("Comment thread was not found"); state.comments[index] = { ...existing, messages: [...existing.messages, message] };
      this.recordRevision(state, { actor, operation: "reply_comment", touchedBlockIds: [existing.anchor.blockId], touchedCommentIds: [existing.id], summary: `Replied to comment thread ${existing.id}` });
      await this.persist(state); return state.comments[index];
    });
  }
  async setCommentStatus(id: string, threadId: string, status: "resolved" | "open", actor: Actor) {
    const parsedActor = actorSchema.parse(actor);
    return this.mutate(id, async (state) => {
      const index = state.comments.findIndex((thread) => thread.id === threadId); if (index < 0) throw new NotFoundError("Comment thread was not found"); const existing = state.comments[index]; if (!existing) throw new NotFoundError("Comment thread was not found");
      if (existing.status === "orphaned" && status === "open") throw new ReviewRequiredError({ currentRevision: state.document.revision, touchedBlockIds: [existing.anchor.blockId], reason: "Orphaned comments must be re-anchored before reopening" }); state.comments[index] = status === "resolved" ? { ...existing, status, resolvedAt: now(), resolvedBy: parsedActor } : { ...existing, status, resolvedAt: undefined, resolvedBy: undefined };
      this.recordRevision(state, { actor: parsedActor, operation: status === "resolved" ? "resolve_comment" : "reopen_comment", touchedBlockIds: [existing.anchor.blockId], touchedCommentIds: [existing.id], summary: `${status === "resolved" ? "Resolved" : "Reopened"} comment thread ${existing.id}` });
      await this.persist(state); return state.comments[index];
    });
  }
  async reconcileDocument(id: string, actor: Actor) {
    const parsedActor = actorSchema.parse(actor);
    return this.mutate(id, async (state) => {
      if (state.document.status !== "needs_reconcile") throw new ReviewRequiredError({ currentRevision: state.document.revision, touchedBlockIds: [], reason: "Document does not require reconciliation" });
      documentSchema.parse(state.document);
      const blockIds = new Set(state.document.blocks.map((block) => block.id));
      for (const thread of state.comments) {
        commentSchema.parse(thread);
        if (thread.status !== "orphaned" && !blockIds.has(thread.anchor.blockId)) throw new ReviewRequiredError({ currentRevision: state.document.revision, touchedBlockIds: [thread.anchor.blockId], reason: "A comment anchor no longer points to a canonical block" });
      }
      state.document = { ...state.document, status: "active" };
      this.recordRevision(state, { actor: parsedActor, operation: "reconcile_projection", touchedBlockIds: state.document.blocks.map((block) => block.id), summary: "Restored the canonical Markdown projection after a raw edit" });
      await this.persist(state);
      const restored = await this.store.readProjection(id);
      if (sha256(restored) !== state.document.sourceHash) throw new StorageError("Canonical projection could not be restored safely");
      return state;
    });
  }
  async scopedContext(id: string, input: { blockId?: string; threadId?: string }) { const state = await this.state(id); const thread = input.threadId ? state.comments.find((item) => item.id === input.threadId) : undefined; const blockId = input.blockId ?? thread?.anchor.blockId; return { documentId: id, revision: state.document.revision, block: blockId ? state.document.blocks.find((block) => block.id === blockId) : undefined, thread, unresolvedComments: state.comments.filter((comment) => comment.status === "open") }; }
}
