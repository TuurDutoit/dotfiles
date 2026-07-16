<!-- GENERATED FILE — do not edit.
Source: `bt sync pull --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Download objects from Braintrust into local JSONL files/directories

Usage: bt sync pull [OPTIONS] [OBJECT_REF]

Arguments:
  [OBJECT_REF]  Source object reference, format object_type:object_id_or_name. Supported: - project_logs:<project-id|project-name> - experiment:<experiment-id|experiment-name> (requires --project for names) - dataset:<dataset-id|dataset-name> (requires --project for names)

Options:
      --filter <FILTER>        SQL filter expression
      --json                   Output as JSON
  -v, --verbose                Increase output verbosity [env: BRAINTRUST_VERBOSE=]
      --window <WINDOW>        Relative time window (e.g. 1h, 30m, 3d) [env: BT_SYNC_WINDOW=] [default: 3d]
  -q, --quiet                  Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --traces <TRACES>        Number of traces to fetch (default when no limit flag is set)
      --no-color               Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --spans <SPANS>          Number of spans to fetch
      --no-input               Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --page-size <PAGE_SIZE>  Page size for BTQL pagination [default: 1000]
      --cursor <CURSOR>        Initial cursor for spans mode. Implies a fresh run
      --profile <PROFILE>      Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --fresh                  Ignore previous state and start over for this spec
  -o, --org <ORG_NAME>         Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>      Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --root <ROOT>            Root directory for sync artifacts [default: bt-sync]
      --workers <WORKERS>      Number of concurrent workers for trace fetch mode [default: 18]
      --include-vectors        Include stored vectors in pulled rows so a subsequent push can re-ingest them
      --prefer-profile         Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>      Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>      Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>      Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>    Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                   Print help
