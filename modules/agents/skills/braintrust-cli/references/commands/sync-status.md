<!-- GENERATED FILE — do not edit.
Source: `bt sync status --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Show the local state/manifest for a sync spec

Usage: bt sync status [OPTIONS] <OBJECT_REF>

Arguments:
  <OBJECT_REF>  Object reference, format: object_type:object_id (e.g. project_logs:1234-uuid)

Options:
      --direction <DIRECTION>  Direction for status lookup [default: pull] [possible values: pull, push]
      --json                   Output as JSON
      --filter <FILTER>        SQL filter expression
  -v, --verbose                Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet                  Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --traces <TRACES>        Trace limit for this spec
      --no-color               Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --spans <SPANS>          Span limit for this spec
      --no-input               Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --page-size <PAGE_SIZE>  Page size used in this spec [default: 1000]
      --profile <PROFILE>      Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --root <ROOT>            Root directory for sync artifacts [default: bt-sync]
      --include-vectors        Include vector-aware pull specs when resolving status (pull direction only)
  -o, --org <ORG_NAME>         Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>      Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --prefer-profile         Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>      Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>      Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>      Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>    Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                   Print help
