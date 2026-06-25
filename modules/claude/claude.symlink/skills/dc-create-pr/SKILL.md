---
name: dc-create-pr
description: Create a GitHub pull request with a Jira ticket reference in the title and a description following the project's PR template.
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - AskUserQuestion
  - mcp__claude_ai_Atlassian__getTransitionsForJiraIssue
  - mcp__claude_ai_Atlassian__transitionJiraIssue
  - mcp__claude_ai_Slack__slack_send_message
  - mcp__claude_ai_Slack__slack_search_channels
metadata:
  version: '1.1.0'
---

# Create Pull Request

## Context

Create a GitHub pull request for the current branch, with a Jira-prefixed title and a description following the project's template.

## Jira Ticket(s)

Determine one or more Jira ticket IDs (e.g. `LX-1234`, `CP-5678`, `DATA-9012`) using these sources in order:

1. **Argument**: If provided via `$ARGUMENTS`, use that as the ticket ID(s) — multiple IDs may be provided (comma-separated, space-separated, etc.)
2. **Conversation context**: Look for Jira ticket IDs mentioned earlier in the conversation
3. **Branch name**: Try to extract a ticket ID from the current git branch name using pattern `[A-Za-z]+-\d+`
4. **Ask the user**: If none of the above yield a ticket ID, ask the user for it before proceeding

## Pre-flight Checks

Run these checks before doing anything else:

1. **Default branch guard** (hard stop):
   - Detect the default branch: `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`
   - If the current branch IS the default branch, stop immediately and inform the user they must be on a feature branch.

2. **Uncommitted changes**:
   - Run `git status --porcelain` to check for uncommitted changes.
   - If changes exist, use best judgment to stage and commit them (one or multiple logical commits as appropriate).
   - Only ask via `AskUserQuestion` when uncertain (e.g. mix of unrelated changes, unclear intent).
   - Always inform the user what was committed.

3. **Commits ahead of base** (hard stop):
   - Check that the branch has at least one commit ahead of the base branch.
   - If there are no commits ahead, stop and inform the user.

## Usage

Resolve the Jira ticket(s) first, then run the pre-flight checks, then the steps below. Stop and ask the user if a required input cannot be derived from arguments, conversation, or the branch name.

1. **Get the Jira ticket ID(s)** using the priority order above.

2. **Run pre-flight checks** (default branch guard, uncommitted changes, commits ahead).

3. **Detect base branch**:
   - `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`

4. **Gather context** by running these commands:
   - `git log --oneline $(git merge-base HEAD origin/<base>)..<current>` to see all commits on this branch
   - `git diff origin/<base>...HEAD --stat` to see changed files

5. **Find and read the PR template** for this project:
   - Look for `.github/PULL_REQUEST_TEMPLATE.md` or `.github/pull_request_template.md` in the repo root
   - If found, use it as the structure for the PR body
   - If not found, use a sensible default with Description, Screenshots, and Checklist sections

6. **Compose the PR title**:
   - Format with single ticket: `[TICKET-ID] Short description of changes`
   - Format with multiple tickets: `[TICKET-1] [TICKET-2] Short description of changes` (each ticket in its own brackets, separated by a space)
   - The description should be concise and derived from the commits/changes
   - Examples:
     - `[LX-1234] Add user authentication to login flow`
     - `[CP-123] [CP-456] Add user authentication and update login flow`

7. **Compose the PR body** following the project's PR template:
   - Fill in Jira link(s): `https://datacamp.atlassian.net/browse/TICKET-ID` (one per ticket)
   - Write a meaningful description of the changes based on the diff and commits
   - Fill in other template sections appropriately (leave screenshot sections for the user to fill in if no screenshots are available)
   - Check off the checklist items that apply

8. **Confirm with the user** before creating the PR. Show the composed title and body, then use `AskUserQuestion` with these options:
   - **Yes** — proceed to create the PR as shown
   - **No** — abort, do not create the PR

   The user can also type custom changes via the automatic "Other" option. If they do, revise and confirm again. Repeat until the user selects "Yes" or "No".

9. **Push the branch** if it hasn't been pushed yet:
   - `git push -u origin HEAD`

10. **Create the PR** using the GitHub CLI:
    - `gh pr create --title "..." --body "..." --base <base-branch> --assignee @me`
    - Use a HEREDOC for the body to preserve formatting

11. **Label the PR as agent-authored**:
    - Ensure the `ai-authored` label exists in the repo (create it if missing — this is idempotent):
      ```bash
      gh label create "ai-authored" --color "8B5CF6" --description "PR authored by an AI agent" --force
      ```
    - Apply the label:
      ```bash
      gh pr edit HEAD --add-label "ai-authored"
      ```
    - If labeling fails for any reason, log a warning and continue — do not block the PR creation.

12. **Move Jira ticket(s) to "In Review"**:
    - Cloud ID: `77148505-86c7-4ee8-90d9-adf07f862c22` (fallback: `cloudId: "https://datacamp.atlassian.net"`)
    - For each ticket, call `getTransitionsForJiraIssue` to list available transitions
    - Find the transition named "In Review" and use its ID with `transitionJiraIssue`
    - If no "In Review" transition exists for that ticket, skip and inform the user
    - If Atlassian API calls fail with auth errors (401 Unauthorized or `accessibleResources.filter is not a function`), ask the user to re-authenticate via `/mcp` using `AskUserQuestion`, then retry once. If it still fails, skip this step and remind the user to transition the ticket manually.

13. **Slack notification** (optional):
    - Detect the Slack channel using these sources in order:
      1. `$ARGUMENTS` — if a channel name was provided
      2. Conversation context — if a channel was mentioned earlier
      3. Repo's `AGENTS.md` — look for a Slack channel reference
      4. Global agent config — check, in order, `~/.claude/CLAUDE.md`, `~/.claude/AGENTS.md`, and any files under `~/.claude/memory/` for a line that explicitly designates a default PR-sharing channel (e.g. "default Slack channel for PR notifications"). Ignore incidental channel mentions that aren't marked as the PR default.
      5. Ask the user — use `AskUserQuestion` with **Yes** (provide channel) / **No** (skip) options
    - If a channel is identified, use `slack_search_channels` to resolve the channel name to an ID
    - Send a message formatted as: `PR for review: <PR_URL|PR_TITLE> :please:`
    - If the user declines or no channel is found, skip this step

14. **Return the PR URL** to the user.

## Important

- Always confirm via the Yes/No prompt before creating the PR
- Do not force push or amend commits
- If `gh` CLI is not authenticated, inform the user
