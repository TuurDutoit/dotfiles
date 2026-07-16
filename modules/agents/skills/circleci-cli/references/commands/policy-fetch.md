<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci policy fetch [policy-name] [flags]`

Download the remote policy bundle

| Flag                      | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `--jq string`             | Process values from the response using jq syntax     |
| `--json`                  | Output as JSON                                       |
| `--org string`            | Organization slug (e.g. gh/myorg) or UUID (required) |
| `--policy-context string` | Policy context (default "config")                    |


**Arguments:**

`<policy-name>` is optional and fetches a single policy.
When omitted, the full policy bundle is fetched.

