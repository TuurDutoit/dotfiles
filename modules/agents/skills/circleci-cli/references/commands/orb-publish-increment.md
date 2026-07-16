<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci orb publish increment <path> <namespace>/<orb> --bump major|minor|patch [flags]`

Increment and publish a new orb version

| Flag            | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `--bump string` | which version segment to increment: major, minor, or patch |


**Arguments:**

- `<path>` is the path to the orb YAML to publish. Pass `-` to read from stdin.
- `<namespace>/<orb>` is the orb to publish, for example, `namespace/orb-name`.

