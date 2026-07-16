<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci runner token delete <token-id> [flags]`

Delete a runner token

| Flag          | Description              |
| ------------- | ------------------------ |
| `-f, --force` | skip confirmation prompt |


**Arguments:**

`<token-id>` is the ID of the token to delete (a UUID). Find token IDs
with: `circleci runner token list --resource-class <namespace/name>`

**Aliases:**


`circleci runner token rm`

