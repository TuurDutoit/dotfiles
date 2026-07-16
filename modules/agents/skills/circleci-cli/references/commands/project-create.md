<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci project create [project-name] --org <vcs/org-slug> [flags]`

Create a new project

| Flag           | Description                       |
| -------------- | --------------------------------- |
| `--json`       | Output as JSON                    |
| `--org string` | organization slug (e.g. gh/myorg) |


**Arguments:**

[project-name] is the name for the new project and is optional.
When omitted, the current git repository's name is used: In a
terminal you are prompted with the name of the current git repository as the default, and in
non-interactive mode it is used automatically.

