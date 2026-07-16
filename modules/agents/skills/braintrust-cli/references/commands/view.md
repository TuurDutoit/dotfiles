<!-- GENERATED FILE — do not edit.
Source: `bt view --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

View logs, traces, and spans

Usage: bt view [OPTIONS] [COMMAND]

Commands:
  logs       List logs (summary or spans mode)
  trace      Fetch spans for a single trace (root span id)
  span       Fetch a single span by row id (or from a URL)
  thread     Render the LLM conversation thread for a trace
  waterfall  Render a trace waterfall with timing, token, cost, and cache metrics [aliases: timeline]
  help       Print this message or the help of the given subcommand(s)

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
  bt view logs --limit 25
  bt view trace --trace-id <ROOT_SPAN_ID>
  bt view span --id <SPAN_ROW_ID>
  bt view thread --trace-id <ROOT_SPAN_ID>
  bt view waterfall --trace-id <ROOT_SPAN_ID>
