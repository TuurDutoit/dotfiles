import { z } from "zod";

export const idSchema = z.string().uuid();
export const actorSchema = z.object({
  kind: z.enum(["human", "agent"]), id: z.string().min(1).max(120), displayName: z.string().min(1).max(160),
  client: z.enum(["codex", "claude-code", "other"]).optional(),
}).strict().superRefine((value, context) => {
  if (value.kind === "agent" && !value.client) context.addIssue({ code: z.ZodIssueCode.custom, message: "agent client required" });
  if (value.kind === "human" && value.client) context.addIssue({ code: z.ZodIssueCode.custom, message: "human client forbidden" });
});
export type Actor = z.infer<typeof actorSchema>;

export const blockTypeSchema = z.enum(["overview", "architecture", "file-map", "timeline", "decision", "risks", "code", "api-schema", "notes"]);
export const blockSchema = z.object({
  id: idSchema, type: blockTypeSchema, title: z.string().min(1).max(300), content: z.string().max(100_000).default(""),
  props: z.record(z.string(), z.unknown()).default({}), order: z.number().int().nonnegative(), revision: z.number().int().positive(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(), author: actorSchema,
}).strict();
export type Block = z.infer<typeof blockSchema>;

export const anchorSchema = z.object({
  blockId: idSchema,
  targetKind: z.enum(["block", "diagram-node", "file-row", "milestone", "decision-option", "risk", "code-item"]),
  targetId: z.string().min(1).max(200).optional(),
}).strict().superRefine((value, context) => {
  if (value.targetKind === "block" && value.targetId) context.addIssue({ code: z.ZodIssueCode.custom, message: "block anchor has no target id" });
  if (value.targetKind !== "block" && !value.targetId) context.addIssue({ code: z.ZodIssueCode.custom, message: "semantic anchor requires target id" });
});
export type Anchor = z.infer<typeof anchorSchema>;

export const messageSchema = z.object({ id: idSchema, body: z.string().min(1).max(20_000), author: actorSchema, createdAt: z.string().datetime() }).strict();
export const commentSchema = z.object({
  id: idSchema, anchor: anchorSchema, status: z.enum(["open", "resolved", "orphaned"]), createdBy: actorSchema,
  createdAt: z.string().datetime(), resolvedAt: z.string().datetime().optional(), resolvedBy: actorSchema.optional(), messages: z.array(messageSchema).min(1),
}).strict();
export type CommentThread = z.infer<typeof commentSchema>;

const newBlockSchema = blockSchema.omit({ revision: true, createdAt: true, updatedAt: true, author: true, order: true });
export const patchOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("createBlock"), block: newBlockSchema, afterBlockId: idSchema.nullable().optional() }).strict(),
  z.object({ op: z.literal("updateBlock"), blockId: idSchema, expectedBlockRevision: z.number().int().positive(), changes: z.object({ title: z.string().min(1).max(300).optional(), content: z.string().max(100_000).optional(), props: z.record(z.string(), z.unknown()).optional() }).strict().refine((v) => Object.keys(v).length > 0) }).strict(),
  z.object({ op: z.literal("deleteBlock"), blockId: idSchema, expectedBlockRevision: z.number().int().positive() }).strict(),
  z.object({ op: z.literal("moveBlock"), blockId: idSchema, afterBlockId: idSchema.nullable(), expectedBlockRevision: z.number().int().positive() }).strict(),
]);
export type PatchOperation = z.infer<typeof patchOperationSchema>;
export const patchRequestSchema = z.object({ expectedRevision: z.number().int().positive(), actor: actorSchema, operations: z.array(patchOperationSchema).min(1).max(100), summary: z.string().max(1000).optional() }).strict();
export type PatchRequest = z.infer<typeof patchRequestSchema>;

const conflictSchema = z.object({
  id: idSchema, at: z.string().datetime(), expectedRevision: z.number().int().nonnegative(), currentRevision: z.number().int().positive(),
  touchedBlockIds: z.array(idSchema), reason: z.string(), actor: actorSchema,
  intent: z.object({ summary: z.string().max(1000).optional(), operations: z.array(patchOperationSchema).min(1).max(100) }).strict(),
}).strict();
export const revisionSchema = z.object({ revision: z.number().int().positive(), at: z.string().datetime(), actor: actorSchema, summary: z.string().max(1000).optional(), touchedBlockIds: z.array(idSchema), touchedCommentIds: z.array(idSchema).default([]), operation: z.string().min(1) }).strict();
export type RevisionEvent = z.infer<typeof revisionSchema>;
export const documentSchema = z.object({
  schemaVersion: z.literal(1), id: idSchema, title: z.string().min(1).max(300), revision: z.number().int().positive(),
  status: z.enum(["active", "needs_reconcile", "archived"]), blocks: z.array(blockSchema), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  lastEditedBy: actorSchema, sourceHash: z.string().length(64), conflicts: z.array(conflictSchema).default([]),
}).strict();
export type WorkspaceDocument = z.infer<typeof documentSchema>;
