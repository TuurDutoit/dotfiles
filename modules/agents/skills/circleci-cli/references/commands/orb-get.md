<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci orb get <namespace>/<orb>[@<version>]/<orb-id> [flags]`

Get orb metadata and statistics

| Flag          | Description                                      |
| ------------- | ------------------------------------------------ |
| `--jq string` | Process values from the response using jq syntax |
| `--json`      | Output as JSON                                   |


**Arguments:**

An orb can be specified by name or ID:
- By name, for example, `namespace/orb-name`, optionally with a version, for example, `namespace/orb-name@1.2.3`
- By ID, the orb ID (UUID), for example, `849e7902-802f-4082-8a70-da77dcd084e3`

