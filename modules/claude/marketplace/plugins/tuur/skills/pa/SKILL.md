---
name: pa
description: "Use when the user says \"good morning\", asks to plan their day, check what's next, update their TODO list, or manage daily tasks. Also use when the user says something is done/completed and wants the next task."
argument-hint: "Optional: 'good morning' to start the day, 'done' to mark current task complete, or a freeform update"
---

# Personal Assistant — Daily TODO Manager

Manage Tuur's daily TODO list by gathering information from multiple sources, prioritizing tasks, and guiding through the day one task at a time.

## Files

**TODO:** `~/Documents/Obsidian/DataCamp/Claude/TODO.md`
**Inbox:** `~/Documents/Obsidian/DataCamp/Claude/INBOX.md`
**Activity Log:** `~/Documents/Obsidian/DataCamp/Claude/LOG.md`

### File Format

The TODO file uses this structure:

```markdown
In progress
- <item currently being actively worked on>

Waiting
- <item waiting on someone/something external>

Today
- <task 1>
- <task 2>

This week
- <task with sub-items>
	- Sub-item
- <another task>

Later
- <future task>

To refine / propose:
- <ideas, not actionable yet>
```

Rules:
- Use **tabs** for indentation of sub-items.
- Always include **clickable links** for PRs, Jira tickets, Slack threads, calendar events, etc.
- Format PR links as: `[repo #number](full_url)` — e.g. `[practice-api #72](https://github.com/datacamp-engineering/practice-api/pull/72)`
- Format Jira links as: `[MPE-1234](https://datacamp.atlassian.net/browse/MPE-1234)`
- Keep items concise — one line per task, with parenthetical context where needed.
- **Section semantics:**
  - **In progress** — Tuur is actively working on it (the work is on his machine/head right now).
  - **Waiting** — blocked on someone/something external: PR review, CI, deploy, feedback, another team. Tuur is not actively working on it.
  - **Today** — queued for today but not yet started.
  - When presenting status, show "In progress" and "Waiting" separately.

## Data Sources

Fetch updated information from **all** of these sources. Use parallel tool calls where possible.

### 1. Slack (Recent Messages)

Use `mcp__claude_ai_Slack__slack_search_public_and_private` and `mcp__claude_ai_Slack__slack_read_channel` to check:
- Direct messages and mentions from the last 24 hours
- Channels where Tuur is active

Look for: action items, requests, questions directed at Tuur, updates on ongoing work.

### 2. Gmail

Use `mcp__claude_ai_Gmail__search_threads` and `mcp__claude_ai_Gmail__get_thread` to check:
- Unread emails from the last 24 hours
- GitHub notification emails (PR reviews, comments, CI failures)
- Calendar invites or updates

Look for: action items, PR review requests, meeting changes, important communications.

**Large-output handling:** `search_threads` often returns results too large for context. When it saves to a file path, use `jq` on that file via Bash to extract what you need (e.g., unique subjects, filter by date, find closed/merged). Don't re-query with a smaller page size — the data is already on disk.

### 3. Google Calendar

Use `mcp__claude_ai_Google_Calendar__list_events` to check:
- Today's events and meetings
- Any upcoming deadlines

Look for: meetings that need preparation, time blocks that affect task scheduling.

### 4. GitHub PRs

Use `gh` CLI as the primary source, and **merge its output with Gmail GitHub notification data** (sender `notifications@github.com`) to catch anything the CLI misses (comments, pushed commits, re-review requests). Tuur cares about:
- PRs authored by Tuur — reviews received, CI status, merge readiness, **new comments from reviewers**
- PRs where Tuur is requested as reviewer, or **re-review is requested after pushing fixes**
- Recent comments/threads on Tuur's open PRs that need a response

```sh
gh search prs --author=@me --state=open --json title,url,number,repository,reviewDecision,statusCheckRollup
gh search prs --review-requested=@me --state=open --json title,url,number,repository
gh api notifications --jq '.[] | select(.reason == "review_requested" or .reason == "mention" or .reason == "comment") | {title: .subject.title, url: .subject.url, reason: .reason, updated: .updated_at}'
```

When presenting, explicitly call out:
- **New human comments** on Tuur's PRs (not bots like sonarqube/coderabbit) — these often need a response.
- **Re-review requests** after Tuur previously reviewed and the author pushed fixes.

If `gh` is unavailable on PATH, fall back to Gmail GitHub notifications only — but flag that GH data is incomplete.

### 5. Jira

Use `mcp__claude_ai_Atlassian_Rovo__searchJiraIssuesUsingJql` to check:
- Tickets assigned to Tuur that are "In Progress" or "In Review"
- Recently updated tickets

JQL: `assignee = currentUser() AND status in ("In Progress", "In Review") ORDER BY updated DESC`

**Type-strictness gotcha:** the Rovo Jira MCP validates input strictly. `maxResults` must be a JSON number (not a string); `fields` must be an array (not a comma-separated string). If in doubt, omit optional params and let defaults apply.

### 6. Inbox File

Read `~/Documents/Obsidian/DataCamp/Claude/INBOX.md` for any items Tuur has manually dropped in. After processing, clear the inbox.

## Workflows

### "Good Morning" — Start of Day

1. **Read** the current TODO file and Inbox.
2. **Fetch** updated info from ALL sources (in parallel where possible).
3. **Shift timing:**
   - Move "Tomorrow" items to "Today" (if a Tomorrow section exists).
   - Check if any "This week" items should move to "Today" based on deadlines or urgency.
