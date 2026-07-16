<!-- GENERATED FILE — do not edit.
Source: `bt setup instrument --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Download instrumentation docs and run a coding agent to instrument this repo

Usage: bt setup instrument [OPTIONS]

Options:
      --agent <AGENT>
          Agent to run for instrumentation
          
          [possible values: claude, codex, copilot, cursor, gemini, opencode, qwen]

      --json
          Output as JSON

      --agent-cmd <AGENT_CMD>
          Command to run the selected agent (overrides built-in defaults)

  -v, --verbose
          Increase output verbosity
          
          [env: BRAINTRUST_VERBOSE=]

  -q, --quiet
          Reduce interactive UI output
          
          [env: BRAINTRUST_QUIET=]

      --workflow <WORKFLOWS>
          Latest workflow docs to provide to the instrumentation agent (repeatable; always includes instrument) [default: all]
          
          [possible values: instrument, observe, annotate, evaluate, deploy, all]

      --no-color
          Disable ANSI color output
          
          [env: BRAINTRUST_NO_COLOR=]

      --no-workflow
          

      --no-input
          Disable all interactive prompts
          
          [env: BRAINTRUST_NO_INPUT=]

      --refresh-docs
          Deprecated: setup docs are always fetched fresh and are not cached

      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE)
          
          [env: BRAINTRUST_PROFILE=]

      --workers <WORKERS>
          Number of concurrent workers for docs prefetch/download
          
          [default: 18]

      --language <LANGUAGES>
          Language(s) to instrument (repeatable; case-insensitive). When provided, the agent skips language auto-detection and instruments the specified language(s) directly. Accepted values: python, typescript, javascript, go, csharp, c#, java, ruby

          Possible values:
          - python
          - typescript: TypeScript / JavaScript
          - go
          - csharp:     C# / csharp
          - java
          - ruby

  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME)
          
          [env: BRAINTRUST_ORG_NAME=]

  -p, --project <PROJECT>
          Override active project
          
          [env: BRAINTRUST_DEFAULT_PROJECT]

      --tui
          Run the agent in interactive TUI mode [default]

      --background
          Run the agent in background (non-interactive) mode. Use --verbose to see the agent output

      --prefer-profile
          Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set

      --yolo
          Grant the agent full permissions (bypass permission prompts)

      --api-url <API_URL>
          Override API URL (or via BRAINTRUST_API_URL)
          
          [env: BRAINTRUST_API_URL]

      --app-url <APP_URL>
          Override app URL (or via BRAINTRUST_APP_URL)
          
          [env: BRAINTRUST_APP_URL]

      --ca-cert <CA_CERT>
          Path to a PEM-encoded CA bundle used for HTTPS requests
          
          [env: BRAINTRUST_CA_CERT]

      --env-file <ENV_FILE>
          Path to a .env file to load before running commands
          
          [env: BRAINTRUST_ENV_FILE]

  -h, --help
          Print help (see a summary with '-h')
