<!-- GENERATED FILE — do not edit.
Source: `bt setup --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Configure Braintrust setup flows

Usage: bt setup [OPTIONS] [COMMAND]

Commands:
  skills      Configure coding-agent skills to use Braintrust
  instrument  Download instrumentation docs and run a coding agent to instrument this repo
  mcp         Configure MCP server settings for coding agents
  doctor      Diagnose coding-agent setup for Braintrust
  help        Print this message or the help of the given subcommand(s)

Options:
      --json
          Output as JSON

  -v, --verbose
          Increase output verbosity
          
          [env: BRAINTRUST_VERBOSE=]

  -q, --quiet
          Reduce interactive UI output
          
          [env: BRAINTRUST_QUIET=]

      --no-color
          Disable ANSI color output
          
          [env: BRAINTRUST_NO_COLOR=]

      --no-input
          Disable all interactive prompts
          
          [env: BRAINTRUST_NO_INPUT=]

      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE)
          
          [env: BRAINTRUST_PROFILE=]

  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME)
          
          [env: BRAINTRUST_ORG_NAME=]

  -p, --project <PROJECT>
          Override active project
          
          [env: BRAINTRUST_DEFAULT_PROJECT]

      --prefer-profile
          Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set

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

      --skills
          Also install reusable coding-agent skills (persistent, opt-in)

      --no-skills
          Do not set up reusable coding-agent skills
          
          [aliases: --no-skill]

      --mcp
          Set up MCP server

      --no-mcp
          Do not set up MCP server [default]

      --instrument
          Run instrumentation agent [default]

      --no-instrument
          Do not run instrumentation agent (skills and MCP are still configured)

      --tui
          Run the agent in interactive TUI mode [default]

      --background
          Run the agent in background (non-interactive) mode. Use --verbose to see the agent output

      --language <LANGUAGES>
          Language(s) to instrument (repeatable; case-insensitive). When provided, the agent skips language auto-detection and instruments the specified language(s) directly

          Possible values:
          - python
          - typescript: TypeScript / JavaScript
          - go
          - csharp:     C# / csharp
          - java
          - ruby

  -i, --interactive
          Run the interactive setup wizard, prompting for every choice not already specified as a flag

      --agent <AGENT>
          Agent to configure
          
          [possible values: claude, codex, copilot, cursor, gemini, opencode, qwen]

      --local
          Configure the current git repo root

      --global
          Configure user-wide state [default]

      --workflow <WORKFLOWS>
          Workflow docs to prefetch (repeatable) [default: all]
          
          [possible values: instrument, observe, annotate, evaluate, deploy, all]

      --no-workflow
          Do not fetch workflow docs during setup

      --refresh-docs
          Refresh prefetched docs by clearing existing output before download

      --workers <WORKERS>
          Number of concurrent workers for docs prefetch/download
          
          [default: 18]

      --yolo
          Grant the agent full permissions (bypass permission prompts)

  -h, --help
          Print help (see a summary with '-h')

Examples:
  bt setup --agent cursor --workflow observe
  bt setup skills --agent codex --global
  bt setup mcp --agent codex
