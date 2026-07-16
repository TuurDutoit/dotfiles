<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci workflow cancel <workflow-id> [flags]`

Cancel a running workflow

| Flag          | Description              |
| ------------- | ------------------------ |
| `-f, --force` | skip confirmation prompt |


**Arguments:**

`<workflow-id>` is the UUID of the workflow to cancel. Workflow IDs are
shown in the output of `circleci run get`.

