---
name: opencode-config
description: >-
  Manage OpenCode configuration in this dotfiles repo: the managed settings
  file (/Library/Application Support/opencode/opencode.json), the user config
  (~/.config/opencode/opencode.jsonc), MCP servers, agent tool allowlists, and
  symlinks via setup.zsh. Use when adding/disabling an MCP server, changing
  agent tools, updating OpenCode config, or debugging config load or
  permission errors.
---

# OpenCode config in this repo

## Config layers (highest precedence wins)

| Layer            | Path                                                                                 | Editable?     |
| ---------------- | ------------------------------------------------------------------------------------ | ------------- |
| Project config   | `<repo>/opencode.json(c)`, `.opencode/`                                              | Yes, per repo |
| User config      | `~/.config/opencode/opencode.jsonc` → symlinked to `modules/opencode/opencode.jsonc` | Yes           |
| Managed settings | `/Library/Application Support/opencode/opencode.json`                                | Read-only     |

- User config is a symlink: edit `modules/opencode/opencode.jsonc`, never `~/.config/opencode/opencode.jsonc` itself.
- Managed settings is managed by IT and **read-only** (writes fail with PermissionDenied). Never try to modify it.
- To override managed settings, add the same key in the user config. For MCP servers, `{ "enabled": false }` in user config disables a managed server.
- Config is deep-merged across layers and loaded once at startup. After any config/agent/skill change, tell the user to restart OpenCode.

## Dotfiles workflow

- Agents live in `modules/opencode/agents/<name>.md`; global skills go in `modules/agents/skills`.
- Run `modules/opencode/setup.zsh` after adding a new top-level path that needs symlinking (it links `AGENTS.md`, `opencode.jsonc`, `agents`).
- Every change ends with a commit and push in the same turn (see repo AGENTS.md).

## Adding an MCP server

Managed (in `/Library/.../opencode.json`) but the managed file is already correct? Then nothing to do. Otherwise declare it in the user config `mcp` block. Remote servers need OAuth — run OpenCode once and authenticate.

When adding a server, we don't want to expose it to the default build agent. Instead, create a new agent under `modules/opencode/agents/<name>.md` and set the `tools:` frontmatter / config to:

- new agent: disable all servers, except the one you just added (e.g. `"newserver_*": true, "oldserver_*": false }`).
- other agents: disable the new server (e.g. `"newserver_*": false`).
- global: disable the new server (e.g. `"newserver_*": false`).

## Disabling an MCP server

Add to the user config `mcp` block:

```jsonc
"server-name": { "enabled": false }
```

Also remove this server from any agent's `tools:` frontmatter in `modules/opencode/agents/<name>.md`.

## Scoping tools to agents

Global `tools` in `opencode.jsonc` and per-agent `tools:` frontmatter in `modules/opencode/agents/<name>.md` take glob patterns like `"sentry_*": false`. One agent opts **in** to a server's tools with `"<server>_*": true`; all other agents list the same glob as `false`. You only need to enable/disable tools for MCP servers that are enabled in the config. If a server is disabled, its tools are automatically disabled for all agents.

Cloudflare portal servers expose tools under a `datacamp-internal-cloudflare-mcp_portal_*` prefix, gated per-server by the portal picker (`portal_toggle_servers`); enabling it in an agent's tools exposes **all** enabled portal servers to that agent — narrow the glob once the exact tool names are known.

## Agent tool reference

When a server's tools change or migrate (e.g. to the portal), update:

1. The `tools` globs in `modules/opencode/agents/<agent>.md` for the owning agent.
2. The `"<server>_*": false` lines in every other agent file that scopes it out.
3. The global `tools` block in `opencode.jsonc`.

Verify the real tool names before writing globs — guess the prefix from the server name, but confirm by listing tools (e.g. via the portal `codemode.tools()` search or OpenCode's tool list after restart).
