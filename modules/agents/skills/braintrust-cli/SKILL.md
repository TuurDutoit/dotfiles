---
name: braintrust-cli
description: Reference and operate the installed `bt` Braintrust CLI. Use when Codex needs an exact `bt` command, argument, flag, help topic, authentication detail, project or organization scope, or workflow for projects, Topics, datasets, prompts, functions, tools, scorers, experiments, evaluations, SQL, logs, or synchronization.
---

# Braintrust CLI

## Navigate the reference

Read [references/index.md](references/index.md) to select the smallest relevant command page. Read [references/root.md](references/root.md) for global flags and top-level commands. Each command page preserves the installed CLI's exact description, options, arguments, aliases, and examples.

Refresh the bundled reference after upgrading `bt`:

```sh
python3 scripts/generate_reference.py
```

The generator recursively discovers every command with local `bt ... --help`; do not substitute web documentation when exact installed syntax matters.

## Authenticate and scope commands

Run `bt status` or read the selected command page before relying on the active profile, organization, or project. Use `bt auth login` only when authentication is absent or the user asks to change it. Prefer command flags (`--profile`, `--org`, `--project`, and `--env-file`) over guessing context, and never print API keys, OAuth tokens, or `.env` contents.

Pass `--json` only when the command reference documents it and structured output is needed. For non-interactive automation, use `--no-input`; it does not replace confirmation for state-changing actions.

## Preserve safe control boundaries

Inspect before acting. Treat commands that create, update, restore, delete, push, invoke, run, sync, rewind, poke, configure, install, or update as state-changing. Confirm the exact target and obtain explicit user approval before running them. Flags such as `--force` or `--no-input` only alter CLI prompts; they do not replace user approval.

Prefer read-only commands such as `status`, `list`, `view`, `topics status`, `sync status`, and `sql` first. Keep downloads, generated files, and synchronization scopes within the user-approved path and project. Confirm the source and destination command pages before passing IDs, names, URLs, or local files between commands.
