<!-- GENERATED FILE — do not edit.
Source: `bt docs fetch --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Download workflow docs markdown from Mintlify llms index

Usage: bt docs fetch [OPTIONS]

Options:
      --json                     Output as JSON
      --llms-url <LLMS_URL>      llms index URL (Mintlify markdown index) [default: https://www.braintrust.dev/docs/llms.txt]
      --output-dir <OUTPUT_DIR>  Output directory for downloaded docs [default: .bt/skills/docs]
  -v, --verbose                  Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet                    Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --workflow <WORKFLOWS>     Workflow(s) to include (repeatable) [possible values: instrument, observe, annotate, evaluate, deploy, all]
      --dry-run                  Discover links only; do not write files
      --no-color                 Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --no-input                 Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --strict                   Fail command if any page download fails
      --profile <PROFILE>        Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --refresh                  Refresh docs by clearing output directory before download
  -o, --org <ORG_NAME>           Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
      --workers <WORKERS>        Number of concurrent workers for docs downloads [default: 18]
  -p, --project <PROJECT>        Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --prefer-profile           Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>        Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>        Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>        Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>      Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                     Print help
