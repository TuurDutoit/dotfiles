<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

### `circleci api <path> [flags]`

Call the CircleCI REST API directly

| Flag                       | Description                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- |
| `-d, --data string`        | Raw request body sent verbatim; @file reads from a file, @- from stdin            |
| `-f, --field stringArray`  | Add a field: key=value (query param for GET/DELETE, JSON body for POST/PUT/PATCH) |
| `-H, --header stringArray` | Add a request header: "Key: Value"                                                |
| `--jq string`              | Process values from the response using jq syntax                                  |
| `-X, --method string`      | HTTP method (default: GET, or POST when -f or -d is used)                         |


**Arguments:**

`<path>` is the request path. It is relative to /api/v3 by default
(for example, "projects/{project-id}"). To target
a different version prefix, include it explicitly, for example, "api/v2/me".

