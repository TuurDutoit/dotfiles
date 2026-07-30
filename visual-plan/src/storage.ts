import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, lstat, writeFile, access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { documentSchema, type CommentThread, type RevisionEvent, type WorkspaceDocument } from "./domain.js";

export class StorageError extends Error {}
const isInside = (root: string, candidate: string) => { const rel = relative(root, candidate); return rel !== "" && !rel.startsWith("..") && !rel.includes("/../"); };
export const sha256 = (content: string) => createHash("sha256").update(content).digest("hex");

const sleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export type DocumentLockOptions = {
  timeoutMs?: number;
  retryDelayMs?: number;
};

export class FileWorkspaceStore {
  readonly root: string;
  constructor(root: string) { this.root = resolve(root); }
  private docDir(id: string) { if (!/^[0-9a-f-]{36}$/i.test(id)) throw new StorageError("Invalid document id"); const dir = resolve(this.root, ".visual-workspace", "documents", id); if (!isInside(resolve(this.root, ".visual-workspace", "documents"), dir)) throw new StorageError("Path escapes workspace"); return dir; }
  private lockDir(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new StorageError("Invalid document id");
    const locks = resolve(this.root, ".visual-workspace", "locks");
    const lock = resolve(locks, `${id}.lock`);
    if (!isInside(locks, lock)) throw new StorageError("Lock path escapes workspace");
    return lock;
  }
  private async safeDir(dir: string) { try { if ((await lstat(dir)).isSymbolicLink()) throw new StorageError("Symlinked document directories are forbidden"); } catch (e) { if (e instanceof StorageError) throw e; } }
  private async atomic(path: string, text: string) { await mkdir(dirname(path), { recursive: true }); const temp = `${path}.${randomUUID()}.tmp`; await writeFile(temp, text, "utf8"); await rename(temp, path); }
  async initialize() {
    await Promise.all([
      mkdir(resolve(this.root, ".visual-workspace", "documents"), { recursive: true }),
      mkdir(resolve(this.root, ".visual-workspace", "locks"), { recursive: true }),
    ]);
  }
  async withDocumentLock<T>(id: string, work: () => Promise<T>, options: DocumentLockOptions = {}): Promise<T> {
    const lock = this.lockDir(id);
    const timeoutMs = options.timeoutMs ?? 5_000;
    const retryDelayMs = options.retryDelayMs ?? 20;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || !Number.isInteger(retryDelayMs) || retryDelayMs < 1) {
      throw new StorageError("Document lock timeout and retry delay must be positive integers");
    }
    const locks = dirname(lock);
    await mkdir(locks, { recursive: true });
    await this.safeDir(locks);
    const owner = randomUUID();
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        await mkdir(lock);
        try {
          await writeFile(join(lock, "owner"), owner, "utf8");
        } catch (error) {
          await rm(lock, { recursive: true, force: true }).catch(() => undefined);
          throw error;
        }
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "EEXIST") throw error;
        const existing = await lstat(lock).catch((lstatError: NodeJS.ErrnoException) => {
          if (lstatError.code === "ENOENT") return undefined;
          throw lstatError;
        });
        if (existing?.isSymbolicLink() || (existing && !existing.isDirectory())) {
          throw new StorageError("Unsafe document lock path");
        }
        if (Date.now() >= deadline) throw new StorageError(`Timed out waiting for document lock after ${timeoutMs}ms`);
        await sleep(retryDelayMs);
      }
    }
    try {
      return await work();
    } finally {
      // Only remove a lock whose ownership marker still belongs to this caller.
      // A timed-out process never removes a possibly-live peer's lock.
      const recordedOwner = await readFile(join(lock, "owner"), "utf8").catch(() => undefined);
      if (recordedOwner === owner) await rm(lock, { recursive: true, force: true });
    }
  }
  async exists(id: string) { try { await access(join(this.docDir(id), "document.json"), constants.F_OK); return true; } catch { return false; } }
  async listIds() {
    const documents = resolve(this.root, ".visual-workspace", "documents");
    try { return (await readdir(documents, { withFileTypes: true })).filter((entry) => entry.isDirectory() && /^[0-9a-f-]{36}$/i.test(entry.name)).map((entry) => entry.name); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  }
  async load(id: string): Promise<{ document: WorkspaceDocument; comments: CommentThread[]; revisions: RevisionEvent[]; uiState: Record<string, unknown> }> {
    const dir = this.docDir(id); await this.safeDir(dir); const raw = await readFile(join(dir, "document.json"), "utf8"); const document = documentSchema.parse(JSON.parse(raw));
    const [comments, revisions, uiState] = await Promise.all([this.readJson<CommentThread[]>(join(dir, "comments.json"), []), this.readJson<RevisionEvent[]>(join(dir, "revisions.json"), []), this.readJson<Record<string, unknown>>(join(dir, "ui-state.json"), {})]);
    return { document, comments, revisions, uiState };
  }
  private async readJson<T>(path: string, fallback: T): Promise<T> { try { return JSON.parse(await readFile(path, "utf8")) as T; } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback; throw e; } }
  async save(state: { document: WorkspaceDocument; comments: CommentThread[]; revisions: RevisionEvent[]; uiState: Record<string, unknown> }) { const dir = this.docDir(state.document.id); await this.safeDir(dir); await mkdir(dir, { recursive: true }); await Promise.all([this.atomic(join(dir, "document.json"), JSON.stringify(state.document, null, 2) + "\n"), this.atomic(join(dir, "comments.json"), JSON.stringify(state.comments, null, 2) + "\n"), this.atomic(join(dir, "revisions.json"), JSON.stringify(state.revisions, null, 2) + "\n"), this.atomic(join(dir, "ui-state.json"), JSON.stringify(state.uiState, null, 2) + "\n")]); }
  async writeProjection(id: string, markdown: string) { await this.atomic(join(this.docDir(id), "document.md"), markdown); }
  async readProjection(id: string) { return readFile(join(this.docDir(id), "document.md"), "utf8"); }
  async delete(id: string) { const dir = this.docDir(id); await this.safeDir(dir); await rm(dir, { recursive: true, force: true }); }
}
