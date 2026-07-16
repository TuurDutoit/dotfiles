<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci pipeline create [flags]`

Create a pipeline definition

| Flag                         | Description                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| `--checkout-provider string` | Checkout source provider (one of: github_app, github_server)            |
| `--checkout-repo-id string`  | Checkout source repo external ID                                        |
| `--config-file string`       | Config file path (e.g. .circleci/config.yml)                            |
| `--config-provider string`   | Config source provider (one of: github_app, github_server, circleci)    |
| `--config-repo-id string`    | Config source repo external ID (required for github_app, github_server) |
| `--description string`       | Pipeline definition description                                         |
| `--jq string`                | Process values from the response using jq syntax                        |
| `--json`                     | Output as JSON                                                          |
| `--name string`              | Pipeline definition name (required)                                     |
| `--project string`           | Project slug (e.g. gh/org/repo); defaults to git remote                 |
| `--project-id string`        | Project UUID (overrides --project)                                      |


