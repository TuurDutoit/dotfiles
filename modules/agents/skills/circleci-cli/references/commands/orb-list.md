<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci orb list [<namespace>] [flags]`

List orbs in the registry

| Flag            | Description                                      |
| --------------- | ------------------------------------------------ |
| `--jq string`   | Process values from the response using jq syntax |
| `--json`        | Output as JSON                                   |
| `--private`     | only list private orbs (requires namespace)      |
| `--uncertified` | include uncertified orbs                         |


**Arguments:**

- `<namespace>` is optional. When given, lists all orbs in that namespace.
  When omitted, lists certified orbs globally.

**Aliases:**


`circleci orb ls`

