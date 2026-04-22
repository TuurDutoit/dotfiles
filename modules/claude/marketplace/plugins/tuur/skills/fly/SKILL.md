---
name: fly
description: "Use when checking, triggering, or debugging Concourse CI pipelines via the `fly` CLI. Covers targets, teams, pipelines, jobs, builds, watching logs, hijacking containers, and common gotchas around cross-team queries and version sync."
---

# Concourse `fly` CLI

`fly` is the CLI for Concourse CI. It talks to a Concourse server via a **target** (a saved alias for a server + credentials). Targets live in `~/.flyrc`; tokens typically expire after ~1 day.

Official reference: https://concourse-ci.org/docs/fly/

## Core model

- Everything is scoped to a **target** — pass `-t <target>` on every command (intentionally stateless so you can't accidentally hit the wrong environment).
- Targets belong to a **team**. Teams own **pipelines**. Pipelines contain **jobs**. Jobs produce **builds**. Jobs use **resources** (inputs/outputs).
- The target's login has a default team. Commands filtered to "this team" by default unless you pass `-a` (all teams) or `-n <team>`.

## Setup / auth

```sh
fly -t <target> login                 # interactive login (opens browser or prompts)
fly -t <target> login -n <team>       # login scoped to a specific team
fly targets                           # list known targets + token expiration
fly -t <target> status                # check if token still valid
fly -t <target> userinfo              # see which teams/roles you have
fly -t <target> logout                # drop token for this target
fly -t <target> sync                  # update local CLI to match server version
```

**Version mismatch gotcha:** If the server and CLI differ, commands refuse with a "version discrepancy" error. Run `fly -t <target> sync`. If sync fails (e.g. `failed to open tgz archive: ... fly-darwin-arm64.tgz`), the server doesn't have the binary for your platform — download it manually from the Concourse web UI footer ("cli: darwin / linux / windows") and `chmod +x`.

## Discovery

```sh
fly -t <target> teams                           # list teams you can see
fly -t <target> pipelines                       # pipelines in YOUR team only
fly -t <target> pipelines -a                    # pipelines across ALL teams you have access to
fly -t <target> pipelines --include-archived    # include archived ones
fly -t <target> jobs -p <pipeline> -n <team>    # jobs in a pipeline
fly -t <target> resources -p <pipeline> -n <team>
```

**Cross-team gotcha:** By default, pipeline/job/build lookups only search your current team. If the pipeline is owned by another team, you MUST pass `-n <team>` (a.k.a. `--team`). Without it you'll get `pipeline not found` even though the pipeline exists.

Find which team owns a pipeline:
```sh
fly -t <target> pipelines -a | grep <name>
```

## Pipeline management

```sh
fly -t <target> set-pipeline -p <name> -c pipeline.yml      # create/update
fly -t <target> get-pipeline -p <name>                      # fetch config as YAML
fly -t <target> get-pipeline -p <name> --json               # ... as JSON
fly -t <target> pause-pipeline -p <name>                    # stop scheduling
fly -t <target> unpause-pipeline -p <name>
fly -t <target> expose-pipeline -p <name>                   # make public
fly -t <target> hide-pipeline -p <name>
fly -t <target> rename-pipeline --old-name a --new-name b
fly -t <target> archive-pipeline -p <name>                  # pause+hide+delete config (keeps logs)
fly -t <target> destroy-pipeline -p <name>                  # delete everything
fly -t <target> order-pipelines --pipeline a --pipeline b   # reorder UI
```

All of the above accept `-n <team>` for pipelines in other teams.

## Jobs and builds

```sh
fly -t <target> trigger-job -j <pipeline>/<job> [-w]        # kick a new build; -w watches logs
fly -t <target> watch -j <pipeline>/<job>                   # stream latest (or a specific) build
fly -t <target> watch -j <pipeline>/<job> -b <build>
fly -t <target> pause-job -j <pipeline>/<job>
fly -t <target> unpause-job -j <pipeline>/<job>
fly -t <target> builds -j <pipeline>/<job> -c 10            # last 10 builds for a job
fly -t <target> builds -p <pipeline> -c 20                  # all recent builds in a pipeline
fly -t <target> builds -n <team> -c 30                      # last 30 builds across the team
fly -t <target> builds -a -c 50                             # across all teams (use sparingly)
fly -t <target> builds --since 2026-04-22
```

**Flag-consistency gotcha:** `-n <team>` doesn't always compose cleanly with `-p <pipeline>` on the `builds` subcommand — some fly versions report `pipeline not found` for that combo. Workaround: query by team only (`-n <team> -c N`) and grep for the pipeline name. Or use `-j <pipeline>/<job>` for a specific job (fly resolves the team from the job spec). Use `-j` whenever you know the exact job — it's the most reliable form.

**Job names with spaces:** Concourse jobs often have spaces (e.g. `deploy foo in prod`). In shells, quote them or escape: `-j 'pipeline/deploy foo in prod'`. When filtering output with grep, the space is literal.

## Resources

```sh
fly -t <target> resources -p <pipeline>                     # list inputs/outputs
fly -t <target> check-resource -r <pipeline>/<resource>     # force a fresh check
fly -t <target> pin-resource -r <pipeline>/<resource> -v version:<v>
fly -t <target> unpin-resource -r <pipeline>/<resource>
fly -t <target> trigger-resource-check -r <pipeline>/<resource>
```

## Debugging a running build

```sh
fly -t <target> hijack -j <pipeline>/<job>                  # latest build of a job
fly -t <target> hijack -j <pipeline>/<job> -b <build>       # specific build
fly -t <target> hijack -b <build-id>                        # any build by global ID
fly -t <target> hijack ... -s <step-name>                   # pick a specific step container
fly -t <target> hijack ... -- bash                          # override the command to run
```

Hijack drops you into a shell in the step's container — useful for reproducing failures with the exact inputs the step saw.

## Useful recipes

**"Was my merge deployed?"** (the case this skill was born from)
1. `gh api repos/<org>/<repo>/commits/<branch> --jq '{sha, message, date}'` → confirm the merge commit.
2. `fly -t <target> pipelines -a | grep <service>` → find the pipeline + team.
3. `fly -t <target> builds -n <team> -c 30 | grep <service>` → see all recent builds for that service. Look for deploy jobs around the expected time.
4. Confirm each deploy step succeeded and the "promote to next environment" jobs completed for every region.

**"Why did a build fail?"**
```sh
fly -t <target> builds -j <pipeline>/<job> -n <team> -c 5
fly -t <target> watch -j <pipeline>/<job> -b <failing-build-id>    # get logs
fly -t <target> hijack -j <pipeline>/<job> -b <failing-build-id>   # poke around the container
```

**"Retrigger after a fix"**
```sh
fly -t <target> trigger-job -j <pipeline>/<job> -w
```

## Output parsing

Most list commands print a human table by default. For programmatic use, check for a `--json` flag on the specific subcommand (supported on `get-pipeline`, some others). When no JSON mode is available, pipe to `awk` or `grep` — output is stable but column-aligned, so prefer splitting on whitespace rather than fixed widths.

## Safety

- **Destructive:** `destroy-pipeline`, `archive-pipeline`, `destroy-team` — confirm before running; Concourse prompts interactively but you can bypass with `-n` (non-interactive) on some versions.
- **Shared effect:** `trigger-job`, `pause-pipeline`, `set-pipeline`, `pin-resource` — these change shared state for everyone on the team. Check with a human before running in prod environments.
- **Read-only and safe:** `pipelines`, `jobs`, `builds`, `resources`, `watch`, `get-pipeline`, `userinfo`, `targets`, `status`.
