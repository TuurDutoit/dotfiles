<!-- GENERATED FILE — do not edit.
Source: `bt sql --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Run SQL queries against Braintrust

Usage: bt sql [OPTIONS] [QUERY]

Arguments:
  [QUERY]  SQL query to execute

Options:
      --json
          Output as JSON
  -v, --verbose
          Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet
          Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color
          Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
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
      --non-interactive
          Force non-interactive mode
      --force-ignore-linter
          Run the query even when the SQL linter reports failures [env: BRAINTRUST_SQL_FORCE_IGNORE_LINTER=]
      --async
          Run through the async SQL API [env: BRAINTRUST_SQL_ASYNC=]
      --async-batch-size <ASYNC_BATCH_SIZE>
          Rows to write per async query execution batch [env: BRAINTRUST_SQL_ASYNC_BATCH_SIZE=]
      --no-wait
          Submit an async query and print the automation id without waiting for results [env: BRAINTRUST_SQL_ASYNC_NO_WAIT=]
      --poll-interval <POLL_INTERVAL>
          Seconds between async status polls [env: BRAINTRUST_SQL_ASYNC_POLL_INTERVAL=] [default: 2]
      --wait-timeout <WAIT_TIMEOUT>
          Maximum time to wait for async query completion, for example 10m, 1h, or 7d [env: BRAINTRUST_SQL_ASYNC_WAIT_TIMEOUT=]
      --async-result-limit <ASYNC_RESULT_LIMIT>
          Rows to fetch per async result page [env: BRAINTRUST_SQL_ASYNC_RESULT_LIMIT=] [default: 1000]
  -h, --help
          Print help

Examples:
  bt sql "SELECT * FROM project_logs('<PROJECT_ID>') LIMIT 5"
  cat query.sql | bt sql
  bt sql --non-interactive "SELECT count(*) FROM project_logs('<PROJECT_ID>')"
