<!-- GENERATED FILE — do not edit.
Source: `bt datasets pipeline push --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Push transformed dataset rows to the pipeline target

Usage: bt datasets pipeline push [OPTIONS] <PIPELINE>

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
      --target-project <TARGET_PROJECT>
          Override the target project name from the pipeline file
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --target-project-id <TARGET_PROJECT_ID>
          Override the target project id from the pipeline file
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --target-org <TARGET_ORG>
          Override the target org name from the pipeline file
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
      --target-dataset <TARGET_DATASET>
          Override the target dataset name from the pipeline file
      --in <INPUT>
          Input transformed dataset row JSONL file. Defaults to the latest transform output under --root
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --fresh
          Ignore previous sync push state and upload from the beginning
      --prefer-profile
          Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>
          Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --app-url <APP_URL>
          Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>
          Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>
          Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help
          Print help
