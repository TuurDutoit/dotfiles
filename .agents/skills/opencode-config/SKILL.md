---
name: "opencode-config"
description: "Manage OpenCode 2 configuration in this dotfiles repo: the user config (~/.config/opencode/opencode.jsonc, symlinked to modules/opencode-2), agents, plugins, MCP servers, permission scoping, and how the managed company defaults layer in. Use when adding/disabling an MCP server, changing agent tools or permissions, updating OpenCode config, or debugging config load or permission errors."
---

# OpenCode config in this repo

This repo now carries two OpenCode module generations:

- `modules/opencode-1/` — preserved V1 setup (OpenCode 1.x). Kept for rollback only; do not edit.
- `modules/opencode-2/` — the active V2 (OpenCode 2 / OpenChamber) setup. Edit this one.

## Config layers (highest precedence wins)

| Layer                     | Path                                                                                     | Editable?                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| Managed preferences (MDM) | `/Library/Managed Preferences/<user>/ai.opencode.managed.plist`                          | No — highest precedence                    |
| System (managed)          | `/Library/Application Support/opencode/opencode.json` + `instructions.md`                | No — machine-wide                          |
| Project config            | `<repo>/opencode.json(c)`, `.opencode/`                                                  | Yes, per repo                              |
| User config               | `~/.config/opencode/opencode.jsonc` → symlinked to `modules/opencode-2/opencode.jsonc`   | Yes                                        |

- User config is a symlink: edit `modules/opencode-2/opencode.jsonc`, never `~/.config/opencode/opencode.jsonc` itself.
- OpenCode 2 (verified on v2.0.32) **does** load the managed config at
  `/Library/Application Support/opencode/opencode.json` and its `instructions.md`.
  On this Mac the user MDM profile
  `/Library/Managed Preferences/tuur/ai.opencode.managed.plist` also supplies the
  same model/provider aliases/instructions plus the MCP servers, and outranks the
  system file. The managed file supplies `model`, `small_model`, `share`,
  `enabled_providers` (normalized to provider policies), the OpenRouter
  auto-routing model aliases, and the company MCP servers. Do **not** duplicate
  any of that in the user config; the user config holds only personal settings
  and personal MCP servers.
- Config is deep-merged across layers and loaded once at startup. After any config/agent/skill change, tell the user to restart OpenCode.
- V2 config uses native shapes: `mcp.servers` (with `disabled`, not `enabled`),
  one ordered `permissions` array (`action`/`resource`/`effect`; `bash`→`shell`,
  `task`→`subagent`), `providers` (model `options`→`settings`), and top-level
  `policies` for provider/integration allowlists. See https://opencode.ai/v2/docs/config.

## Dotfiles workflow

- Agents live in `modules/opencode-2/agents/<name>.md`; global skills go in `modules/agents/skills`.
- Agent frontmatter pins the model as `provider/model#variant` (e.g. `openrouter/openai/gpt-6.1-sol#high`). The optional `# model-category:` comment (existing values: coding, review, spec, tools) is documentation only — nothing in this repo parses it.
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

Servers already defined in the managed config are enabled automatically; do not re-declare them here.

When adding a server, we don't want to expose it to the default build agent. Instead, create a new agent under `modules/opencode-2/agents/<name>.md` and scope it with `permissions:` entries (V2 replaces the v1 `tools:` frontmatter):

- new agent: deny all servers, then allow the one you just added (e.g. `{ action: "newserver_*", resource: "*", effect: deny }` … `{ action: "newserver_*", …, effect: allow }` last).
- other agents: deny the new server (`{ action: "newserver_*", resource: "*", effect: deny }`).
- global: deny the new server in the `permissions` array in `opencode.jsonc`.

### Secrets via `{env:...}` in remote headers

Header auth works (verified on v2.0.23): put the scheme in the config as literal text and the secret as a variable — `"Authorization": "Bearer {env:MY_TOKEN}"` — with the raw token (no `Bearer ` prefix) in the env var. `{env:NAME}` interpolation applies to remote `headers`, local `environment`, and OAuth fields.

