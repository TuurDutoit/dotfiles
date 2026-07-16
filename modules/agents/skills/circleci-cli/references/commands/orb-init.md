<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci orb init <path> [flags]`

Initialize a new orb project

| Flag              | Description                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `--branch string` | primary git branch to track (default "main")                                              |
| `--org string`    | Organization slug (e.g. gh/myorg) or UUID to own the orb namespace and publishing context |
| `--private`       | initialize a private orb                                                                  |
| `--remote string` | remote git repository URL (required for git setup when non-interactive)                   |
| `--skip-git`      | skip local git repository setup                                                           |
| `--template-only` | download the template only; skip all setup                                                |


**Arguments:**

- `<path>` is the directory to scaffold the orb project into. It is
  created if it does not exist.

