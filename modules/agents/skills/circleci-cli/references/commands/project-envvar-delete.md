<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci project envvar delete <name> [flags]`

Delete a project environment variable

| Flag               | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `-f, --force`      | skip confirmation prompt                                |
| `--project string` | Project slug (e.g. gh/org/repo); defaults to git remote |


**Arguments:**

`<name>` is the name of the environment variable to delete from
the project. This action is irreversible.

**Aliases:**


`circleci project envvar rm`

