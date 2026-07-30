import { describe, expect, it } from "vitest";
import { WorkspaceDrafts, type DraftStorage } from "../web/src/drafts.js";
import type { Anchor } from "../web/src/types.js";

class MemoryStorage implements DraftStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const anchor: Anchor = { blockId: "block-1", targetKind: "diagram-node", targetId: "api" };

describe("WorkspaceDrafts", () => {
  it("keeps a block draft and its original revision across a reload", () => {
    const storage = new MemoryStorage();
    const drafts = new WorkspaceDrafts(storage);
    drafts.setBlock("doc-1", "block-1", { title: "Local title", content: "Local content", baseDocumentRevision: 3, baseBlockRevision: 2 });

    expect(new WorkspaceDrafts(storage).getBlock("doc-1", "block-1")).toEqual({ title: "Local title", content: "Local content", baseDocumentRevision: 3, baseBlockRevision: 2 });
  });

  it("keeps comment and reply drafts isolated by their document and target", () => {
    const drafts = new WorkspaceDrafts(new MemoryStorage());
    drafts.setComment("doc-1", anchor, "Ask about retries");
    drafts.setReply("doc-1", "thread-1", "I prefer explicit retry");

    expect(drafts.getComment("doc-1", anchor)).toBe("Ask about retries");
    expect(drafts.getComment("doc-2", anchor)).toBe("");
    expect(drafts.getReply("doc-1", "thread-1")).toBe("I prefer explicit retry");
    drafts.clearComment("doc-1", anchor);
    drafts.clearReply("doc-1", "thread-1");
    expect(drafts.getComment("doc-1", anchor)).toBe("");
    expect(drafts.getReply("doc-1", "thread-1")).toBe("");
  });
});
