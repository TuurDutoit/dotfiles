---
name: "opencode-config"
description: "Manage OpenCode 2 configuration in this dotfiles repo: the user config (~/.config/opencode/opencode.jsonc, symlinked to modules/opencode-2), agents, plugins, MCP servers, permission scoping, and the imported company-managed defaults. Use when adding/disabling an MCP server, changing agent tools or permissions, updating OpenCode config, or debugging config load or permission errors."
---

# OpenCode config in this repo

This repo now carries two OpenCode module generations:

- `modules/opencode-1/` — preserved V1 setup (OpenCode 1.x). Kept for rollback only; do not edit.
- `modules/opencode-2/` — the active V2 (OpenCode 2 / OpenChamber) setup. Edit this one.

## Config layers (highest precedence wins)

| Layer          | Path                                                                                     | Editable?     |
| -------------- | ---------------------------------------------------------------------------------------- | ------------- |
| Project config | `<repo>/opencode.json(c)`, `.opencode/`                                                  | Yes, per repo |
| User config    | `~/.config/opencode/opencode.jsonc` → symlinked to `modules/opencode-2/opencode.jsonc`   | Yes           |

- User config is a symlink: edit `modules/opencode-2/opencode.jsonc`, never `~/.config/opencode/opencode.jsonc` itself.
- OpenCode 2 no longer reads the company-managed file at
  `/Library/Application Support/opencode/opencode.json` (an OpenCode 1
  location). Its contents were **imported into `modules/opencode-2/opencode.jsonc`**
  (model, providers, provider policies, MCP servers, `share`) and its
  `instructions.md` was merged into `modules/opencode-2/AGENTS.md`. When IT
  updates the managed file, refresh those imports by hand.
- Config is deep-merged across layers and loaded once at startup. After any config/agent/skill change, tell the user to restart OpenCode.
- V2 config uses native shapes: `mcp.servers` (with `disabled`, not `enabled`),
  one ordered `permissions` array (`action`/`resource`/`effect`; `bash`→`shell`,
  `task`→`subagent`), `providers` (model `options`→`settings`), and
  `experimental.policies` for provider allowlists. See https://opencode.ai/v2/docs/config.

## Dotfiles workflow

- Agents live in `modules/opencode-2/agents/<name>.md`; global skills go in `modules/agents/skills`.
- Run `modules/opencode-2/setup.zsh` after adding a new top-level path that needs symlinking (it links `AGENTS.md`, `opencode.jsonc`, `agents`, `plugins`, `commands`).
- Every change ends with a commit and push in the same turn (see repo AGENTS.md).

## Adding an MCP server

Declare it in the user config `mcp.servers` block (V2 shape):

```jsonc
"mcp": {
  "servers": {
    "my-server": { "type": "remote", "url": "https://mcp.example.com/mcp" }
  }
}
```

Remote servers use OAuth by default — run OpenCode once and authenticate via `/mcps`.

When adding a server, we don't want to expose it to the default build agent. Instead, create a new agent under `modules/opencode-2/agents/<name>.md` and scope it with `permissions:` entries (V2 replaces the v1 `tools:` frontmatter):

- new agent: deny all servers, then allow the one you just added (e.g. `{ action: "newserver_*", resource: "*", effect: deny }` … `{ action: "newserver_*", …, effect: allow }` last).
- other agents: deny the new server (`{ action: "newserver_*", resource: "*", effect: deny }`).
- global: deny the new server in the `permissions` array in `opencode.jsonc`.

## Disabling an MCP server

In the user config, either remove the server entry or disable it:

```jsonc
"mcp": { "servers": { "server-name": { "disabled": true } } }
```

Also remove the server's allow/deny glob from any agent's `permissions:` in `modules/opencode-2/agents/<name>.md`.

## Scoping tools to agents

V2 uses the ordered `permissions` array (last matching rule wins) — in
`opencode.jsonc` globally and as a `permissions:` list in each agent's
frontmatter. Actions are tool globs like `"sentry_*"`. One agent opts **in** to
a server's tools with a trailing `allow` entry; all other agents (and the
global config) list the same glob as `deny`. You only need to enable/disable
tools for MCP servers that are enabled in the config; a disabled server's tools
are automatically disabled for all agents.

Cloudflare portal servers expose tools under a `datacamp-internal-cloudflare-mcp_portal_*` prefix, gated per-server by the portal picker (`portal_toggle_servers`); enabling it in an agent's permissions exposes **all** enabled portal servers to that agent — narrow the glob once the exact tool names are known.

## Scoping skills to agents

To make a skill available to one agent only (e.g. `sdlc-intent`/`sdlc-spec`/`sdlc-architecture`/`sdlc-plan` → the `spec` agent, `sdlc-implement` → the `engineer` agent):

1. Deny it globally in the user config's `permissions` array, after the `skill *` allow rule — the **last** matching rule wins.
2. In the owning agent's frontmatter, restate the **full** skill ruleset in `permissions:` — agent rules are appended after global rules, so a later agent `allow` overrides the global `deny` — e.g. allow `*` then allow `sdlc-*` last. See `modules/opencode-2/agents/spec.md`.

A new skill under `modules/agents/skills` needs its `~/.agents/skills` symlink before OpenCode sees it — running `dt s agents` relinks every skill directory.

## Agent tool reference

When a server's tools change or migrate (e.g. to the portal), update:

1. The `permissions:` globs in `modules/opencode-2/agents/<agent>.md` for the owning agent.
2. The `deny` entries for that glob in every other agent file that scopes it out.
3. The global `permissions` array in `opencode.jsonc`.

Verify the real tool names before writing globs — guess the prefix from the server name, but confirm by listing tools (e.g. via the portal `codemode.tools()` search or OpenCode's tool list after restart).

## Plugins

Local plugins live in `modules/opencode-2/plugins/` and use the OpenCode 2
plugin API (`{ id, setup(ctx) }`, hooks/transforms on the plugin context). See
https://opencode.ai/v2/docs/build/plugins. The two company npm plugins
(`@datacamp/opencode-auto-approve`, `@datacamp/opencode-openrouter-usage`)
are V1-only implementations and are NOT loaded in V2 until DataCamp ships
V2-compatible releases.