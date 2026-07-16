<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci job artifact <job-id> [flags]`

List or download artifacts for a job

| Flag                  | Description                                      |
| --------------------- | ------------------------------------------------ |
| `--jq string`         | Process values from the response using jq syntax |
| `--json`              | Output as JSON                                   |
| `-o, --output string` | Download artifacts into this directory           |


**Arguments:**

`<job-id>` is the UUID of the job whose artifacts to list or download.
Job UUIDs are shown in the output of `circleci workflow get` and
`circleci run get --json`.

