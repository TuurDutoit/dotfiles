<!-- GENERATED FILE — do not edit.
Source: `bt functions push --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Push local function definitions

Usage: bt functions push [OPTIONS] [PATH]...

Arguments:
  [PATH]...  File or directory path(s) to scan for function definitions

Options:
      --file <PATH>                     File or directory path(s) to scan for function definitions [env: BT_FUNCTIONS_PUSH_FILES=]
      --json                            Output as JSON
      --if-exists <IF_EXISTS>           Behavior when a function with the same slug already exists [env: BT_FUNCTIONS_PUSH_IF_EXISTS=] [default: error] [possible values: error, replace, ignore]
  -v, --verbose                         Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet                           Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --terminate-on-failure            Stop after the first hard failure [env: BT_FUNCTIONS_PUSH_TERMINATE_ON_FAILURE=]
      --create-missing-projects         Create referenced projects automatically when they do not exist [env: BT_FUNCTIONS_PUSH_CREATE_MISSING_PROJECTS=]
      --no-color                        Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --no-input                        Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --runner <RUNNER>                 Override runner binary (e.g. tsx, vite-node, deno, python) [env: BT_FUNCTIONS_PUSH_RUNNER=]
      --language <LANGUAGE>             Force runtime language selection [env: BT_FUNCTIONS_PUSH_LANGUAGE=] [default: auto] [possible values: auto, javascript, python]
      --profile <PROFILE>               Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -o, --org <ORG_NAME>                  Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
      --requirements <PATH>             Optional Python requirements file [env: BT_FUNCTIONS_PUSH_REQUIREMENTS=]
  -p, --project <PROJECT>               Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --tsconfig <PATH>                 Optional tsconfig path for JS runner and bundler [env: BT_FUNCTIONS_PUSH_TSCONFIG=]
      --external-packages <PACKAGE>...  Additional packages to mark external during JS bundling. SDK dependencies (for example `braintrust`) are bundled by default [env: BT_FUNCTIONS_PUSH_EXTERNAL_PACKAGES=]
      --prefer-profile                  Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
  -y, --yes                             Skip confirmation prompt
      --api-url <API_URL>               Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>               Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>               Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>             Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                            Print help
