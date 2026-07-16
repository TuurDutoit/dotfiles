<!-- GENERATED FILE — do not edit.
Source: `bt functions invoke --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Invoke a function

Usage: bt functions invoke [OPTIONS] [SLUG]

Arguments:
  [SLUG]  Function slug

Options:
      --json                  Output as JSON
  -s, --slug <SLUG_FLAG>      Function slug
  -i, --input <INPUT>         JSON input to the function
  -v, --verbose               Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -m, --message <MESSAGE>     User message (repeatable, for LLM functions)
  -q, --quiet                 Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --mode <MODE>           Response format: auto, json, text, parallel
      --no-color              Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --no-input              Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --version <VERSION>     Pin to a specific function version
      --profile <PROFILE>     Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -t, --type <FUNCTION_TYPE>  Filter by function type (for interactive selection) [possible values: llm, scorer, task, tool, custom-view, preprocessor, facet, classifier, tag, parameters]
  -o, --org <ORG_NAME>        Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>     Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --prefer-profile        Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>     Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>     Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>     Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>   Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                  Print help

Examples:
  bt functions invoke my-fn --input '{"key": "value"}'
  bt functions invoke my-fn --message "What is 2+2?"
  bt functions invoke my-fn -i '{"my-var": "A very long text..."}' -m "Summarize this"
  bt functions invoke my-fn --mode json --version abc123
