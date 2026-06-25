---
name: create-ticket
description: Create a Jira ticket interactively by prompting the user for details.
allowed-tools:
  - AskUserQuestion
  - mcp__claude_ai_Atlassian__createJiraIssue
  - mcp__claude_ai_Atlassian__editJiraIssue
  - mcp__claude_ai_Atlassian__getTransitionsForJiraIssue
  - mcp__claude_ai_Atlassian__transitionJiraIssue
  - mcp__claude_ai_Atlassian__lookupJiraAccountId
  - mcp__claude_ai_Atlassian__getVisibleJiraProjects
metadata:
  version: '1.2.0'
---

# Create Jira Ticket

## Context

Create a Jira ticket interactively by prompting the user for details.

## Usage

**Atlassian MCP call parameters** — always pass these to minimise token cost:

- `getVisibleJiraProjects`: always include `searchString` (never call without a filter) and set `fields: ["key", "name"]` and `maxResults: 50`

Follow the instructions below in order. Always confirm the draft with the user before calling `createJiraIssue`.

1. Parse `$ARGUMENTS` for any initial context (summary, project reference like `[CP-XXXX]`, etc.). If a ticket key prefix is mentioned, infer the project key from it. Use this as a starting point but still confirm with the user.

2. Ask the user which **Jira project** the ticket should be created in (e.g. CP, LX, DATA). Skip this if the project is already clear from `$ARGUMENTS`. If unsure, use `mcp__claude_ai_Atlassian__getVisibleJiraProjects` to help the user pick.

3. Draft a ticket with:
   - **Summary**: concise title (under 100 chars)
   - **Description**: in Jira markdown. Include Goal, Details, and Acceptance Criteria sections where appropriate.

4. Before creating the ticket, prompt the user with the draft and ask:
   - "Is this title and description okay, or would you like to change anything?"
   - "Should this ticket belong to an epic? If so, which one?" (skip if already provided via args)
   - "Should I assign someone to this ticket?" (use `mcp__claude_ai_Atlassian__lookupJiraAccountId` to resolve the name if needed)
   - "Which sprint should this go in?" (default: current active sprint)
   - "What status should I set?" (default: To Do — use `mcp__claude_ai_Atlassian__getTransitionsForJiraIssue` after creation to transition if needed)
   - "What issue type? Story, Task, Bug?" (default: Story)

   You can combine these into one message to keep it concise. Skip questions where the answer is already obvious from context.

5. Create the ticket using `mcp__claude_ai_Atlassian__createJiraIssue` with:
   - `cloudId`: `datacamp.atlassian.net`
   - `projectKey`: as confirmed by the user
   - `issueTypeName`: as confirmed (default: `Story`)
   - `parent`: epic key if specified
   - `summary`: confirmed title
   - `description`: confirmed description
   - `additional_fields`: include sprint field `{"customfield_10010": SPRINT_ID}` if a sprint was specified
   - `assignee`: account ID if someone was assigned

6. After creation:
   - Display the ticket key and link
   - Tickets are always created with "New" status. Transition the ticket to the desired status (default: "To Do") using `mcp__claude_ai_Atlassian__getTransitionsForJiraIssue` to find available transitions, then `mcp__claude_ai_Atlassian__transitionJiraIssue` to apply it.
   - If assignment was requested, update via `mcp__claude_ai_Atlassian__editJiraIssue` if not set during creation

## Notes

- Sprint field (`customfield_10010`) must be a plain number, not an object.
- To find sprint IDs, check the board or ask the user.
- When the user says "assign to me", use their Atlassian account. Look up the account ID with the Atlassian lookup tool if needed.

## Example usage

```text
/create-ticket [CP-6610] Add lab eligibility endpoint with per-provider rules
/create-ticket LX: a bug fix for partner labels in learn-hub
/create-ticket
```
