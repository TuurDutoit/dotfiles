<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci workflow get <workflow-id> [flags]`

Get workflow details

| Flag          | Description                                      |
| ------------- | ------------------------------------------------ |
| `--jq string` | Process values from the response using jq syntax |
| `--json`      | Output as JSON                                   |


**Arguments:**

`<workflow-id>` is the UUID of the workflow to look up. Workflow IDs are
shown in the output of `circleci run get`.

