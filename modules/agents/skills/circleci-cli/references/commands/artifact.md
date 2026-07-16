<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

### `circleci artifact <job-id> [flags]`

List and download a job's artifact files

| Flag                  | Description                                      |
| --------------------- | ------------------------------------------------ |
| `--jq string`         | Process values from the response using jq syntax |
| `--json`              | Output as JSON                                   |
| `-o, --output string` | Download artifacts into this directory           |


**Arguments:**

`<job-id>` is the UUID of the job whose artifacts you want to
list or download,
for example. `5034460f-c7c4-4c43-9457-de07e2029e7b`.

