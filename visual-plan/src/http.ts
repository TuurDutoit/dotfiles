import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { z, ZodError } from "zod";
import { actorSchema, anchorSchema, blockTypeSchema, idSchema, patchRequestSchema } from "./domain.js";
import { NotFoundError, ReviewRequiredError, WorkspaceService } from "./service.js";
import { StorageError } from "./storage.js";

export type HttpServerOptions = { host?: string; port?: number; allowLan?: boolean; staticDir?: string };
export type RunningHttpServer = { server: Server; url: string; close: () => Promise<void> };

const jsonObjectSchema = z.record(z.string(), z.unknown());
const createDocumentSchema = z.object({
  title: z.string().min(1).max(300), actor: actorSchema,
  blocks: z.array(z.object({ id: idSchema, type: blockTypeSchema, title: z.string().min(1).max(300), content: z.string().max(100_000).default(""), props: jsonObjectSchema.default({}) }).strict()).optional(),
}).strict();
const commentSchema = z.object({ anchor: anchorSchema, body: z.string().min(1).max(20_000), actor: actorSchema }).strict();
const replySchema = z.object({ body: z.string().min(1).max(20_000), actor: actorSchema }).strict();
const statusSchema = z.object({ actor: actorSchema }).strict();

const send = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
};
const notFound = (response: ServerResponse) => send(response, 404, { error: { code: "not_found", message: "Route was not found" } });
const errorResponse = (response: ServerResponse, error: unknown) => {
  if (error instanceof ZodError) return send(response, 400, { error: { code: "validation_error", message: "Request failed validation", issues: error.issues } });
  if (error instanceof NotFoundError) return send(response, 404, { error: { code: "not_found", message: error.message } });
  if (error instanceof ReviewRequiredError) return send(response, 409, { error: { code: "review_required", message: error.message, conflict: error.conflict } });
  if (error instanceof StorageError) return send(response, 400, { error: { code: "storage_error", message: error.message } });
  console.error(error);
  return send(response, 500, { error: { code: "internal_error", message: "Unexpected server error" } });
};
const readJson = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > 1_000_000) throw new StorageError("Request body exceeds 1 MB");
    chunks.push(buffer);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  if (!body) throw new ZodError([{ code: z.ZodIssueCode.custom, path: [], message: "JSON body is required" }]);
  try { return JSON.parse(body); } catch { throw new ZodError([{ code: z.ZodIssueCode.custom, path: [], message: "Invalid JSON" }]); }
};
const segments = (pathname: string) => pathname.split("/").filter(Boolean).map(decodeURIComponent);
const queryPositiveInt = (value: string | null, name: string) => z.coerce.number().int().nonnegative().parse(value ?? (() => { throw new ZodError([{ code: z.ZodIssueCode.custom, path: [name], message: `${name} is required` }]); })());
const mimeTypes: Record<string, string> = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
export const safeStaticFile = (root: string, pathname: string) => {
  const requested = decodeURIComponent(pathname).replace(/^\/+/, "");
  const candidate = resolve(root, requested || "index.html");
  const pathFromRoot = relative(root, candidate);
  if (isAbsolute(pathFromRoot) || pathFromRoot.startsWith("..")) return undefined;
  return candidate;
};
const serveStatic = async (response: ServerResponse, root: string, pathname: string) => {
  const file = safeStaticFile(root, pathname);
  if (file) {
    try {
      if ((await stat(file)).isFile()) {
        const extension = extname(file); const body = await readFile(file);
        response.writeHead(200, { "content-type": mimeTypes[extension] ?? "application/octet-stream", "cache-control": extension === ".html" ? "no-store" : "public, max-age=3600" }); response.end(body); return true;
      }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  if (!extname(pathname)) {
    const index = resolve(root, "index.html");
    try { const body = await readFile(index); response.writeHead(200, { "content-type": mimeTypes[".html"], "cache-control": "no-store" }); response.end(body); return true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  return false;
};

export const createHttpHandler = (service: WorkspaceService, staticDir = resolve(process.cwd(), "dist", "web")) => async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const path = segments(url.pathname);
    const method = request.method ?? "GET";
    if (method === "GET" && url.pathname === "/health") return send(response, 200, { ok: true });
    if (method === "GET" && url.pathname === "/api/documents") return send(response, 200, { documents: await service.listDocuments() });
    if (method === "POST" && url.pathname === "/api/documents") {
      const input = createDocumentSchema.parse(await readJson(request));
      return send(response, 201, await service.createDocument(input));
    }
    if (path[0] !== "api" || path[1] !== "documents" || !path[2]) {
      if (method === "GET" && path[0] !== "api") {
        if (await serveStatic(response, staticDir, url.pathname)) return;
      }
      return notFound(response);
    }
    const id = idSchema.parse(path[2]);
    if (method === "GET" && path.length === 3) return send(response, 200, await service.getDocument(id));
    if (method === "DELETE" && path.length === 3) { await service.deleteDocument(id); return send(response, 204, null); }
    if (method === "GET" && path[3] === "export" && path.length === 4) return send(response, 200, await service.exportDocument(id));
    if (method === "GET" && path[3] === "changes" && path.length === 4) return send(response, 200, await service.getChanges(id, queryPositiveInt(url.searchParams.get("since"), "since")));
    if (method === "POST" && path[3] === "reconcile" && path.length === 4) return send(response, 200, await service.reconcileDocument(id, statusSchema.parse(await readJson(request)).actor));
    if (method === "PUT" && path[3] === "ui-state" && path.length === 4) return send(response, 200, await service.setUiState(id, jsonObjectSchema.parse(await readJson(request))));
    if (method === "POST" && path[3] === "patch" && path.length === 4) return send(response, 200, await service.applyPatch(id, patchRequestSchema.parse(await readJson(request))));
    if (method === "GET" && path[3] === "comments" && path.length === 4) return send(response, 200, { comments: await service.listComments(id, url.searchParams.get("unresolved") === "true") });
    if (method === "POST" && path[3] === "comments" && path.length === 4) return send(response, 201, await service.createComment(id, commentSchema.parse(await readJson(request))));
    if (method === "POST" && path[3] === "comments" && path[4] && path[5] === "replies" && path.length === 6) return send(response, 201, await service.replyComment(id, idSchema.parse(path[4]), replySchema.parse(await readJson(request))));
    if (method === "POST" && path[3] === "comments" && path[4] && (path[5] === "resolve" || path[5] === "reopen") && path.length === 6) return send(response, 200, await service.setCommentStatus(id, idSchema.parse(path[4]), path[5] === "resolve" ? "resolved" : "open", statusSchema.parse(await readJson(request)).actor));
    if (method === "GET" && path[3] === "context" && path.length === 4) return send(response, 200, await service.scopedContext(id, { blockId: url.searchParams.get("blockId") ?? undefined, threadId: url.searchParams.get("threadId") ?? undefined }));
    if (method === "GET" && path[0] !== "api") {
      if (await serveStatic(response, staticDir, url.pathname)) return;
    }
    return notFound(response);
  } catch (error) { return errorResponse(response, error); }
};

export const startHttpServer = async (service: WorkspaceService, options: HttpServerOptions = {}): Promise<RunningHttpServer> => {
  const port = options.port ?? 4318;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new StorageError("Port must be between 0 and 65535");
  const host = options.allowLan ? (options.host ?? "0.0.0.0") : "127.0.0.1";
  if (!options.allowLan && options.host && options.host !== "127.0.0.1" && options.host !== "localhost") throw new StorageError("Non-loopback hosts require --lan");
  const server = createServer(createHttpHandler(service, options.staticDir ?? resolve(process.cwd(), "dist", "web")));
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, host, () => { server.off("error", reject); resolve(); }); });
  const bound = server.address();
  if (!bound || typeof bound === "string") { server.close(); throw new StorageError("HTTP server did not bind to a TCP port"); }
  return { server, url: `http://${host}:${bound.port}`, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
};
