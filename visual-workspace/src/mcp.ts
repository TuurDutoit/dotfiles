import { createInterface } from "node:readline";
import { z, ZodError } from "zod";
import { actorSchema, anchorSchema, blockTypeSchema, idSchema, patchRequestSchema } from "./domain.js";
import { NotFoundError, ReviewRequiredError, WorkspaceService } from "./service.js";

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: unknown };
type RpcResponse = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string; data?: unknown } };
const tool = (name: string, description: string, inputSchema: Record<string, unknown>) => ({ name, description, inputSchema });
export const mcpTools = [
  tool("workspace_list_documents", "List visual workspace documents.", { type: "object", properties: {} }),
  tool("workspace_create_document", "Create a visual workspace document, optionally seeded with stable-ID blocks.", { type: "object", properties: { title: { type: "string" }, actor: { type: "object" }, blocks: { type: "array" } }, required: ["title", "actor"] }),
  tool("workspace_get_document", "Get a document snapshot including comments and revisions.", { type: "object", properties: { documentId: { type: "string", format: "uuid" } }, required: ["documentId"] }),
  tool("workspace_get_changes", "Read changes since a document revision.", { type: "object", properties: { documentId: { type: "string" }, sinceRevision: { type: "integer", minimum: 0 } }, required: ["documentId", "sinceRevision"] }),
  tool("workspace_apply_patch", "Apply a revision-aware, block-level patch. Never overwrite a document wholesale.", { type: "object", properties: { documentId: { type: "string" }, expectedRevision: { type: "integer" }, actor: { type: "object" }, operations: { type: "array" } }, required: ["documentId", "expectedRevision", "actor", "operations"] }),
  tool("workspace_list_comments", "List comments, optionally unresolved only.", { type: "object", properties: { documentId: { type: "string" }, unresolvedOnly: { type: "boolean" } }, required: ["documentId"] }),
  tool("workspace_create_comment", "Create a semantic, stable comment anchor.", { type: "object", properties: { documentId: { type: "string" }, anchor: { type: "object" }, body: { type: "string" }, actor: { type: "object" } }, required: ["documentId", "anchor", "body", "actor"] }),
  tool("workspace_reply_comment", "Reply to a feedback thread.", { type: "object", properties: { documentId: { type: "string" }, threadId: { type: "string" }, body: { type: "string" }, actor: { type: "object" } }, required: ["documentId", "threadId", "body", "actor"] }),
  tool("workspace_set_comment_status", "Resolve or reopen a feedback thread.", { type: "object", properties: { documentId: { type: "string" }, threadId: { type: "string" }, status: { enum: ["resolved", "open"] }, actor: { type: "object" } }, required: ["documentId", "threadId", "status", "actor"] }),
  tool("workspace_reconcile_document", "Safely restore the canonical Markdown projection after an external raw edit has put a document into needs_reconcile.", { type: "object", properties: { documentId: { type: "string" }, actor: { type: "object" } }, required: ["documentId", "actor"] }),
  tool("workspace_scoped_context", "Get a block, comment thread, and unresolved feedback for focused work.", { type: "object", properties: { documentId: { type: "string" }, blockId: { type: "string" }, threadId: { type: "string" } }, required: ["documentId"] }),
];
const object = z.record(z.string(), z.unknown());
const createDocumentSchema = z.object({
  title: z.string().min(1).max(300), actor: actorSchema,
  blocks: z.array(z.object({ id: idSchema, type: blockTypeSchema, title: z.string().min(1).max(300), content: z.string().max(100_000).default(""), props: object.default({}) }).strict()).optional(),
}).strict();
const responseText = (value: unknown) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
const asError = (error: unknown) => {
  if (error instanceof ZodError) return { code: -32602, message: "Invalid tool arguments", data: error.issues };
  if (error instanceof NotFoundError) return { code: -32004, message: error.message };
  if (error instanceof ReviewRequiredError) return { code: -32009, message: error.message, data: error.conflict };
  return { code: -32603, message: error instanceof Error ? error.message : "Internal error" };
};
export const callMcpTool = async (service: WorkspaceService, name: string, rawArguments: unknown): Promise<unknown> => {
  const args = object.parse(rawArguments ?? {});
  const documentId = (key = "documentId") => idSchema.parse(args[key]);
  if (name === "workspace_list_documents") return responseText({ documents: await service.listDocuments() });
  if (name === "workspace_create_document") return responseText(await service.createDocument(createDocumentSchema.parse(args)));
  if (name === "workspace_get_document") return responseText(await service.getDocument(documentId()));
  if (name === "workspace_get_changes") return responseText(await service.getChanges(documentId(), z.number().int().nonnegative().parse(args.sinceRevision)));
  if (name === "workspace_apply_patch") return responseText(await service.applyPatch(documentId(), patchRequestSchema.parse({ ...args, expectedRevision: args.expectedRevision, actor: args.actor, operations: args.operations, summary: args.summary })));
  if (name === "workspace_list_comments") return responseText({ comments: await service.listComments(documentId(), z.boolean().optional().parse(args.unresolvedOnly) ?? false) });
  if (name === "workspace_create_comment") return responseText(await service.createComment(documentId(), { anchor: anchorSchema.parse(args.anchor), body: z.string().min(1).max(20_000).parse(args.body), actor: actorSchema.parse(args.actor) }));
  if (name === "workspace_reply_comment") return responseText(await service.replyComment(documentId(), idSchema.parse(args.threadId), { body: z.string().min(1).max(20_000).parse(args.body), actor: actorSchema.parse(args.actor) }));
  if (name === "workspace_set_comment_status") return responseText(await service.setCommentStatus(documentId(), idSchema.parse(args.threadId), z.enum(["resolved", "open"]).parse(args.status), actorSchema.parse(args.actor)));
  if (name === "workspace_reconcile_document") return responseText(await service.reconcileDocument(documentId(), actorSchema.parse(args.actor)));
  if (name === "workspace_scoped_context") return responseText(await service.scopedContext(documentId(), { blockId: z.string().uuid().optional().parse(args.blockId), threadId: z.string().uuid().optional().parse(args.threadId) }));
  throw new ZodError([{ code: z.ZodIssueCode.custom, path: ["name"], message: `Unknown tool: ${name}` }]);
};
export const startMcpServer = (service: WorkspaceService) => {
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on("line", async (line) => {
    let request: RpcRequest;
    try { request = z.object({ jsonrpc: z.literal("2.0"), id: z.union([z.string(), z.number(), z.null()]).optional(), method: z.string(), params: z.unknown().optional() }).parse(JSON.parse(line)); }
    catch { process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`); return; }
    if (request.id === undefined) return;
    let response: RpcResponse;
    try {
      if (request.method === "initialize") response = { jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "visual-workspace", version: "0.1.0" } } };
      else if (request.method === "tools/list") response = { jsonrpc: "2.0", id: request.id, result: { tools: mcpTools } };
      else if (request.method === "tools/call") { const params = z.object({ name: z.string(), arguments: z.unknown().optional() }).parse(request.params); response = { jsonrpc: "2.0", id: request.id, result: await callMcpTool(service, params.name, params.arguments) }; }
      else response = { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Method not found" } };
    } catch (error) { response = { jsonrpc: "2.0", id: request.id, error: asError(error) }; }
    process.stdout.write(`${JSON.stringify(response)}\n`);
  });
};
