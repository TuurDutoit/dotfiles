<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci certificate upload [flags]`

Upload a .p12 certificate

| Flag                 | Description                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `--cert-file string` | Path to the .p12 certificate file                                                         |
| `--jq string`        | Process values from the response using jq syntax                                          |
| `--json`             | Output as JSON                                                                            |
| `--org string`       | Organization slug (e.g. gh/myorg) or UUID; defaults to git remote                         |
| `--password string`  | Password for the .p12 file. Pass - to read from stdin. Prompted if omitted in a terminal. |


