<!-- GENERATED FILE — do not edit.
Source: `bt eval --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Run eval files

Usage: bt eval [OPTIONS] [FILE]... [-- <ARG>...]

Arguments:
  [FILE]...  Eval files, directories, or glob patterns to execute (e.g. foo.eval.ts, tests/, "**/*.eval.ts"). Defaults to the current directory
  [ARG]...   Arguments forwarded to the eval file via process.argv (everything after `--`). Example: bt eval foo.eval.ts -- --description "Prod" --shard=1/4

Options:
      --json
          Output as JSON
  -v, --verbose
          Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet
          Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color
          Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
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
  -r, --runner <RUNNER>
          Eval runner binary (e.g. tsx, bun, ts-node, deno, python). Defaults to tsx for JS files [env: BT_EVAL_RUNNER=]
  -l, --language <LANGUAGE>
          Force eval language instead of inferring from file extensions [env: BT_EVAL_LANGUAGE=] [possible values: java-script, python]
      --no-send-logs
          Run evals locally (do not send logs to Braintrust) [env: BT_EVAL_LOCAL=]
      --jsonl
          Output one JSON summary per evaluator [env: BT_EVAL_JSONL=]
      --terminate-on-failure
          Stop after the first failing evaluator [env: BT_EVAL_TERMINATE_ON_FAILURE=]
      --num-workers <COUNT>
          Number of worker threads for Python eval execution [env: BT_EVAL_NUM_WORKERS=]
      --list
          List evaluators without executing them [env: BT_EVAL_LIST=]
      --filter <FILTER>
          Filter expression(s) used to select which evaluators to run [env: BT_EVAL_FILTER=]
      --first <N>
          Run only the first N dataset records. Marks the run as non-final [env: BT_EVAL_FIRST=]
      --sample <N>
          Run a deterministic random sample of N dataset records. Marks the run as non-final [env: BT_EVAL_SAMPLE=]
      --sample-seed <SEED>
          Seed used with --sample [env: BT_EVAL_SAMPLE_SEED=]
  -w, --watch
          Re-run evals when input files change [env: BT_EVAL_WATCH=]
      --param <KEY=JSON_VALUE | JSON_OBJECT>
          Override one or more evaluator parameters for this run. Accepts key=value pairs where the value is JSON (e.g. --param model='"gpt-4o"' --param enabled=true), or a single JSON object (e.g. --param '{"model":"gpt-4o"}'). Repeat the flag to set multiple parameters
      --matrix-param <KEY=V1,V2,... | KEY=[JSON_ARRAY]>
          Run the selected eval once per combination of matrix values. Two value formats are supported: key=v1,v2,v3          comma-separated (each value parsed as JSON, falling back to string) key=[JSON_ARRAY]      JSON array, e.g. --matrix-param model='["gpt-4","hello, world"]' Use the JSON array form when values must contain commas. Repeat the flag to sweep multiple keys; the Cartesian product of all values is run. Requires exactly one eval after filters; multiple evals error out
      --dev
          Start the eval dev web server [env: BT_EVAL_DEV=]
      --dev-host <DEV_HOST>
          Host interface for eval dev server [env: BT_EVAL_DEV_HOST=] [default: localhost]
      --dev-port <DEV_PORT>
          Port for eval dev server [env: BT_EVAL_DEV_PORT=] [default: 8300]
      --dev-org-name <DEV_ORG_NAME>
          Restrict eval dev server access to a specific org name [env: BT_EVAL_DEV_ORG_NAME=]
      --dev-allowed-origin <ORIGIN>
          Additional allowed browser origin(s) for eval dev server CORS checks. Repeat this flag or set BT_EVAL_DEV_ALLOWED_ORIGIN as a comma-separated list [env: BT_EVAL_DEV_ALLOWED_ORIGIN=]
  -h, --help
          Print help

Examples:
  bt eval my.eval.ts
  bt eval --no-send-logs --runner tsx my.eval.ts
  bt eval --language python my_eval.py