4. **Update items** with fresh status:
   - PRs: update merge/review/CI status
   - Jira: update ticket status
   - Add new items discovered from sources
   - Remove or mark completed items that are now done
5. **Process inbox:** move inbox items into the appropriate section, then clear the inbox.
6. **Prioritize "Today"** based on:
   - Meetings/calendar blocks (time-sensitive items first)
   - Blocked items that others are waiting on (unblock others)
   - Quick wins that take <5 minutes
   - Deep work items
7. **Write** the updated TODO file.
8. **Present** to Tuur:
   - Brief summary of what changed overnight
   - Today's calendar overview
   - The prioritized "Today" list
   - **Highlight the #1 item** to start with and why

### "Done" / Task Completion

1. **Log** the completed item to the Activity Log with a timestamp.
2. Move the completed item out of "In progress" / "Today" (remove it).
3. **Refresh data** from sources (quick check, not full scan — focus on things likely to have changed).
4. Re-evaluate priorities.
5. **Present the next item** to work on.

### "Update" / New Information

When Tuur mentions something new (a new task, a status change, a reprioritization):
1. Update the TODO file accordingly.
2. If it changes priorities, re-present the current top item.

### Background Tasks

When Tuur starts something that runs in the background (CI build, long-running process, waiting on someone):
- Keep it in the "Waiting" section with a note about what it's waiting on.
- When presenting the next task, mention what's waiting in the background.
- When the background task completes, move it out of Waiting and log it.

### Drafting a Standup / Status Update

When Tuur asks for a standup post, weekly update, or team status:
1. Draft using this structure (keep it brief, skip business-as-usual):
   - **Blockers** — things that need team attention to unblock
   - **Highlights** — noteworthy items the rest of the team should know about (scope shifts, new bugs, major changes)
   - **Today** (or "This week") — focus areas
2. **Always present the draft for approval before sending.** Iterate on it based on feedback.
3. Only send after explicit approval ("post it", "send it", etc.).

### Posting to Slack

1. Confirm the destination channel — use `mcp__claude_ai_Slack__slack_search_channels` to find the channel ID.
2. **Format reminder:** the Slack MCP uses standard markdown — use `**bold**` (not `*bold*`, which is italic). Use Slack link syntax `<url|text>` for cleaner rendering.
3. Never send a Slack message without explicit approval of the exact text.
4. After sending, return the message link to Tuur.

## Presentation Style

- Be concise and actionable. No fluff.
- Use a clear format:

```
**In progress:** [practice-api #90](https://...) — CI running

**Next up:** Fix SonarQube hotspot on [practice-api #72](https://...)
> Quick win — just needs a one-line fix, then it can merge.

**Today (5 items):**
1. Fix SonarQube hotspot on practice-api #72
2. Merge practice-api #70 (approved, ready)
3. Reply to Anthropic support re: org usage
4. Code assembler — run eval
5. Finish Engagement Survey

**Calendar:**
- 10:00 — Team standup (30m)
- 14:00 — 1:1 with Sarah (30m)
```

- Always include clickable links.
- When suggesting the next task, briefly explain **why** it's the top priority.

## Activity Log

**Location:** `~/Documents/Obsidian/DataCamp/Claude/LOG.md`

Log every completed task/action with a timestamp. The file is organized in **reverse chronological order** — newest day first, newest entry first within each day.

### Format

```markdown
# 2026-04-13
09:30 Meeting with Ruben about MCMA exercises in practice
09:23 Reviewed [mobile #7049](https://github.com/datacamp-engineering/mobile/pull/7049) (LX-7718, v2 prompting exercise support)
09:14 Replied to Anthropic support about login problems

# 2026-04-12
17:45 Merged [practice-api #70](https://github.com/datacamp-engineering/practice-api/pull/70) (ESLint config)
```

### Rules

- One line per entry: `HH:MM <description>`
- Use 24-hour time format.
- Include clickable links for PRs, tickets, etc.
- Add a new `# YYYY-MM-DD` section at the **top** of the file when a new day starts.
- Within a day, newest entries go at the **top** (right after the date heading).
- Log when: a task is marked done, a PR is merged/reviewed, a meeting happens, an email is sent, or any other notable action.
- Keep entries concise — similar style to git commit messages.

### When to Log

- Every time the user says "done" or marks a task complete.
- When the user mentions completing an action (reviewed a PR, sent an email, had a meeting, etc.).
- Do NOT log routine data fetches or TODO reorganizations — only user-facing actions.

## Important Notes

- **ALWAYS run `date '+%Y-%m-%d %H:%M'` via the Bash tool immediately before writing any timestamp to LOG.md.** Do NOT reuse a date from earlier in the conversation, do NOT estimate, do NOT infer from context. If your last `date` call was more than 60 seconds ago, call it again. Each log entry requires a fresh `date` call. The same rule applies at the start of every user interaction for calendar-aware prioritization and date headers.
- **Before adding to LOG.md**, check whether today's date already has a `# YYYY-MM-DD` section at the top. If not, add a new one. Don't assume the top section matches today.
- Load MCP tool schemas with `ToolSearch` before calling any MCP tool.
- Use parallel tool calls aggressively — fetch all sources at once.
- Don't overwhelm with information. Summarize changes, don't list every email.
- Respect the existing TODO structure — don't reorganize sections the user has set up.
- The "To refine / propose" section is for ideas, not tasks. Don't promote these without being asked.
