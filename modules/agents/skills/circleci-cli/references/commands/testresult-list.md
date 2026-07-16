<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci testresult list <job-id> [flags]`

List test results for a job

| Flag                   | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `--all`                | Show all results (passing, failed and skipped), not just failures |
| `--filter stringArray` | Filter tests by key=value (result, name, classname); repeatable   |
| `--jq string`          | Process values from the response using jq syntax                  |
| `--json`               | Output as JSON                                                    |
| `--limit int`          | Maximum number of results to show (0 = no limit)                  |
| `--sort string`        | Sort by name, classname, result or run_time                       |


**Arguments:**

`<job-id>` is the UUID of the job whose test results to list. Job
UUIDs are shown in `circleci job get` and `circleci run get --json`.

**Aliases:**


`circleci testresult ls`

