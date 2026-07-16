<!-- GENERATED FILE — do not edit.
Source: `bt setup skills --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Configure coding-agent skills to use Braintrust

Usage: bt setup skills [OPTIONS]

Options:
      --agent <AGENT>         Agent to configure [possible values: claude, codex, copilot, cursor, gemini, opencode, qwen]
      --json                  Output as JSON
      --local                 Configure the current git repo root
  -v, --verbose               Increase output verbosity [env: BRAINTRUST_VERBOSE=]
      --global                Configure user-wide state [default]
  -q, --quiet                 Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color              Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --workflow <WORKFLOWS>  Workflow docs to prefetch (repeatable) [default: all] [possible values: instrument, observe, annotate, evaluate, deploy, all]
      --no-input              Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --no-workflow           Do not fetch workflow docs during setup
      --profile <PROFILE>     Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --refresh-docs          Refresh prefetched docs by clearing existing output before download
  -o, --org <ORG_NAME>        Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
      --workers <WORKERS>     Number of concurrent workers for docs prefetch/download [default: 18]
  -p, --project <PROJECT>     Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --yolo                  Grant the agent full permissions (bypass permission prompts)
      --prefer-profile        Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>     Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>     Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>     Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>   Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help                  Print help
