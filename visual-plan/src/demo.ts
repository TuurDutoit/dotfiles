import { randomUUID } from "node:crypto";
import type { Actor, Block } from "./domain.js";
import { WorkspaceService } from "./service.js";

export const demoAgent: Actor = { kind: "agent", id: "codex-planner", displayName: "Codex Planner", client: "codex" };
const block = (type: Block["type"], title: string, content: string, props: Record<string, unknown> = {}) => ({ id: randomUUID(), type, title, content, props });
export async function seedFeaturePlan(service: WorkspaceService) {
  return service.createDocument({ title: "Saved views: multi-file feature plan", actor: demoAgent, blocks: [
    block("overview", "Outcome", "Let learners save, rename, and reuse filtered dashboard views."),
    block("architecture", "Request and data flow", "Browser → API → saved_views table", { nodes: [{ id: "ui", label: "Dashboard" }, { id: "api", label: "Saved views API" }, { id: "db", label: "saved_views" }], edges: [{ id: "request", from: "ui", to: "api" }, { id: "store", from: "api", to: "db" }] }),
    block("file-map", "Affected files", "Frontend, endpoint, migration, and tests", { rows: [{ id: "ui-file", path: "apps/web/src/dashboard/views.tsx", change: "view picker" }, { id: "api-file", path: "services/api/src/views.ts", change: "CRUD endpoint" }, { id: "migration", path: "db/migrations/042_saved_views.sql", change: "table" }, { id: "tests", path: "services/api/test/views.test.ts", change: "coverage" }] }),
    block("timeline", "Milestones", "Schema → API → interface → release", { milestones: [{ id: "schema", label: "Schema" }, { id: "api", label: "API" }, { id: "ui", label: "UI" }] }),
    block("decision", "Decision", "Store filters as validated JSON and scope ownership to the user."),
    block("risks", "Risks and open questions", "Validate saved filter schemas across product versions.", { risks: [{ id: "schema-drift", label: "Filter schema drift" }] }),
    block("api-schema", "API shape", "POST /views { name, filters } → SavedView", { items: [{ id: "create-view", label: "Create view" }] }),
  ] });
}
