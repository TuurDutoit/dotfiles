<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci run cancel <run-number-or-id> [flags]`

Cancel a run

| Flag               | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `-f, --force`      | skip confirmation prompt                                        |
| `--project string` | Project slug (e.g. gh/org/repo); used when cancelling by number |


**Arguments:**

`<run-number-or-id>` identifies the run to cancel. A run can be specified by its UUID or number:
- A run UUID, as shown in `circleci run list --json`
- A run number, as shown in `circleci run list`.

The project is inferred from the git remote unless overridden with `--project`.

