<!-- GENERATED FILE — do not edit.
Source: `bt view trace --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Fetch spans for a single trace (root span id)

Usage: bt view trace [OPTIONS] [URL]

Arguments:
  [URL]  Braintrust app URL (same as --url)

Options:
      --json
          Output as JSON
      --object-ref <OBJECT_REF>
          Object reference, format: object_type:object_selector (project_logs|experiment|dataset)
      --project-id <PROJECT_ID>
          Project ID to query (overrides -p/--project for project_logs)
  -v, --verbose
          Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet
          Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --trace-id <TRACE_ID>
          Root span id for the trace
      --no-color
          Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --url <URL>
          Braintrust app URL to resolve to a trace
      --limit <LIMIT>
          Number of spans to fetch [default: 100]
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --preview-length <PREVIEW_LENGTH>
          Preview length for span rows [default: 125]
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
      --print-queries
          Print each BTQL query and invoke payload before execution
      --non-interactive
          Force non-interactive mode
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --cursor <CURSOR>
          Cursor returned from a previous trace fetch
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
