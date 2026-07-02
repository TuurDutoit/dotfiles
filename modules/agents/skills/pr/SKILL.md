---
name: pr
description: Create a PR and babysit CI until green. Combines dc-create-pr and dc-babysit-pr.
---

# PR

This skill combines two skills in sequence:

1. **`/dc-create-pr`** — Commit changes, push, and open a draft PR with Jira ticket reference.
2. **`/dc-babysit-pr`** — Monitor CI checks and automatically fix failures until all checks pass.

## Instructions

1. Run the `/dc-create-pr` skill first, passing through any `$ARGUMENTS`. The PR must be opened as a **draft**.
2. Once the PR is created, run the `/dc-babysit-pr` skill to monitor and fix CI.
