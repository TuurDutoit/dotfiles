#!/bin/bash
input=$(cat)

MODEL=$(echo "$input" | jq -r '.model.display_name')
DIR=$(echo "$input" | jq -r '.workspace.current_dir')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
DURATION_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')

CYAN='\033[36m'; GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'; RESET='\033[0m'

# Pick bar color based on context usage
if [ "$PCT" -ge 90 ]; then BAR_COLOR="$RED"
elif [ "$PCT" -ge 70 ]; then BAR_COLOR="$YELLOW"
else BAR_COLOR="$GREEN"; fi

FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
BAR=$(printf "%${FILLED}s" | tr ' ' '█')$(printf "%${EMPTY}s" | tr ' ' '░')

TOTAL_MINS=$((DURATION_MS / 60000)); HOURS=$((TOTAL_MINS / 60)); MINS=$((TOTAL_MINS % 60))

# Git info with caching
CACHE_FILE="/tmp/statusline-git-cache-$(echo "$DIR" | md5sum 2>/dev/null | cut -c1-8 || echo "$DIR" | md5 2>/dev/null | cut -c1-8)"
CACHE_MAX_AGE=5  # seconds

cache_is_stale() {
    [ ! -f "$CACHE_FILE" ] || \
    [ $(($(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0))) -gt $CACHE_MAX_AGE ]
}

if cache_is_stale; then
    if git -C "$DIR" rev-parse --git-dir > /dev/null 2>&1; then
        BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)
        STAGED=$(git -C "$DIR" diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
        MODIFIED=$(git -C "$DIR" diff --numstat 2>/dev/null | wc -l | tr -d ' ')
        printf '%s|%s|%s' "$BRANCH" "$STAGED" "$MODIFIED" > "$CACHE_FILE"
    else
        printf '||' > "$CACHE_FILE"
    fi
fi

IFS='|' read -r BRANCH STAGED MODIFIED < "$CACHE_FILE"

COST_FMT=$(printf '$%.2f' "$COST")

if [ -n "$BRANCH" ]; then
    printf "${CYAN}[%s]${RESET} %s | 🌿 %s +%s ~%s\n" "$MODEL" "${DIR##*/}" "$BRANCH" "$STAGED" "$MODIFIED"
else
    printf "${CYAN}[%s]${RESET} %s\n" "$MODEL" "${DIR##*/}"
fi

printf "${BAR_COLOR}%s${RESET} %s%% | ${YELLOW}%s${RESET} | %dh %dm\n" "$BAR" "$PCT" "$COST_FMT" "$HOURS" "$MINS"
