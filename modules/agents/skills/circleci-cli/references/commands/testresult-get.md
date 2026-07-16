<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci testresult get <job-id> <name> [flags]`

Get a single test result by name

| Flag               | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `--filter <value>` | Disambiguate by classname=<value> when a name is shared; repeatable |
| `--jq string`      | Process values from the response using jq syntax                    |
| `--json`           | Output as JSON                                                      |
| `--plain`          | Print only the raw test message, verbatim and unformatted           |


**Arguments:**

`<job-id>` is the UUID of the job whose test results to search. Job
UUIDs are shown in `circleci job get` and `circleci run get --json`.

`<name>` is the exact test name to look up. If more than one test
shares that name, use `--filter classname=<value>` to disambiguate.

