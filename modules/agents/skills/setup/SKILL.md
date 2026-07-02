---
name: setup
description: Set up and start ALL applications in the current repo. Installs dependencies, runs checks, starts every app, and verifies they're running.
---

# Setup

This skill uses a subagent for preparatory work, then starts apps in the main agent so they survive after the subagent exits.

## Step 1 — Preparation (subagent)

Spawn a single subagent to do all of the following:

1. **Install dependencies and run checks** using the `install` skill.

2. **Start external dependencies** (e.g. `docker-compose up -d`) if the project requires them.

3. **Find ALL app start commands** by checking (in order):
   - `AGENTS.md` or `CLAUDE.md` in the repo root or subdirectories
   - `README.md`, `CONTRIBUTING.md`
   - Config files: `package.json`, `Makefile`, `Cargo.toml`, `pyproject.toml`, `Gemfile`, `go.mod`, etc.
   - If none found, inspect the repo structure to infer the stack.

   **Important:** A repo may contain multiple startable apps (e.g. several frontend apps, a backend + worker, etc.). Identify and include **all** of them — not just the first one found. Check for multiple `package.json` files in subdirectories, multiple build targets, or separate services listed in docs/configs.

4. **Generate a random port number** for each app with `echo $RANDOM`.

5. **Determine the Lora subdomain** for each app. Use the app/service name as the subdomain (e.g. `practice-api` → `practice-api.datacamp-staging.com`). For parallel instances, append the port (e.g. `practice-api-12345.datacamp-staging.com`).

6. **Output the exact start commands** that should be run, including `PORT` environment variables, and the corresponding Lora subdomain for each. For example:
   ```
   PORT=12345 npm run start:dev        → practice-api-12345.datacamp-staging.com
   PORT=23456 npm run start:worker     → practice-worker-23456.datacamp-staging.com
   ```
   In a monorepo, there could be multiple apps — output a separate command for each with its own random port.

The subagent must NOT start the apps itself. It only outputs the commands.

## Step 2 — Start apps (main agent)

Using the exact commands and Lora subdomains returned by the subagent:

1. **Run each start command** as a background Bash task (`run_in_background: true`).

2. **Register Lora routes** for each app using the `/lora` skill's API reference:
   ```bash
   curl -s -X POST 'http://localhost:1074/trpc/override.set?batch=1' \
     -H 'Content-Type: application/json' \
     -d '{"0":{"json":{"initialPattern":"","pattern":"*://<subdomain>.datacamp-staging.com/*","override":{"type":"server","port":<PORT>,"enabled":true},"uiSource":"ui-config-add"}}}'
   ```

3. **Verify the app is actually running**:
   - For a backend/API: make an HTTP request with curl (e.g. health check endpoint) and confirm a successful response.
   - For a frontend: use the Chrome MCP plugin to load the page and confirm it renders.
   - If there are issues (app doesn't start, errors), don't try to fix them, just mention them in your report.

4. **Report back** to the user with:
   - What port(s) the app is running on
   - The Lora subdomain(s) registered for each app
   - Which checks passed/failed
   - Confirmation that the app is responding

Keep the apps running in the background after setup is complete.

## Teardown

When the user asks to stop the apps (or when stopping tasks):

1. **Remove Lora routes** for each app:
   ```bash
   curl -s -X POST 'http://localhost:1074/trpc/override.delete?batch=1' \
     -H 'Content-Type: application/json' \
     -d '{"0":{"json":{"pattern":"*://<subdomain>.datacamp-staging.com/*"}}}'
   ```

2. **Stop the background tasks.**
