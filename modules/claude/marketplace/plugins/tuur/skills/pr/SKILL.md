---
name: pr
description: Create a PR and babysit CI until green. Combines create-pr and babysit-pr.
---

# PR

This skill combines two skills in sequence:

1. **`/create-pr`** — Commit changes, push, and open a draft PR with Jira ticket reference.
2. **`/babysit-pr`** — Monitor CI checks and automatically fix failures until all checks pass.

## Instructions

1. Run the `/create-pr` skill first, passing through any `$ARGUMENTS`. The PR must be opened as a **draft**.
2. Once the PR is created, run the `/babysit-pr` skill to monitor and fix CI.
