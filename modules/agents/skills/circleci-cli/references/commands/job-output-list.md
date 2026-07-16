<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci job output list <job-id> [flags]`

List a job's steps with their output

| Flag              | Description                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `--execution int` | Parallel execution index to list output from                                                    |
| `--jq string`     | Process values from the response using jq syntax                                                |
| `--json`          | Output as JSON                                                                                  |
| `--tail int`      | Show only the last N lines of each step's output in the rendered view (0 for all) (default 200) |


**Arguments:**

`<job-id>` is the UUID of the job whose steps and output to list. Job
UUIDs are shown in the output of `circleci workflow get` and
`circleci job get`.

