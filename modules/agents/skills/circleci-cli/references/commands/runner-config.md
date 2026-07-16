<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci runner config <resource-class> [flags]`

Generate a runner agent configuration file

| Flag                  | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `--nickname string`   | Nickname for the new token                                |
| `-o, --output string` | Write config to this file instead of stdout               |
| `--token string`      | Use an existing token value instead of creating a new one |


**Arguments:**

`<resource-class>` is the runner resource class to generate config for,
in the form `namespace/name` (for example, `my-org/my-runner`).

