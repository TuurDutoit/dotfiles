<!-- GENERATED FILE — do not edit.
Source: `bt datasets snapshots --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Manage dataset snapshots

Usage: bt datasets snapshots [OPTIONS] <COMMAND>

Commands:
  list     List snapshots for a dataset
  create   Create a new snapshot for a dataset
  delete   Delete a saved dataset snapshot
  restore  Restore a dataset to a saved snapshot
  help     Print this message or the help of the given subcommand(s)

Options:
      --json                 Output as JSON
  -v, --verbose              Increase output verbosity [env: BRAINTRUST_VERBOSE=]
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

Examples:
  bt datasets snapshots list my-dataset
  bt datasets snapshots create my-dataset
  bt datasets snapshots create my-dataset baseline
  bt datasets snapshots create my-dataset baseline --xact-id 1000192656880881099
  bt datasets snapshots delete my-dataset baseline
  bt datasets snapshots delete my-dataset --snapshot 1000192656880881099 --force
  bt datasets snapshots restore my-dataset
  bt datasets snapshots restore my-dataset --name baseline
  bt datasets snapshots restore my-dataset --snapshot 1000192656880881099 --force
