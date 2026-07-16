<!-- GENERATED FILE — do not edit.
Source: `bt datasets snapshots restore --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Restore a dataset to a saved snapshot

Usage: bt datasets snapshots restore [OPTIONS] [DATASET]

Arguments:
  [DATASET]  Dataset name (positional)

Options:
      --json                 Output as JSON
  -n, --name <NAME>          Saved snapshot name to restore [env: BT_DATASETS_SNAPSHOT_RESTORE_NAME=]
      --snapshot <XACT_ID>   Transaction id to restore [env: BT_DATASETS_SNAPSHOT_RESTORE_XACT_ID=] [aliases: --version]
  -v, --verbose              Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -f, --force                Skip confirmation after preview and apply the restore [env: BT_DATASETS_SNAPSHOT_RESTORE_FORCE=]
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
