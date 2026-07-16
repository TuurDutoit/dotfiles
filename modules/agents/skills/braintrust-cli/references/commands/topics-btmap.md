<!-- GENERATED FILE — do not edit.
Source: `bt topics btmap --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Download the raw topic map (.btmap) artifact

Usage: bt topics btmap [OPTIONS] [FUNCTION_ID]

Arguments:
  [FUNCTION_ID]  Topic map function ID

Options:
      --id <ID>              Topic map function ID [env: BT_TOPICS_BTMAP_FUNCTION_ID=]
      --json                 Output as JSON
  -v, --verbose              Increase output verbosity [env: BRAINTRUST_VERBOSE=]
      --version <VERSION>    Specific topic map version/xact ID [env: BT_TOPICS_BTMAP_VERSION=]
      --output <OUTPUT>      Output file path. Omit to write the .btmap bytes to stdout [env: BT_TOPICS_BTMAP_OUTPUT=]
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
