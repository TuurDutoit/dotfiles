<!-- GENERATED FILE — do not edit.
Source: `bt topics config set --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Update editable Topics config fields

Usage: bt topics config set [OPTIONS]

Options:
      --automation-id <AUTOMATION_ID>
          Specific automation ID to update
      --json
          Output as JSON
      --name <NAME>
          Human-friendly automation name
  -v, --verbose
          Increase output verbosity [env: BRAINTRUST_VERBOSE=]
      --description <DESCRIPTION>
          Human-friendly automation description
  -q, --quiet
          Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color
          Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --topic-window <WINDOW>
          Topic window duration, for example 1h or 1d
      --generation-cadence <CADENCE>
          How often Topics should try to generate fresh topic maps, for example 1h or 1d
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --relabel-overlap <RELABEL_OVERLAP>
          Relabel overlap duration, for example 1h
      --idle-time <IDLE>
          Trace idle wait duration, for example 30s
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --sampling-rate <SAMPLING_RATE>
          Percent of matching traces to sample, for example 25 or 25%
      --filter <FILTER>
          BTQL filter used to select which traces get facets and topics
      --clear-filter
          Clear the top-level BTQL filter
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
