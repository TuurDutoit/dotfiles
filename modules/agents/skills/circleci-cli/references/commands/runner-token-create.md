<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci runner token create <resource-class> [flags]`

Create a token for a resource class

| Flag                | Description                                      |
| ------------------- | ------------------------------------------------ |
| `--jq string`       | Process values from the response using jq syntax |
| `--json`            | Output as JSON                                   |
| `--nickname string` | Human-readable nickname for the token            |


**Arguments:**

`<resource-class>` is the runner resource class to create a token for,
in the form `namespace/name` (for example, `my-org/my-runner`).