**Gotcha:** MCP connections are made by the shared background service (`opencode serve --service`), which interpolates `{env:...}` from **its own** environment at startup and never re-reads it. After adding or changing a secret, restart the service from a shell that has it sourced, or the server keeps failing with the old (empty) value even though new `opencode` runs and agent shells see the variable:

```sh
source ~/.localrc && opencode service restart   # then: opencode mcp list
```

Debugging split to remember: if the agent's shell can `echo $VAR` but the MCP still 401s, the variable reached the TUI but not the service — check the service process start time (`lsof -i :49374`, `ps -p <pid> -o lstart=`) against when the secret was added.

## Disabling an MCP server

For a server declared in the user config, either remove its entry or disable it:

```jsonc
"mcp": { "servers": { "server-name": { "disabled": true } } }
```

A server declared in the managed config cannot be turned off that way: the
managed config has the highest precedence and replaces the whole server object
with the same name. Add a policy deny instead — a policy removes the server
however it was configured:

```jsonc
"policies": [
  { "action": "integration.use", "resource": "mcp:server-name", "effect": "deny" },
]
```

The user config already denies the managed servers that are not wanted:
airtable, atlassian, better-artifacts, clickup, datadog, huggingface,
incident-io, intercom, linear, mcp-internal-tooling, miro, notion, webflow.

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

To make a skill available to one agent only:

1. Deny it globally in the user config's `permissions` array, after the `skill *` allow rule — the **last** matching rule wins.
2. In the owning agent's frontmatter, restate the **full** skill ruleset in `permissions:` — agent rules are appended after global rules, so a later agent `allow` overrides the global `deny` — e.g. allow `*` then allow `<skill-name>` last.

A new skill under `modules/agents/skills` needs a copy in `~/.agents/skills`
before OpenCode sees it — running `dt s agents` re-copies every skill
directory. Skills are **copied, not symlinked** (OpenChamber mis-resolves
symlinked skills), so re-run `dt s agents` after every skill change.
The copy loop never prunes: when you delete a skill here, also remove its
stale directory from `~/.agents/skills` by hand, or OpenCode keeps loading
it.

## Agent tool reference

When a server's tools change or migrate (e.g. to the portal), update:

1. The `permissions:` globs in `modules/opencode-2/agents/<agent>.md` for the owning agent.
2. The `deny` entries for that glob in every other agent file that scopes it out.
3. The global `permissions` array in `opencode.jsonc`.

Verify the real tool names before writing globs — guess the prefix from the server name, but confirm by listing tools (e.g. via the portal `codemode.tools()` search or OpenCode's tool list after restart).

## Plugins

Local plugins live in `modules/opencode-2/plugins/` and use the OpenCode 2
plugin API (`{ id, setup(ctx) }`, hooks/transforms on the plugin context). See
https://opencode.ai/v2/docs/build/plugins. Current state:

- `auto-approve/` — vendored from `datacamp-engineering/opencode-plugins`
  PR DP-2003 (Jev via the OpenRouter Decisions endpoint), adapted to the v2
  `permission.hook("evaluate")` API. Elevates safe pending asks to `allow`;
  configured allow/deny rules always stand. Zero-config via OpenCode's stored
  OpenRouter key. Re-diff against upstream when DP-2003 or a v2 port lands there.
- `rtk.ts` — hand-ported V2 plugin; `rtk init` (0.49.0) still generates the v1
  API, so setup.zsh only bootstraps it when the file is missing.
  Symptom if it ever gets clobbered again (e.g. an unguarded `rtk init`):
  OpenCode fails the plugin with "Plugin must export a default definition with
  an id and an effect or setup function" — the v1 template has only a named
  export, no default. Fix: `git checkout -- modules/opencode-2/plugins/rtk.ts`.
- `@datacamp/opencode-openrouter-usage` — dropped: V1-only implementation and
  the MDM profile still declares it, so `policies` denies
  `plugin:@datacamp/opencode-openrouter-usage`; remove that deny if a V2
  version ever ships.