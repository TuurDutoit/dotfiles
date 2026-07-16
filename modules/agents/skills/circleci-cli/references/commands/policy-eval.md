<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci policy eval <policy-path> [flags]`

Evaluate a raw OPA query against policies locally

| Flag                           | Description                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `--context string`             | Policy context (config compilation only runs when this is "config") (default "config")       |
| `--input string`               | Path to input file (e.g. .circleci/config.yml) (required)                                    |
| `--jq string`                  | Process values from the response using jq syntax                                             |
| `--json`                       | Output as JSON                                                                               |
| `--meta string`                | Decision metadata as a JSON string                                                           |
| `--metafile string`            | Path to decision metadata file (YAML or JSON)                                                |
| `--no-compile`                 | Evaluate the raw config without compiling it first                                           |
| `--org string`                 | Organization slug (e.g. gh/myorg) or UUID for private orb resolution; defaults to git remote |
| `--pipeline-parameters string` | Pipeline parameters as a YAML map or path to a YAML file                                     |
| `--query string`               | The OPA query to evaluate (default "data")                                                   |


**Arguments:**

`<policy-path>` is the path to a .rego policy file or a directory
of policy files to evaluate.

