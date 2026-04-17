#!/bin/bash
# PostToolUse hook: runs format and lint --fix on the changed file, if scripts exist.

set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

# Skip if no file path found
if [[ -z "$FILE" ]]; then
  exit 0
fi

# Find the nearest package.json
PKG="$CWD/package.json"
if [[ ! -f "$PKG" ]]; then
  exit 0
fi

# Run format on the changed file if the script exists
if jq -e '.scripts.format' "$PKG" > /dev/null 2>&1; then
  yarn --cwd "$CWD" format "$FILE" >&2 2>&1 || true
fi

# Run lint --fix on the changed file if the script exists
if jq -e '.scripts.lint' "$PKG" > /dev/null 2>&1; then
  yarn --cwd "$CWD" lint --quiet --fix "$FILE" >&2 2>&1 || true
fi

exit 0
