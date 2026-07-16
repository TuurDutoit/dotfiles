<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci project envvar set <name> <value> [flags]`

Set a project environment variable

| Flag               | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `--project string` | Project slug (e.g. gh/org/repo); defaults to git remote |


**Arguments:**

`<name>` is the name of the environment variable to create or
update. `<value>` is the value to store; it is never retrievable
after being set and is masked in all subsequent list output.

