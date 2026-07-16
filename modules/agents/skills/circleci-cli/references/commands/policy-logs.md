<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci policy logs [decision-id] [flags]`

Get policy decision logs

| Flag                      | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `--after string`          | Return logs created after this time (RFC3339 or YYYY-MM-DD)   |
| `--before string`         | Return logs created before this time (RFC3339 or YYYY-MM-DD)  |
| `--branch string`         | Filter by branch name                                         |
| `--jq string`             | Process values from the response using jq syntax              |
| `--json`                  | Output as JSON                                                |
| `--org string`            | Organization slug (e.g. gh/myorg) or UUID (required)          |
| `--out string`            | Write output to this file instead of stdout                   |
| `--policy-bundle`         | Retrieve the policy bundle snapshot for the given decision ID |
| `--policy-context string` | Policy context (default "config")                             |
| `--project-id string`     | Filter by project ID                                          |
| `--status string`         | Filter by decision status (PASS, SOFT_FAIL, HARD_FAIL, ERROR) |


**Arguments:**

`<decision-id>` is optional and retrieves a single log entry.
When omitted, all logs are returned (paginated automatically).

