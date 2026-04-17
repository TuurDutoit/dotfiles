---
name: lora
description: Use when running local apps that need staging domain routing, setting up worktrees with dev servers, or dynamically binding ports to *.datacamp-staging.com subdomains via Lora
---

# Lora

Lora is an internal proxy tool that maps `*.datacamp-staging.com` subdomains to local ports. Override management is only available via the HTTP API at `http://localhost:1074` (the `lora` CLI does not have override commands).

## When to Use

- Registering a locally running app on a staging subdomain
- Running multiple instances of the same app (e.g. parallel worktrees) on different ports
- Checking which subdomains are currently routed

## API Reference

All mutation endpoints require `?batch=1` and a batch-wrapped JSON body.

### List all overrides

```
GET http://localhost:1074/trpc/override.all
```

Response: `{ result: { data: { json: { "<pattern>": <config> } } } }`

### Register/update an override

```
POST http://localhost:1074/trpc/override.set?batch=1
Content-Type: application/json

{"0":{"json":{"initialPattern":"","pattern":"*://<subdomain>.datacamp-staging.com/*","override":{"type":"server","port":<PORT>,"enabled":true},"uiSource":"ui-config-add"}}}
```

- `initialPattern`: empty string for new overrides, original pattern when renaming
- `uiSource`: use `"ui-config-add"` for new, `"ui-config-edit"` for updates

### Delete an override

```
POST http://localhost:1074/trpc/override.delete?batch=1
Content-Type: application/json

{"0":{"json":{"pattern":"*://<subdomain>.datacamp-staging.com/*"}}}
```

## Naming Convention for Parallel Instances

When running multiple instances of the same app, append the port to the subdomain:

| App | Port | Subdomain |
|-----|------|-----------|
| practice-api | 3005 | `practice-api.datacamp-staging.com` (default) |
| practice-api | 3010 | `practice-api-3010.datacamp-staging.com` |
| practice-api | 3011 | `practice-api-3011.datacamp-staging.com` |

## Common Mistakes

- **Missing `?batch=1`**: Without it, `override.set` and `override.delete` return a BAD_REQUEST error.
- **Wrong procedure name**: It's `override.set`, not `override.add` or `override.create`.
- **Flat payload**: The body must use the nested `{"0":{"json":{...}}}` batch format.
