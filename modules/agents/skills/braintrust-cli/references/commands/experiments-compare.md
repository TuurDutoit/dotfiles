<!-- GENERATED FILE — do not edit.
Source: `bt experiments compare --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Compare summary metrics for up to eight experiments

Usage: bt experiments compare [OPTIONS] [BASE_OR_URL] [COMPARISON]...

Arguments:
  [BASE_OR_URL]    Base experiment name, or a Braintrust experiment comparison URL
  [COMPARISON]...  Comparison experiment names; up to seven may be provided

Options:
      --json                     Output as JSON
      --url <URL>                Braintrust experiment comparison URL
      --base <BASE>              Base experiment name
  -v, --verbose                  Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -c, --comparison <COMPARISON>  Comparison experiment name; may be passed multiple times
  -q, --quiet                    Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --all                      Include zero/no-change rows in the summary table
      --no-color                 Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --no-input                 Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --profile <PROFILE>        Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -o, --org <ORG_NAME>           Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>        Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --prefer-profile           Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>        Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>        Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>        Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>      Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                     Print help
