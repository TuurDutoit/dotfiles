<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

#### `circleci config process <path> [flags]`

Compile and expand a pipeline config file

| Flag                           | Description                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `-n, --next`                   | Enable config next which previews upcoming potentially breaking config changes               |
| `--org string`                 | Organization slug (e.g. gh/myorg) or UUID for private orb resolution; defaults to git remote |
| `--pipeline-parameters string` | Pipeline parameters as a YAML map or path to a YAML file                                     |


**Arguments:**

`<path>` is the path to a pipeline config file to compile,
for example, `.circleci/config.yml`. Pass `-` to read the config
from stdin.

