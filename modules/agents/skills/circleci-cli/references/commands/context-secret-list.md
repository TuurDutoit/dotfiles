<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci context secret list <context-id|context-name> [flags]`

List environment variables in a context

| Flag           | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `--jq string`  | Process values from the response using jq syntax                  |
| `--json`       | Output as JSON                                                    |
| `--org string` | Organization slug (e.g. gh/myorg); used when resolving name to ID |


**Arguments:**

A context can be specified by name or ID:
- By name, for example, `context-name`
- By ID, for example, `849e7902-802f-4082-8a70-da77dcd084e3`

**Aliases:**


`circleci context secret ls`

