<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci policy diff <path> [flags]`

Show diff between local and remote policy bundles

| Flag                      | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `--jq string`             | Process values from the response using jq syntax     |
| `--json`                  | Output as JSON                                       |
| `--org string`            | Organization slug (e.g. gh/myorg) or UUID (required) |
| `--policy-context string` | Policy context (default "config")                    |


**Arguments:**

`<path>` is the path to a local directory of .rego policy files,
for example, "./policies". Its contents are compared against the remote
policy bundle.

