import "./style.css";
import { api } from "./api";
import { WorkspaceDrafts, type BlockDraft } from "./drafts";
import type { Actor, Anchor, Block, CommentThread, Snapshot, WorkspaceDocument } from "./types";

const human: Actor = { kind: "human", id: "local-reviewer", displayName: "Local reviewer" };
const appRoot = (() => {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("Missing application root");
  return root;
})();

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const button = (label: string, action: () => void | Promise<void>, className = "") => {
  const node = element("button", className, label);
  node.type = "button";
  node.addEventListener("click", () => void action());
  return node;
};
const label = (text: string, field: HTMLElement) => {
  const node = element("label", "field");
  node.append(element("span", "field-label", text), field);
  return node;
};
const asArray = <T extends Record<string, unknown>>(value: unknown): T[] => Array.isArray(value) ? value.filter((item): item is T => typeof item === "object" && item !== null) : [];
const value = (item: Record<string, unknown>, key: string) => typeof item[key] === "string" ? item[key] : "";
const time = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const sessionStorageOrUndefined = () => { try { return window.sessionStorage; } catch { return undefined; } };

type PendingBlockConflict = { blockId: string; message: string; refreshed: boolean };
type MutationOptions = {
  successNotice?: string;
  onSuccess?: () => void;
  conflictBlockId?: string;
};

class WorkspaceApp {
  private documents: WorkspaceDocument[] = [];
  private snapshot: Snapshot | undefined;
  private selectedId = new URLSearchParams(location.search).get("document") ?? "";
  private selectedAnchor: Anchor | undefined;
  private busy = false;
  private notice = "";
  private readonly drafts = new WorkspaceDrafts(sessionStorageOrUndefined());
  private pendingConflict: PendingBlockConflict | undefined;

  async start() {
    try {
      this.documents = await api.documents();
      if (!this.selectedId) this.selectedId = this.documents[0]?.id ?? "";
      if (this.selectedId) await this.load();
      else this.notice = "No documents yet. Create one with the local CLI, then refresh this page.";
    } catch (error) {
      this.notice = this.errorMessage(error);
    }
    this.render();
  }

  private async load() {
    if (!this.selectedId) return;
    this.snapshot = await api.snapshot(this.selectedId);
    this.documents = this.documents.map((document) => document.id === this.selectedId ? this.snapshot!.document : document);
  }

