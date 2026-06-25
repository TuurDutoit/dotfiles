---
name: dc-team-lx-ask-for-pr-review
description: 'Post a message in the #lx-tickets Slack channel asking for a review on a GitHub pull request. Use when the user wants to share a PR in #lx-tickets or ask for a code review from the Learner Experience team.'
allowed-tools:
  - Bash
  - Read
  - mcp__claude_ai_Slack__slack_send_message
  - mcp__claude_ai_Slack__slack_send_message_draft
metadata:
  version: '1.1.0'
---

# Ask for PR Review

## Context

Post a message in the #lx-tickets Slack channel (ID: C053C1BJN2Y) asking for a review on a GitHub pull request.

## Arguments

The user provides a GitHub pull request URL as argument: $ARGUMENTS

If no URL is provided, check the current branch for an open PR using `gh pr view --json url` and use that.

## Writing style

Keep it short, professional, and friendly. The message should:

- Start with the PR link in Slack format: `<url|Short label>` — label is typically "PR in repo-name"
- Follow with a brief, lowercase summary of the changes (one line)
- End with a polite review request like "Could someone take a look? :pray:" or "Would appreciate a review :pray:"
- Keep it to 1-2 lines max

Examples:

- `<https://github.com/datacamp-engineering/main-app/pull/15091|PR in main-app> emitting the new event dc.chapters-ai-native.completed.v0. Could someone take a look? :hugging_face:`
- `<https://github.com/datacamp-engineering/campus-api/pull/590|PR in campus-api> adding a proxy endpoint for Optima translations. Would appreciate a review :pray:`
- `<https://github.com/datacamp-engineering/main-app/pull/15103|PR in main-app> fixing intermittent 500s on ai-native progress endpoints. Could I get a review? :please:`

## Usage

1. Extract the repo name and PR number from the URL
2. Read the PR title and description using `gh pr view` to understand what it does
3. Compose a short message following the style above
4. Send it to #lx-tickets using the Slack MCP tool (channel ID: C053C1BJN2Y)
5. Return the Slack message link to the user
