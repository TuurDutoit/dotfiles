<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci context restriction delete <context-id|context-name> [flags]`

Delete a restriction from a context

| Flag                      | Description                                                       |
| ------------------------- | ----------------------------------------------------------------- |
| `-f, --force`             | Skip confirmation prompt                                          |
| `--org string`            | Organization slug (e.g. gh/myorg); used when resolving name to ID |
| `--restriction-id string` | UUID of the restriction to delete                                 |


**Arguments:**

A context can be specified by name or ID:
- By name, for example, `context-name`
- By ID, for example, `849e7902-802f-4082-8a70-da77dcd084e3`

**Aliases:**


`circleci context restriction rm`

