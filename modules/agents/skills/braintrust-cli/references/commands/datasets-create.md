<!-- GENERATED FILE — do not edit.
Source: `bt datasets create --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Create a new dataset, optionally seeding rows from a file, --rows, or stdin

Usage: bt datasets create [OPTIONS] [NAME]

Arguments:
  [NAME]  Dataset name (positional)

Options:
      --json                 Output as JSON
  -n, --name <NAME_FLAG>     Dataset name (flag)
  -d, --description <TEXT>   Optional dataset description [env: BT_DATASETS_DESCRIPTION=]
  -v, --verbose              Increase output verbosity [env: BRAINTRUST_VERBOSE=]
      --file <PATH>          JSON/JSONL input file. If omitted, bt reads dataset rows from --rows or stdin [env: BT_DATASETS_FILE=]
  -q, --quiet                Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color             Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --rows <JSON>          Inline dataset rows as JSON, such as an array of row objects [env: BT_DATASETS_ROWS=]
      --id-field <PATH>      Dot-separated field path used to read stable record ids. Escape literal dots with `\.` and literal backslashes with `\\` [env: BT_DATASETS_ID_FIELD=] [default: id]
      --no-input             Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --profile <PROFILE>    Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -o, --org <ORG_NAME>       Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>    Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --prefer-profile       Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>    Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>    Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>    Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>  Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                 Print help
