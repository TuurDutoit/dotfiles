<!-- GENERATED FILE — do not edit.
Source: `bt --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->


  ███  ███
███      ███
  ███  ███
███      ███
  ███  ███


bt is the CLI for interacting with your Braintrust projects - bt <COMMAND>

Core
  init         Initialize .bt config directory and files
  auth         Authenticate bt with Braintrust
  switch       Switch org and project context
  view         View logs, traces, and spans

Projects & resources
  projects     Manage projects
  topics       Inspect and control Topics automation
  datasets     Manage datasets
  prompts      Manage prompts
  functions    Manage functions (tools, scorers, and more)
  tools        Manage tools
  scorers      Manage scorers
  experiments  Manage experiments

Data & evaluation
  datasets     Manage datasets
  eval         Run eval files
  sql          Run SQL queries against Braintrust
  sync         Synchronize project logs between Braintrust and local NDJSON files

Additional
  docs         Manage workflow docs for coding agents
  self         Self-management commands
  setup        Configure Braintrust setup flows
  status       Show current org and project context

Flags
      --profile <PROFILE>    Use a saved login profile [env: BRAINTRUST_PROFILE]
  -o, --org <ORG>            Override active org [env: BRAINTRUST_ORG_NAME]
      -p, --project <PROJECT>    Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --json                 Output as JSON
  -v, --verbose              Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet                Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color             Disable ANSI color output
      --no-input             Disable all interactive prompts
      --api-url <URL>        Override API URL [env: BRAINTRUST_API_URL]
      --app-url <URL>        Override app URL [env: BRAINTRUST_APP_URL]
      --ca-cert <PATH>       Path to PEM CA bundle [env: BRAINTRUST_CA_CERT; overrides SSL_CERT_FILE]
      --env-file <PATH>      Path to a .env file to load
  -h, --help                 Print help
  -V, --version              Print version

LEARN MORE
Use `bt <command> <subcommand> --help` for more information about a command.
Read the manual at https://braintrust.dev/docs/reference/cli
