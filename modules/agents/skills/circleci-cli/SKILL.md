---
name: circleci-cli
description: Reference and operate the installed `circleci` CLI. Use when Codex needs an exact CircleCI CLI command, argument, flag, help topic, authentication detail, safety constraint, or identifier handoff across projects, runs, pipelines, workflows, jobs, artifacts, test results, contexts, or administrative resources.
---

# CircleCI CLI

## Navigate the reference

Read [references/index.md](references/index.md) to select a command page. Read only the page for the command being considered; it preserves the installed CLI's description, flags, arguments, aliases, and examples exactly. Read [references/root.md](references/root.md) for top-level commands and help topics.

Read the matching help-topic page for environment variables, output formatting, getting started, or telemetry. Refresh the bundled reference after upgrading the CLI:

```sh
python3 scripts/generate_reference.py
```

The generator uses local root help, `circleci reference --help`, and the four operational help topics. The split command pages are the complete CLI reference. Do not substitute web documentation for the installed CLI's reference when exact syntax matters.

## Authenticate and scope commands

Use `circleci auth me` to confirm the active identity. Use `circleci auth login` only when authentication is absent or the user asks to change it. For non-interactive use, set `CIRCLE_TOKEN`; it takes precedence over stored credentials. Set `CIRCLE_HOST` for a non-default CircleCI installation. Read [references/topics/environment.md](references/topics/environment.md) before using environment-based configuration.

Never print tokens, secret values, authorization headers, or configuration files containing them. Use `CIRCLE_NO_INTERACTIVE`, `CIRCLE_NO_PAGER`, and `CIRCLE_NO_TELEMETRY` when automation needs deterministic terminal behavior. Read [references/topics/formatting.md](references/topics/formatting.md) before relying on JSON or `jq` output.

Project-aware commands may infer a project from the current Git remote. When execution is outside a repository, the remote is ambiguous, or an action can change remote state, pass the documented project flag or ID explicitly. Do not guess a project, branch, organization, host, or resource ID.

## Preserve safe control boundaries

Inspect before acting. Treat commands that create, trigger, rerun, cancel, publish, follow, link, set, upload, delete, purge, rename, install, enable, or alter organization/project/context/policy/runner settings as state-changing. Confirm their exact target and obtain explicit user approval before executing them. `--force` suppresses a CLI prompt; it does not replace user approval.

Prefer read-only output first. Request structured output only where the selected command page documents it, and inspect its shape before extracting fields. Keep logs, API responses, artifact downloads, and generated config within the user-approved scope. Use `circleci api` only when the first-class command reference has no equivalent, and redact secret-bearing request or response data.

## Follow identifier handoffs

Use identifiers only with the receiving command documented in its page:

```text
project slug or project ID
  -> pipeline definition ID -> pipeline run
  -> run ID (or run number together with project)
  -> workflow ID
  -> job ID
  -> job step/execution, artifact, or test-result name

organization -> namespace / project / context / policy / runner resource class
context ID or name -> context restriction or secret
runner resource class -> runner instance or token
certificate ID + provisioning profile -> signing-config ID
```

Obtain a child identifier from the parent resource's documented list/get response instead of inventing it. A run number is project-relative; retain its project when passing it to a run or workflow command. Consult the exact source and destination pages whenever a resource accepts either a name, slug, number, or UUID.
