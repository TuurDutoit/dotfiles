<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci namespace create <name> --org <org> [flags]`

Create a namespace

| Flag           | Description                                                                     |
| -------------- | ------------------------------------------------------------------------------- |
| `--jq string`  | Process values from the response using jq syntax                                |
| `--json`       | Output as JSON                                                                  |
| `--org string` | Organization slug (e.g. gh/myorg) or UUID to claim the namespace for (required) |


**Arguments:**

`<name>` is the namespace name to create. It must be globally unique
across CircleCI, for example, `myorg`.

