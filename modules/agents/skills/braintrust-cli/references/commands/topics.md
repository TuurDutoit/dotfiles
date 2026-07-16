<!-- GENERATED FILE — do not edit.
Source: `bt topics --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Inspect and control Topics automation

Usage: bt topics [OPTIONS] [COMMAND]

Commands:
  status  Show Topics automation status for the active project
  config  View or edit Topics automation config
  poke    Queue Topics to run on the next executor pass
  rewind  Rewind recent Topics history and queue it to reprocess
  report  Download a saved topic map report JSON file
  btmap   Download the raw topic map (.btmap) artifact
  open    Open the Topics page in the browser
  help    Print this message or the help of the given subcommand(s)

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
  bt topics
  bt topics status
  bt topics status --full
  bt topics status --watch
  bt topics config
  bt topics config <automation-or-topic-map-id>
  bt topics config enable
  bt topics config delete
  bt topics config set --topic-window 1h --generation-cadence 1d
  bt topics config topic-map <topic-map-id>
  bt topics config topic-map set Task --embedding-model brain-embedding-1
  bt topics report fn_123
  bt topics report fn_123 --version 0000000000000001
  bt topics btmap fn_123
  bt topics btmap fn_123 --output topic-map.btmap
  bt topics poke
  bt topics rewind 7d
  bt topics open
