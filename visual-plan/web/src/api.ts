import type { Actor, Anchor, CommentThread, PatchRequest, Snapshot, WorkspaceDocument } from "./types";

const jsonHeaders = { "Content-Type": "application/json" };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (response.ok) return response.json() as Promise<T>;
  const body: unknown = await response.json().catch(() => undefined);
  const detail = typeof body === "object" && body !== null && "error" in body && typeof body.error === "object" && body.error !== null && "message" in body.error && typeof body.error.message === "string" ? body.error.message : response.statusText;
  throw new Error(detail || `Request failed (${response.status})`);
}

export const api = {
  documents: async () => (await request<{ documents: WorkspaceDocument[] }>("/api/documents")).documents,
  snapshot: (id: string) => request<Snapshot>(`/api/documents/${encodeURIComponent(id)}`),
  patch: (id: string, patch: PatchRequest) => request<Snapshot>(`/api/documents/${encodeURIComponent(id)}/patch`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(patch) }),
  createComment: (id: string, anchor: Anchor, body: string, actor: Actor) => request<CommentThread>(`/api/documents/${encodeURIComponent(id)}/comments`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ anchor, body, actor }) }),
  reply: (id: string, threadId: string, body: string, actor: Actor) => request<CommentThread>(`/api/documents/${encodeURIComponent(id)}/comments/${encodeURIComponent(threadId)}/replies`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ body, actor }) }),
  setCommentStatus: (id: string, threadId: string, status: "open" | "resolved", actor: Actor) => request<CommentThread>(`/api/documents/${encodeURIComponent(id)}/comments/${encodeURIComponent(threadId)}/${status === "resolved" ? "resolve" : "reopen"}`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ actor }) }),
  setUiState: (id: string, uiState: Record<string, unknown>) => request<Snapshot>(`/api/documents/${encodeURIComponent(id)}/ui-state`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify(uiState) }),
};
