<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci policy test <path> [flags]`

Run policy tests

| Flag           | Description                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `--all`        | Show all tests, not just failures                                                                                 |
| `--explain`    | Print each test's full evaluation context (implies --all)                                                         |
| `--jq string`  | Process values from the response using jq syntax                                                                  |
| `--json`       | Output as JSON                                                                                                    |
| `--junit`      | Output results as JUnit XML                                                                                       |
| `--org string` | Organization slug (e.g. gh/myorg) or UUID for private orb resolution when a test compiles; defaults to git remote |
| `--run string` | Only run tests whose name matches this regexp                                                                     |


**Arguments:**

`<path>` is a directory of policies and tests. Append `/...`
to discover tests recursively in every subdirectory.

