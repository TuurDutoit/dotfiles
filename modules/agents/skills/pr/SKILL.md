---
name: pr
description: Create a PR and babysit CI until green. Combines dc-create-pr and dc-babysit-pr.
---

# PR

This skill creates a pull request, performs the matching review handoff, and
then runs **`/dc-babysit-pr`** to monitor and fix CI until all checks pass.

## Modes

Treat a standalone `draft` argument (for example, `/pr draft`) as the explicit
draft mode. All other invocations use the default ready-for-review mode. Do not
pass the mode word to ticket-ID resolution.

### Default: ready for review

1. Run **`/dc-create-pr`**, passing through any remaining `$ARGUMENTS`, with
   these explicit overrides to that skill's defaults:
   - Create a non-draft PR, ready for review.
   - Do not ask the user to confirm the title, body, Jira transition, or Slack
     notification.
   - Move every linked Jira ticket to **In Review** after the PR is created.
   - Post the review request to Slack after the PR is created. Use the
     repository's configured PR-review channel; otherwise use
     **`/dc-team-lx-ask-for-pr-review`** to post in `#lx-tickets`.
2. Run **`/dc-babysit-pr`** once the PR exists.

### Explicit draft: `/pr draft`

1. Run **`/dc-create-pr`** with the draft override, passing through any
   remaining `$ARGUMENTS`.
2. Do not move Jira tickets and do not post a Slack review request.
3. Run **`/dc-babysit-pr`** once the PR exists.

## Promoting a Draft PR

When the user says that a draft PR is ready (for example, “the PR is ready” or
“mark it ready to review”), do this without asking for confirmation:

1. Mark the existing PR ready for review with `gh pr ready`.
2. Move every linked Jira ticket to **In Review**.
3. Post the review request to Slack, using the repository's configured channel
   or **`/dc-team-lx-ask-for-pr-review`** as the fallback.

If the PR is already ready for review, do not repeat the GitHub state change;
still complete any requested or missing Jira/Slack handoff actions.

## Handoff Rules

- Jira-transition and Slack-notification failures must not block returning the
  PR URL or completing the ready-for-review transition; warn the user instead.
- Use the Jira ticket IDs already resolved from the PR title, branch, or
  conversation. Ask only if no ticket can be identified.
