<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci run get [<run-id>] [flags]`

Get a run's status

| Flag                  | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `-b, --branch string` | Branch name (defaults to the current branch, or main when --project is set) |
| `--jq string`         | Process values from the response using jq syntax                            |
| `--json`              | Output as JSON                                                              |
| `-m, --mine`          | Filter to runs owned by you.                                                |
| `--no-interactive`    | Skip the interactive picker and resolve the latest run directly             |
| `--project string`    | Project slug (e.g. gh/org/repo); used for latest-run lookup                 |


**Arguments:**

`<run-id>` is optional and is the UUID of the run to look up. When
omitted, the latest run is resolved from the project and branch
inferred from the current git repository's remote and checked-out
branch (override with `--project` and `--branch`). With
`--project` set, the branch defaults to main unless `--branch` is given.

