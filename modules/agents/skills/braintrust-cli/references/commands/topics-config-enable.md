<!-- GENERATED FILE — do not edit.
Source: `bt topics config enable --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Enable Topics for this project with the provided config

Usage: bt topics config enable [OPTIONS]

Options:
      --json
          Output as JSON
      --name <NAME>
          Human-friendly automation name
      --description <DESCRIPTION>
          Human-friendly automation description
  -v, --verbose
          Increase output verbosity [env: BRAINTRUST_VERBOSE=]
  -q, --quiet
          Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --topic-window <WINDOW>
          Topic window duration, for example 1h or 1d
      --generation-cadence <CADENCE>
          How often Topics should try to generate fresh topic maps, for example 1h or 1d
      --no-color
          Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --relabel-overlap <RELABEL_OVERLAP>
          Relabel overlap duration, for example 1h
      --idle-time <IDLE>
          Trace idle wait duration, for example 30s
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
      --sampling-rate <SAMPLING_RATE>
          Percent of matching traces to sample, for example 25 or 25%
      --filter <FILTER>
          BTQL filter used to select which traces get facets and topics
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --clear-filter
          Clear the top-level BTQL filter
      --facet <FACETS>
          Facet labels to enable. Reuse the built-in defaults by omitting this flag
      --prefer-profile
          Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --api-url <API_URL>
          Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --embedding-model <EMBEDDING_MODEL>
          Embedding model used for new topic maps
      --app-url <APP_URL>
          Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --ca-cert <CA_CERT>
          Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --env-file <ENV_FILE>
          Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
  -h, --help
          Print help
