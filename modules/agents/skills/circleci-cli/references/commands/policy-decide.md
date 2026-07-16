<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci policy decide [flags]`

Evaluate a config against remote policies

| Flag                      | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `--input string`          | Path to input file (e.g. .circleci/config.yml) (required) |
| `--jq string`             | Process values from the response using jq syntax          |
| `--json`                  | Output as JSON                                            |
| `--meta string`           | Decision metadata as a JSON string                        |
| `--metafile string`       | Path to decision metadata file (YAML or JSON)             |
| `--org string`            | Organization slug (e.g. gh/myorg) or UUID (required)      |
| `--policy-context string` | Policy context (default "config")                         |
| `--strict`                | Exit non-zero for HARD_FAIL or ERROR decisions            |