  private async mutate(action: () => Promise<void>, options: MutationOptions = {}) {
    if (this.busy) return;
    this.busy = true;
    this.render();
    try {
      await action();
      await this.load();
      options.onSuccess?.();
      this.notice = options.successNotice ?? "Saved locally.";
    } catch (error) {
      if (options.conflictBlockId && this.isConflict(error)) this.pendingConflict = { blockId: options.conflictBlockId, message: this.rawErrorMessage(error), refreshed: false };
      this.notice = this.errorMessage(error);
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private rawErrorMessage(error: unknown) { return error instanceof Error ? error.message : "Unexpected request failure"; }
  private isConflict(error: unknown) { return /changed|reconcile|revision|conflict/i.test(this.rawErrorMessage(error)); }
  private errorMessage(error: unknown) {
    const message = this.rawErrorMessage(error);
    return this.isConflict(error) ? `Review required: ${message}. Your local draft is still saved in this browser.` : message;
  }

  private render() {
    appRoot.replaceChildren();
    const shell = element("div", "workspace-shell");
    shell.append(this.header());
    if (!this.snapshot) shell.append(element("main", "empty-state", this.notice || "Loading document…"));
    else shell.append(this.workspace());
    appRoot.append(shell);
  }

  private header() {
    const header = element("header", "topbar");
    const brand = element("div", "brand");
    brand.append(element("span", "eyebrow", "LOCAL REVIEW"), element("strong", "", "Visual Workspace"));
    const selector = element("select", "document-select") as HTMLSelectElement;
    selector.setAttribute("aria-label", "Choose document");
    for (const document of this.documents) {
      const option = element("option", "", document.title) as HTMLOptionElement;
      option.value = document.id; option.selected = document.id === this.selectedId; selector.append(option);
    }
    selector.addEventListener("change", () => void this.mutate(async () => {
      await this.persistUiState();
      this.selectedId = selector.value;
      this.selectedAnchor = undefined;
      this.pendingConflict = undefined;
      history.replaceState({}, "", `?document=${encodeURIComponent(this.selectedId)}`);
      await this.load();
    }, { successNotice: "Opened document. Unsaved local drafts remain available when you return." }));
    header.append(brand, selector, button("Refresh", () => this.refreshDocument(), "secondary"));
    return header;
  }

  private workspace() {
    const snapshot = this.snapshot!;
    const main = element("main", "workspace-grid");
    const canvas = element("section", "canvas", "");
    canvas.setAttribute("aria-label", "Document review surface");
    canvas.append(this.documentMeta(snapshot));
    for (const block of [...snapshot.document.blocks].sort((left, right) => left.order - right.order)) canvas.append(this.blockCard(block));
    const panel = this.commentPanel();
    main.append(canvas, panel);
    return main;
  }

  private documentMeta(snapshot: Snapshot) {
    const { document } = snapshot;
    const meta = element("section", "document-meta");
    meta.append(element("span", "eyebrow", document.status === "active" ? "READY FOR REVIEW" : document.status.replace("_", " ").toUpperCase()), element("h1", "", document.title));
    const details = element("div", "metadata");
    details.append(element("span", "pill", `Revision ${document.revision}`), element("span", "", `Updated ${time(document.updatedAt)} by ${document.lastEditedBy.displayName}`), element("span", "", `${snapshot.comments.filter((thread) => thread.status === "open").length} open threads`));
    meta.append(details);
    if (document.status === "needs_reconcile") meta.append(this.callout("The readable Markdown export changed outside this workspace. Agent patches are paused until the document is reconciled."));
    if (document.conflicts.length) meta.append(this.callout(`${document.conflicts.length} revision conflict${document.conflicts.length === 1 ? "" : "s"} recorded. Review the affected blocks before retrying a patch.`));
    if (this.pendingConflict) meta.append(this.conflictCallout(this.pendingConflict));
    if (this.notice) meta.append(element("p", "notice", this.notice));
    return meta;
  }

  private callout(text: string) { const node = element("p", "callout", text); node.setAttribute("role", "status"); return node; }
  private conflictCallout(conflict: PendingBlockConflict) {
    const node = element("section", "callout draft-conflict");
    node.setAttribute("role", "alert");
    node.append(element("strong", "", "Your edit was not applied."), element("p", "", `${conflict.message} Your unsaved title and content are preserved locally. Refresh the latest block, compare it, then explicitly retry your draft.`));
    const controls = element("div", "conflict-controls");
    const retry = button("Retry preserved draft", () => this.retryConflict(conflict.blockId), "primary");
    retry.disabled = !conflict.refreshed;
    if (!conflict.refreshed) retry.title = "Refresh the latest version before retrying your draft";
    controls.append(button("Refresh latest", () => this.refreshDocument("Latest version loaded. Compare it with your preserved draft, then retry if appropriate."), "secondary"), retry);
    node.append(controls);
    return node;
  }

  private blockCard(block: Block) {
    const card = element("article", "block-card");
    card.id = `block-${block.id}`;
    const heading = element("div", "block-heading");
    heading.append(element("span", "block-type", block.type.replace("-", " ")));
    heading.append(button("Comment", () => this.selectAnchor({ blockId: block.id, targetKind: "block" }), "quiet"));
    card.append(heading);
    const title = element("input", "block-title") as HTMLInputElement;
    const draft = this.drafts.getBlock(this.selectedId, block.id);
    title.value = draft?.title ?? block.title; title.setAttribute("aria-label", `${block.type} title`);
    const content = element("textarea", "block-content") as HTMLTextAreaElement;
    content.value = draft?.content ?? block.content; content.rows = Math.max(3, Math.min(10, content.value.split("\n").length + 1)); content.setAttribute("aria-label", `${block.title} content`);
    const rememberDraft = () => this.rememberBlockDraft(block, title.value, content.value);
    title.addEventListener("input", rememberDraft);
    content.addEventListener("input", rememberDraft);
    card.append(title, content, this.visual(block));
    const footer = element("footer", "block-footer");
    footer.append(element("span", "provenance", `r${block.revision} · ${block.author.displayName}`));
    if (draft) footer.append(element("span", "draft-marker", "Unsaved local draft"));
    footer.append(button("Save block", () => this.saveBlock(block, title.value, content.value), "primary"));
    card.append(footer);
    return card;
  }

  private visual(block: Block) {
    const view = element("div", "visual");
    if (block.type === "architecture") return this.architecture(block, view);
    if (block.type === "file-map") return this.fileMap(block, view);
    if (block.type === "timeline") return this.timeline(block, view);
    if (block.type === "risks") return this.risks(block, view);
    if (block.type === "decision") return this.decision(block, view);
    if (block.type === "code" || block.type === "api-schema") return this.code(block, view);
    return view;
  }

  private architecture(block: Block, view: HTMLDivElement) {
    const nodes = asArray(block.props.nodes); const edges = asArray(block.props.edges);
    if (!nodes.length) return view;
    view.classList.add("architecture");
    const graph = element("div", "graph"); graph.setAttribute("role", "group"); graph.setAttribute("aria-label", "Architecture diagram");
    nodes.forEach((node, index) => {
      const id = value(node, "id"); const nodeButton = button(value(node, "label") || id, () => this.selectAnchor({ blockId: block.id, targetKind: "diagram-node", targetId: id }), "graph-node");
      nodeButton.setAttribute("aria-label", `Comment on diagram node ${value(node, "label") || id}`); graph.append(nodeButton);
      if (index < nodes.length - 1) graph.append(element("span", "graph-arrow", "→"));
    });
    view.append(graph);
    if (edges.length) view.append(element("p", "visual-caption", edges.map((edge) => `${value(edge, "from")} → ${value(edge, "to")}`).join(" · ")));
    return view;
  }

  private fileMap(block: Block, view: HTMLDivElement) {
    const rows = asArray(block.props.rows); if (!rows.length) return view;
    const table = element("table", "file-table");
    table.append(this.row("thead", ["File", "Change", "Feedback"]));
    const body = element("tbody");
    rows.forEach((row) => { const id = value(row, "id"); const tr = element("tr"); tr.append(this.cell("code", value(row, "path")), this.cell("span", value(row, "change")), this.cell("span", "", button("Comment", () => this.selectAnchor({ blockId: block.id, targetKind: "file-row", targetId: id }), "quiet"))); body.append(tr); });
    table.append(body); view.append(table); return view;
  }

  private row(tag: "thead", values: string[]) { const row = element(tag); const tr = element("tr"); values.forEach((item) => tr.append(element("th", "", item))); row.append(tr); return row; }
  private cell<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, child?: HTMLElement) { const node = element("td"); if (child) node.append(child); else node.append(element(tag, "", text)); return node; }

  private timeline(block: Block, view: HTMLDivElement) {
    const milestones = asArray(block.props.milestones); if (!milestones.length) return view;
    const list = element("ol", "timeline");
    milestones.forEach((milestone) => { const id = value(milestone, "id"); const item = element("li"); item.append(button(value(milestone, "label") || id, () => this.selectAnchor({ blockId: block.id, targetKind: "milestone", targetId: id }), "milestone")); list.append(item); });
    view.append(list); return view;
  }

  private risks(block: Block, view: HTMLDivElement) {
    const risks = asArray(block.props.risks); if (!risks.length) return view;
    const list = element("ul", "risk-list");
    risks.forEach((risk) => { const id = value(risk, "id"); const item = element("li"); item.append(button(value(risk, "label") || id, () => this.selectAnchor({ blockId: block.id, targetKind: "risk", targetId: id }), "risk")); list.append(item); });
    view.append(list); return view;
  }

  private decision(block: Block, view: HTMLDivElement) {
    const options = asArray(block.props.options); if (!options.length) return view;
    const list = element("div", "decision-options");
    options.forEach((option) => { const id = value(option, "id"); list.append(button(value(option, "label") || id, () => this.selectAnchor({ blockId: block.id, targetKind: "decision-option", targetId: id }), "decision-option")); });
    view.append(list); return view;
  }

  private code(block: Block, view: HTMLDivElement) {
    const items = asArray(block.props.items); if (!items.length) return view;
    const list = element("ul", "code-list");
    items.forEach((item) => { const id = value(item, "id"); const row = element("li"); row.append(element("code", "", value(item, "label") || id), button("Comment", () => this.selectAnchor({ blockId: block.id, targetKind: "code-item", targetId: id }), "quiet")); list.append(row); });
    view.append(list); return view;
  }

  private rememberBlockDraft(block: Block, title: string, content: string) {
    if (!this.selectedId) return;
    if (title === block.title && content === block.content) { this.drafts.clearBlock(this.selectedId, block.id); return; }
    const existing = this.drafts.getBlock(this.selectedId, block.id);
    const draft: BlockDraft = {
      title,
      content,
      baseDocumentRevision: existing?.baseDocumentRevision ?? this.snapshot?.document.revision ?? 0,
      baseBlockRevision: existing?.baseBlockRevision ?? block.revision,
    };
    this.drafts.setBlock(this.selectedId, block.id, draft);
  }

  private async saveBlock(block: Block, title: string, content: string, useCurrentRevision = false) {
    if (!this.snapshot) return;
    this.rememberBlockDraft(block, title, content);
    const draft = this.drafts.getBlock(this.selectedId, block.id);
    if (!draft) { this.notice = "No block changes to save."; this.render(); return; }
    await this.mutate(async () => {
      await api.patch(this.selectedId, {
        expectedRevision: useCurrentRevision ? this.snapshot!.document.revision : draft.baseDocumentRevision,
        actor: human,
        summary: `Human updated ${block.title}`,
        operations: [{ op: "updateBlock", blockId: block.id, expectedBlockRevision: useCurrentRevision ? block.revision : draft.baseBlockRevision, changes: { title: draft.title, content: draft.content } }],
      });
    }, {
      conflictBlockId: block.id,
      onSuccess: () => {
        this.drafts.clearBlock(this.selectedId, block.id);
        if (this.pendingConflict?.blockId === block.id) this.pendingConflict = undefined;
      },
    });
  }

  private async refreshDocument(successNotice = "Latest document loaded. Any unsaved local drafts are still preserved.") {
    await this.mutate(async () => undefined, {
      successNotice,
      onSuccess: () => { if (this.pendingConflict) this.pendingConflict.refreshed = true; },
    });
  }

  private async retryConflict(blockId: string) {
    const block = this.snapshot?.document.blocks.find((item) => item.id === blockId);
    const draft = this.drafts.getBlock(this.selectedId, blockId);
    if (!block || !draft) {
      this.pendingConflict = undefined;
      this.notice = "The local draft is no longer available. Refresh and start a new edit if it is still needed.";
      this.render();
      return;
    }
    await this.saveBlock(block, draft.title, draft.content, true);
  }

  private selectAnchor(anchor: Anchor) {
    this.selectedAnchor = anchor;
    this.notice = `Comment target selected: ${anchor.targetKind}${anchor.targetId ? ` / ${anchor.targetId}` : ""}.`;
    void this.persistUiState();
    this.render();
  }

  private async persistUiState() {
    if (!this.selectedId) return;
    try { await api.setUiState(this.selectedId, { selectedAnchor: this.selectedAnchor }); } catch { /* UI state is optional; keep review usable if an older adapter lacks it. */ }
  }

  private commentPanel() {
    const panel = element("aside", "comments-panel"); panel.setAttribute("aria-label", "Comments and feedback");
    const snapshot = this.snapshot!;
    panel.append(element("h2", "", "Feedback"), element("p", "panel-intro", "Comment on a block or a specific visual item. Agents can read and reply through the same local workspace."));
    if (this.selectedAnchor) panel.append(this.newCommentForm(this.selectedAnchor));
    else panel.append(element("p", "hint", "Choose Comment on a block, diagram node, file, milestone, decision, risk, or API item."));
    const threads = [...snapshot.comments].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    if (!threads.length) panel.append(element("p", "hint", "No feedback yet."));
    threads.forEach((thread) => panel.append(this.thread(thread)));
    return panel;
  }

  private newCommentForm(anchor: Anchor) {
    const form = element("form", "new-comment");
    const target = anchor.targetId ? `${anchor.targetKind}: ${anchor.targetId}` : "entire block";
    form.append(element("h3", "", `New comment · ${target}`));
    const body = element("textarea") as HTMLTextAreaElement; body.required = true; body.rows = 3; body.placeholder = "What should change or be decided?";
    body.value = this.drafts.getComment(this.selectedId, anchor);
    body.addEventListener("input", () => this.drafts.setComment(this.selectedId, anchor, body.value));
    form.append(label("Feedback", body));
    form.append(button("Add comment", () => void this.mutate(async () => {
      if (!body.value.trim()) { this.notice = "Write feedback before adding a comment."; return; }
      await api.createComment(this.selectedId, anchor, body.value.trim(), human);
    }, { onSuccess: () => { this.drafts.clearComment(this.selectedId, anchor); this.selectedAnchor = undefined; } }), "primary"));
    return form;
  }

  private thread(thread: CommentThread) {
    const card = element("article", `thread thread-${thread.status}`);
    const target = thread.anchor.targetId ? `${thread.anchor.targetKind} · ${thread.anchor.targetId}` : "block";
    const heading = element("div", "thread-heading"); heading.append(element("span", `status ${thread.status}`, thread.status), element("span", "thread-target", target)); card.append(heading);
    thread.messages.forEach((message) => { const item = element("div", "message"); item.append(element("strong", "", message.author.displayName), element("time", "", time(message.createdAt)), element("p", "", message.body)); card.append(item); });
    const controls = element("div", "thread-controls");
    if (thread.status !== "orphaned") {
      const reply = element("input") as HTMLInputElement; reply.placeholder = "Reply as local reviewer"; reply.setAttribute("aria-label", "Reply to feedback");
      reply.value = this.drafts.getReply(this.selectedId, thread.id);
      reply.addEventListener("input", () => this.drafts.setReply(this.selectedId, thread.id, reply.value));
      controls.append(reply, button("Reply", () => this.mutate(async () => {
        if (!reply.value.trim()) { this.notice = "Write a reply first."; return; }
        await api.reply(this.selectedId, thread.id, reply.value.trim(), human);
      }, { onSuccess: () => this.drafts.clearReply(this.selectedId, thread.id) }), "secondary"));
      controls.append(button(thread.status === "resolved" ? "Reopen" : "Resolve", () => this.mutate(async () => { await api.setCommentStatus(this.selectedId, thread.id, thread.status === "resolved" ? "open" : "resolved", human); }), "quiet"));
    } else controls.append(element("p", "hint", "This anchor's block was deleted. Re-anchor it before reopening."));
    card.append(controls); return card;
  }
}

void new WorkspaceApp().start();
