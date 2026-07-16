<!-- GENERATED FILE — do not edit.
Source: `bt datasets pipeline pull --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Pull source trace/span refs to JSONL

Usage: bt datasets pipeline pull [OPTIONS] <PIPELINE>

Arguments:
  <PIPELINE>  Dataset pipeline file to execute

Options:
      --json
          Output as JSON
      --name <NAME>
          Pipeline name, required when the file defines multiple pipelines
  -r, --runner <RUNNER>
          Runner binary (e.g. tsx, vite-node, ts-node, python) [env: BT_DATASET_PIPELINE_RUNNER=]
  -v, --verbose
          Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet
          Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --root <ROOT>
          Root directory for pipeline artifacts [default: bt-sync]
      --no-color
          Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --source-project <SOURCE_PROJECT>
          Override the source project name from the pipeline file
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --source-project-id <SOURCE_PROJECT_ID>
          Override the source project id from the pipeline file
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --source-org <SOURCE_ORG>
          Override the source org name from the pipeline file
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
      --source-filter <SOURCE_FILTER>
          Override the source filter from the pipeline file
      --limit <LIMIT>
          Maximum number of source refs to discover [default: 100]
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --root-span-id <ROOT_SPAN_IDS>
          Restrict the source query to one or more root span ids
      --prefer-profile
          Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --window <WINDOW>
          Relative time window for source ref discovery when --root-span-id is not set [env: BT_DATASET_PIPELINE_WINDOW=] [default: 1d]
      --api-url <API_URL>
          Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --page-size <PAGE_SIZE>
          Page size for discovery BTQL pagination [default: 1000]
      --app-url <APP_URL>
          Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --out <OUT>
          Output JSONL file. Defaults to a managed path under --root
      --ca-cert <CA_CERT>
          Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>
          Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help
          Print help
