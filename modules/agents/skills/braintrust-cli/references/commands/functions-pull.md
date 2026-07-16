<!-- GENERATED FILE — do not edit.
Source: `bt functions pull --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Pull remote function definitions

Usage: bt functions pull [OPTIONS] [SLUG]...

Arguments:
  [SLUG]...  Function slug(s) to pull

Options:
      --json                     Output as JSON
  -s, --slug <SLUG_FLAG>         Function slug(s) to pull [env: BT_FUNCTIONS_PULL_SLUG=]
      --output-dir <PATH>        Destination directory for generated files [env: BT_FUNCTIONS_PULL_OUTPUT_DIR=] [default: ./braintrust]
  -v, --verbose                  Increase output verbosity [env: BRAINTRUST_VERBOSE=]
      --language <LANGUAGE>      Output language [env: BT_FUNCTIONS_PULL_LANGUAGE=] [default: typescript] [possible values: typescript, python]
  -q, --quiet                    Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color                 Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --project-id <PROJECT_ID>  Project id filter [env: BT_FUNCTIONS_PULL_PROJECT_ID=]
      --id <ID>                  Function id selector [env: BT_FUNCTIONS_PULL_ID=]
      --no-input                 Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --profile <PROFILE>        Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --version <VERSION>        Version selector [env: BT_FUNCTIONS_PULL_VERSION=]
      --force                    Overwrite targets even when dirty [env: BT_FUNCTIONS_PULL_FORCE=]
  -o, --org <ORG_NAME>           Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>        Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --prefer-profile           Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>        Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>        Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>        Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>      Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                     Print help
