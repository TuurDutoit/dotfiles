---
name: code-review
description: Run a multi-dimensional parallel code review using specialized reviewer agents. Accepts file paths, a directory, a git diff range (e.g. master...HEAD), or a PR number (e.g. #123). Defaults to unstaged + staged changes.
---

# Code Review

Run a parallel code review across multiple quality dimensions.

## Instructions

You are orchestrating a multi-dimensional code review. Follow these steps exactly.

### Step 1 — Determine the target

Parse the argument to determine what to review:
- **No argument**: Review all staged + unstaged git changes (`git diff` and `git diff --cached`)
- **File paths / directory**: Review those files
- **Git range** (e.g., `master...HEAD`): Review that diff range
- **PR number** (e.g., `#123`): Fetch the PR diff using `gh pr diff 123`. Also fetch PR review comments using `gh api repos/{owner}/{repo}/pulls/123/comments` and PR issue comments using `gh pr view 123 --comments`. These are needed for the pr-comments dimension.

Collect the diff or file contents. This is the review context you'll pass to each reviewer.

### Step 2 — Select dimensions

Default dimensions: **security, performance, architecture, code-quality, error-handling, testing**

All six dimensions run by default. You may drop dimensions only if the changes are clearly irrelevant (e.g., drop "testing" for a README-only change).

**If the target is a PR number**: also include the **pr-comments** dimension. This dimension checks whether existing review comments were addressed. Pass the PR comments (fetched in Step 1) to this agent along with the diff.

**If a product spec or technical implementation plan was shared in the conversation**: also include the **spec-adherence** dimension. Pass the spec/plan content to this agent along with the diff.

Available dimensions: security, performance, architecture, testing, code-quality, error-handling, pr-comments (PR only), spec-adherence (when spec/plan shared)

### Step 3 — Spawn reviewer agents in parallel

For each selected dimension, spawn a reviewer using the Agent tool with `subagent_type: code-reviewer`. **All agents must be spawned in a single message** to run in parallel.

Each agent prompt must include:
1. The dimension they are assigned to
2. The full diff or file contents to review

Example prompt for each agent:
```
You are a code reviewer assigned to the **[DIMENSION]** dimension.

Review the following changes:

<diff>
[THE DIFF OR FILE CONTENTS]
</diff>
```

### Step 4 — Consolidate findings

Once all agents return, consolidate using the patterns in `code-review-patterns.md` (in this skill directory):

1. **Deduplicate**: Merge findings that reference the same file:line across dimensions
2. **Escalate cross-dimensional findings**: If multiple reviewers flag the same location, increase confidence
3. **Group by severity**: Critical > High > Medium
4. **Generate the unified report** following the report structure from `code-review-patterns.md`

### Step 5 — Present the report

Output the consolidated report. End with a brief action summary:
- Number of critical/high issues that should block merge
- Any cross-dimensional patterns worth noting
- If no significant issues: "LGTM — no critical or high issues found."
