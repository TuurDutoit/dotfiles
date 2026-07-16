<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci context secret set <context-id|context-name> [flags]`

Set an environment variable in a context

| Flag             | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `--name string`  | Name of the environment variable                                      |
| `--org string`   | Organization slug (e.g. gh/myorg); used when resolving name to ID     |
| `--value string` | Value of the environment variable (prompted if omitted in a terminal) |


**Arguments:**

A context can be specified by name or ID:
- By name, for example, `context-name`
- By ID, for example, `849e7902-802f-4082-8a70-da77dcd084e3`

