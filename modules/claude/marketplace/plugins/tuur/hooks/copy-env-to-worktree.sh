#!/bin/bash
# WorktreeCreate hook: creates a git worktree and copies .env* files from the original repo.
# Receives JSON on stdin with { name, cwd }. Must output the worktree path on stdout.

set -euo pipefail

INPUT=$(cat)
NAME=$(echo "$INPUT" | /opt/homebrew/bin/jq -r '.name')
CWD=$(echo "$INPUT" | /opt/homebrew/bin/jq -r '.cwd')

WORKTREE_DIR="$CWD/.claude/worktrees/$NAME"

# Determine base branch
DEFAULT_BRANCH=$(git -C "$CWD" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@') || DEFAULT_BRANCH="master"

# Skip worktree creation if it already exists with the correct branch
if [ -d "$WORKTREE_DIR" ]; then
  CURRENT_BRANCH=$(git -C "$WORKTREE_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
  if [ "$CURRENT_BRANCH" = "$NAME" ]; then
    echo "Worktree already exists on branch $NAME" >&2
  else
    echo "Error: worktree at $WORKTREE_DIR exists but is on branch '$CURRENT_BRANCH', expected '$NAME'" >&2
    exit 1
  fi
elif git -C "$CWD" show-ref --verify --quiet "refs/heads/$NAME"; then
  git -C "$CWD" worktree add "$WORKTREE_DIR" "$NAME" >&2
else
  git -C "$CWD" worktree add -b "$NAME" "$WORKTREE_DIR" "$DEFAULT_BRANCH" >&2
fi

# Copy .env* files preserving directory structure (prune excluded dirs so find skips them entirely)
find "$CWD" \
  \( -name node_modules -o -name .git -o -name dist -o -name build \
     -o -name .next -o -name .nuxt -o -name .output -o -name coverage \
     -o -name .cache -o -name .claude -o -name __pycache__ \
     -o -name .venv -o -name venv -o -name vendor -o -name .turbo \) -prune \
  -o \( -name '.env*' -o -name '*.env' -o -name '*.env.*' \) -type f -print \
  | while IFS= read -r src; do
    rel="${src#"$CWD"/}"
    dest="$WORKTREE_DIR/$rel"
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
    echo "Copied $rel" >&2
  done

# Output the worktree path (required by Claude Code)
echo "$WORKTREE_DIR"
