# Dimension: Security & Trust Boundaries (`security`)

Reviews against injection, authn/authz flaws, secret leaks, and trust boundary violations.

## Diff mode

Examine every point where the change crosses or handles a trust boundary:
- **Injection**: SQL/NoSQL query construction, shell commands, path traversal, template/HTML injection, unsafe deserialization, dynamic `eval`-style execution.
- **Authn/Authz**: is authorization enforced on new endpoints/actions? Can unauthenticated or lower-privileged users reach them? Missing permission checks on new resources.
- **Secrets**: hardcoded credentials/tokens, secrets logged or returned in responses, secrets in URLs.
- **User input**: validation of anything user-controlled before use in queries, redirects, filenames, or HTML.
- **Cross-boundary data**: data from other services/users treated as trusted; mass assignment; SSRF via user-supplied URLs.
- **Session/auth cookies**: new endpoints/flags that weaken session handling.

Judge severity by **concrete exploitability and blast radius** in this codebase's context, not by abstract paranoia or theoretical "might" concerns without a reachable vector. Verify every finding by tracing data flow in the diff and reading ancillary source files at the checkout path before reporting — if an apparent issue cannot be exploited or reached given existing middleware, types, or routing, **drop it**.

## Spec / plan mode

Only if the design touches auth, trust boundaries, user data, or external input: does the plan state the security model — who may do what, what is validated where, how secrets are handled — and are those statements complete enough to implement safely?

## What to look for

Vulnerabilities with a concrete, reachable exploit path introduced or aggravated by this change.
