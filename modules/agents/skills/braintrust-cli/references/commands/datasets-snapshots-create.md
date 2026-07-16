<!-- GENERATED FILE — do not edit.
Source: `bt datasets snapshots create --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Create a new snapshot for a dataset

Usage: bt datasets snapshots create [OPTIONS] [DATASET] [SNAPSHOT]

Arguments:
  [DATASET]   Dataset name (positional)
  [SNAPSHOT]  Snapshot name (positional)

Options:
      --json                 Output as JSON
  -n, --name <NAME_FLAG>     Snapshot name (flag)
  -v, --verbose              Increase output verbosity [env: BRAINTRUST_VERBOSE=]
      --xact-id <XACT_ID>    Transaction id to snapshot. Defaults to the dataset's current head xact [env: BT_DATASETS_SNAPSHOT_XACT_ID=]
      --description <TEXT>   Optional snapshot description [env: BT_DATASETS_SNAPSHOT_DESCRIPTION=]
  -q, --quiet                Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color             Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
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
