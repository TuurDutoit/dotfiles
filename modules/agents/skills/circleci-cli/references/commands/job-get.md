<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci job get <job-id> [flags]`

Get job details

| Flag          | Description                                      |
| ------------- | ------------------------------------------------ |
| `--jq string` | Process values from the response using jq syntax |
| `--json`      | Output as JSON                                   |


**Arguments:**

`<job-id>` is the UUID of the job to look up. Job UUIDs are shown in
the output of `circleci workflow get` and `circleci run get --json`.

