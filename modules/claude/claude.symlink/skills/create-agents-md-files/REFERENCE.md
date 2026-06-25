# AGENTS.md Template

The audience is agents, not humans. Every line must state a fact an agent cannot infer from the repo itself — if a line restates defaults, tool output, or anything discoverable in one obvious file (e.g. `package.json` scripts), delete it. Remove any section with nothing repo-specific to say.

The template below is a skeleton, not a fixed schema. Add other sections when they genuinely guide an agent — e.g. `## Architecture` (non-obvious module boundaries), `## Gotchas` (surprising behaviour that wastes agent time), `## Deployment`, `## Testing notes`. The test for any extra section is the same as for any line: repo-specific signal an agent can't cheaply discover, within the size budget.

```markdown
# [repo-name]

[repo-name]: <what it does, one line> (<API/web/CLI/worker>).

## Stack

- <runtime + pinned version, e.g. Node 24 (.nvmrc)>
- <package manager if not the default, e.g. yarn v4 via corepack>
- <framework / DB / other facts only if non-obvious>

## Commands

| Command       | Purpose      |
| ------------- | ------------ |
| `<install>`   | install deps |
| `<dev/run>`   | run locally  |
| `<test>`      | tests        |
| `<lint>`      | lint         |
| `<format>`    | format       |
| `<build>`     | build        |
| `<typecheck>` | typecheck    |

## Rules

- Never commit secrets or `.env*` (except `.env.example`); never log tokens or auth headers.
- Use repo tooling, not global installs; never hardcode missing secrets — use env vars.
- <one line per repo-specific convention that linters don't enforce>
```

Notes:

- Commands: if a `justfile` exists, list `just <recipe>` forms and omit the underlying commands they wrap — agents should use the justfile interface, not bypass it. List only non-standard ones otherwise; standard `npm test`-style defaults add nothing. The exact heading is flexible — keep a commands section with a recognisable name (`Commands`, `Usage`, `Just Commands`) so other skills (e.g. `create-justfile`) can find and substitute it.
- Stack: omit entries that are defaults or visible in the manifest. "Docker: no" is noise; "prefer `docker compose up` for dev" is signal.
- Rules: the two security/tooling lines above are the maximum generic content allowed — everything else must be repo-specific.
