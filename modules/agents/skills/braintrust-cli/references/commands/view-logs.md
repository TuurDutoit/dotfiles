<!-- GENERATED FILE — do not edit.
Source: `bt view logs --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

List logs (summary or spans mode)

Usage: bt view logs [OPTIONS] [URL]

Arguments:
  [URL]  Braintrust app URL to open directly (same as --url)

Options:
      --json
          Output as JSON
      --project-id <PROJECT_ID>
          Project ID to query (overrides -p/--project)
      --object-ref <OBJECT_REF>
          Object reference, format: object_type:object_selector (project_logs|experiment|dataset)
  -v, --verbose
          Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet
          Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --url <URL>
          Braintrust app URL to open directly (parses org/project/r/s/tvt)
      --limit <LIMIT>
          Number of rows to fetch [default: 50]
      --no-color
          Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --cursor <CURSOR>
          Cursor returned from a previous list call
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --preview-length <PREVIEW_LENGTH>
          Preview length for list rows [default: 125]
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --list-mode <LIST_MODE>
          List mode [default: summary] [possible values: summary, spans]
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --search <SEARCH>
          Free-text search term
      --filter <FILTER>
          Additional BTQL filter expression
      --prefer-profile
          Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --window <WINDOW>
          Relative time window (e.g. 1h, 30m, 1d) [default: 1h]
      --api-url <API_URL>
          Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --since <SINCE>
          Absolute lower bound timestamp (overrides --window)
      --app-url <APP_URL>
          Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --non-interactive
          Force non-interactive mode
      --ca-cert <CA_CERT>
          Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --print-queries
          Print each BTQL query and invoke payload before execution
      --env-file <ENV_FILE>
          Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help
          Print help
