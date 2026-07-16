<!-- GENERATED FILE — do not edit.
Source: `bt sync push --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Upload local JSONL rows back into Braintrust

Usage: bt sync push [OPTIONS] <OBJECT_REF>

Arguments:
  <OBJECT_REF>  Destination object reference, format object_type:object_id_or_name. Supported: - project_logs:<project-id|project-name> - experiment:<experiment-id|experiment-name> (requires --project for names) - dataset:<dataset-id|dataset-name> (requires --project for names)

Options:
      --in <INPUT>
          Input JSONL/NDJSON file or directory of part files. If omitted, bt sync uses the latest completed pull output
      --json
          Output as JSON
      --filter <FILTER>
          SQL filter expression (used in spec hashing / pull auto-resolution)
  -v, --verbose
          Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet
          Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --traces <TRACES>
          Upload rows belonging to at most N distinct root traces
      --no-color
          Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --spans <SPANS>
          Upload at most N span rows
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --page-size <PAGE_SIZE>
          Rows per upload batch [default: 1000]
      --fresh
          Ignore previous state and start over for this spec
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
      --root <ROOT>
          Root directory for sync artifacts [default: bt-sync]
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --workers <WORKERS>
          Number of concurrent workers for upload mode [default: 18]
      --max-batch-bytes <MAX_BATCH_BYTES>
          Maximum approximate input bytes per upload batch [env: BT_SYNC_PUSH_MAX_BATCH_BYTES=] [default: 16777216]
      --max-in-flight-bytes <MAX_IN_FLIGHT_BYTES>
          Maximum approximate input bytes held by in-flight upload batches [env: BT_SYNC_PUSH_MAX_IN_FLIGHT_BYTES=] [default: 134217728]
      --prefer-profile
          Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>
          Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>
          Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>
          Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>
          Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help
          Print help
