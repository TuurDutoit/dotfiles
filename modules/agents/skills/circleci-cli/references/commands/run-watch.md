<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci run watch [<run-id>] [flags]`

Watch a run until it completes

| Flag                  | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `-b, --branch string` | Branch to watch (defaults to current branch)                           |
| `--failfast`          | Exit as soon as any job fails, without waiting for the rest of the run |
| `--project string`    | Project slug (e.g. gh/org/repo); defaults to git remote                |
| `--sha string`        | Watch run for this commit SHA; polls up to 2m if not yet created       |
| `--timeout duration`  | Maximum time to wait for run completion (default 30m0s)                |


**Arguments:**

`<run-id>` is optional and selects the run to watch. A run can be specified by its UUID or number:
- A run UUID, as shown in `circleci run list --json`
- A run number, as shown in `circleci run list`.

The project is inferred from the git remote unless overridden with `--project`.

When omitted, the latest run for the current branch is watched
(override the branch with `--branch`, or match a commit with `--sha`).

