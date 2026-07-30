import type { Anchor } from "./types.js";

export type BlockDraft = {
  title: string;
  content: string;
  baseDocumentRevision: number;
  baseBlockRevision: number;
};

export type DraftStorage = Pick<Storage, "getItem" | "setItem">;

type StoredDrafts = {
  blocks: Record<string, BlockDraft>;
  comments: Record<string, string>;
  replies: Record<string, string>;
};

const storageKey = "visual-workspace.unsaved-drafts.v1";
const emptyDrafts = (): StoredDrafts => ({ blocks: {}, comments: {}, replies: {} });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isBlockDraft = (value: unknown): value is BlockDraft => isRecord(value)
  && typeof value.title === "string"
  && typeof value.content === "string"
  && typeof value.baseDocumentRevision === "number"
  && typeof value.baseBlockRevision === "number";
const isTextMap = (value: unknown): value is Record<string, string> => isRecord(value) && Object.values(value).every((item) => typeof item === "string");
const isBlockMap = (value: unknown): value is Record<string, BlockDraft> => isRecord(value) && Object.values(value).every(isBlockDraft);

const readStoredDrafts = (storage: DraftStorage | undefined): StoredDrafts => {
  if (!storage) return emptyDrafts();
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return emptyDrafts();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isBlockMap(parsed.blocks) || !isTextMap(parsed.comments) || !isTextMap(parsed.replies)) return emptyDrafts();
    return { blocks: parsed.blocks, comments: parsed.comments, replies: parsed.replies };
  } catch {
    return emptyDrafts();
  }
};

const compoundKey = (...parts: string[]) => JSON.stringify(parts);
const commentKey = (documentId: string, anchor: Anchor) => compoundKey(documentId, anchor.blockId, anchor.targetKind, anchor.targetId ?? "");

/** Keeps local form drafts across rerenders and browser refreshes without sending them to the workspace service. */
export class WorkspaceDrafts {
  private readonly drafts: StoredDrafts;

  constructor(private readonly storage?: DraftStorage) {
    this.drafts = readStoredDrafts(storage);
  }

  getBlock(documentId: string, blockId: string) { return this.drafts.blocks[compoundKey(documentId, blockId)]; }
  setBlock(documentId: string, blockId: string, draft: BlockDraft) { this.drafts.blocks[compoundKey(documentId, blockId)] = draft; this.persist(); }
  clearBlock(documentId: string, blockId: string) { delete this.drafts.blocks[compoundKey(documentId, blockId)]; this.persist(); }

  getComment(documentId: string, anchor: Anchor) { return this.drafts.comments[commentKey(documentId, anchor)] ?? ""; }
  setComment(documentId: string, anchor: Anchor, body: string) { this.setText(this.drafts.comments, commentKey(documentId, anchor), body); }
  clearComment(documentId: string, anchor: Anchor) { this.clearText(this.drafts.comments, commentKey(documentId, anchor)); }

  getReply(documentId: string, threadId: string) { return this.drafts.replies[compoundKey(documentId, threadId)] ?? ""; }
  setReply(documentId: string, threadId: string, body: string) { this.setText(this.drafts.replies, compoundKey(documentId, threadId), body); }
  clearReply(documentId: string, threadId: string) { this.clearText(this.drafts.replies, compoundKey(documentId, threadId)); }

  private setText(target: Record<string, string>, key: string, value: string) {
    if (value) target[key] = value;
    else delete target[key];
    this.persist();
  }

  private clearText(target: Record<string, string>, key: string) { delete target[key]; this.persist(); }
  private persist() { try { this.storage?.setItem(storageKey, JSON.stringify(this.drafts)); } catch { /* Draft persistence is a progressive enhancement. */ } }
}
