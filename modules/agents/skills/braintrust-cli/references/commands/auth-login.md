<!-- GENERATED FILE — do not edit.
Source: `bt auth login --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Authenticate with Braintrust (OAuth or API key)

Usage: bt auth login [OPTIONS]

Options:
      --json                   Output as JSON
      --oauth                  Use OAuth login instead of API key login
      --client-id <CLIENT_ID>  OAuth client id (defaults to bt_cli_<profile>)
  -v, --verbose                Increase output verbosity [env: BRAINTRUST_VERBOSE=]
      --no-browser             Do not try to open a browser automatically
  -q, --quiet                  Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color               Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --no-input               Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --profile <PROFILE>      Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -o, --org <ORG_NAME>         Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>      Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --prefer-profile         Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>      Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>      Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>      Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>    Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                   Print help
