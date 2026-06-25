---
name: incident-handling
description: Guide engineers through incident triage and resolution steps during a live incident. Provides the checklist from the Incident Handling Playbook focused on Triage and Resolution & Recovery stages.
allowed-tools:
  - AskUserQuestion
  - mcp__claude_ai_Slack__slack_send_message
  - mcp__claude_ai_Slack__slack_read_channel
  - mcp__claude_ai_Slack__slack_search_channels
  - mcp__claude_ai_Atlassian__getJiraIssue
  - mcp__claude_ai_Atlassian__editJiraIssue
  - mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql
  - mcp__claude_ai_Atlassian__getConfluencePage
  - mcp__incident-io__incident_list
  - mcp__incident-io__incident_show
  - mcp__incident-io__incident_update
  - mcp__incident-io__alert_list
  - mcp__incident-io__alert_show
  - mcp__incident-io__follow_up_create
  - mcp__incident-io__follow_up_list
  - mcp__incident-io__escalation_list
  - mcp__incident-io__escalation_show
  - mcp__incident-io__escalation_respond
  - mcp__incident-io__ask_incident
  - mcp__incident-io__ask_telemetry
  - WebFetch
metadata:
  version: '1.0.0'
  tags: incident, on-call, triage, recovery, sev1, sev2, pagerduty, incident.io
---

# Incident Handling

## Context

Guide on-call engineers through the Triage and Resolution & Recovery stages of a live incident.

Full playbook: [Incident Handling - Playbook](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/4123787265/Incident+Handling+-+Playbook)

## Usage

Invoke when an incident has been declared and you need step-by-step guidance:

- `/incident-handling` — start the guided checklist
- "I'm on an incident, what do I do?"
- "Help me triage this incident"
- "Walk me through the incident checklist"

### Tool usage

Use available tools to assist at each step — fetch context automatically when you can, and apply updates to save the engineer time. **Always confirm with the engineer before any write or update** (e.g. "This looks like a SEV-2 — shall I set that in incident.io?"). If a tool is unavailable, give the equivalent manual instruction instead (e.g. "Go to incident.io and set the severity to SEV-2").

**Atlassian MCP efficiency rules** — apply to every Jira tool call:

- Always pass `responseContentFormat: "markdown"` on read operations (`getJiraIssue`, `searchJiraIssuesUsingJql`).
- For `searchJiraIssuesUsingJql`, cap `maxResults` at 50 and pass an explicit `fields` list with only what you need (e.g. `["summary", "status", "priority", "assignee"]`). Never request all fields.
- `getConfluencePage` calls must always include `contentFormat: "markdown"`.

### Step 1: Understand the situation

If the engineer provides an incident ID, Slack channel name, or any incident.io reference, fetch the incident details using `mcp__incident-io__incident_show` (include `["investigation", "postmortem"]`) and linked alerts via `mcp__incident-io__alert_list` — use that context to skip questions the engineer doesn't need to answer. Otherwise ask:

> What is the current state of the incident? Specifically:
>
> 1. Has the incident already been created in incident.io? If so, what is the incident ID or Slack channel?
> 2. What is the observed problem (error messages, alerts, user reports)?
> 3. Do you have an initial sense of impact scope (single user, segment, or full platform)?

Use the answers to determine where the engineer is in the process and skip steps already completed.

### Step 2: Triage

Walk the engineer through each triage step, confirming completion before moving on.

#### 2a. Join Incident Slack Channel + Start Call

- **Who**: On-Call Engineer
- **Action**: Post in the incident channel (format: `#inc-<date>-<name>`) to claim ownership (e.g. "I am investigating").
- **Action**: Start the incident call via incident.io (Zoom). Fallback: Google Meet.
- **Done when**: Ownership is clear, a call is running, and all communication is in the incident channel.

#### 2b. Validate Incident

- **Who**: On-Call Engineer
- **Action**: Assess urgency, scope, and domain:
  - Is this something that needs to be handled now or can it wait until next business hours?
  - Is it a general platform problem or isolated to a specific service?
  - Is it within your domain knowledge or should you escalate to another team?
- **Done when**: One of:
  - Escalated to another team (outside your domain).
  - Accepted as a valid incident.
  - Declined/resolved if not a real incident (close on incident.io or resolve PagerDuty alert).

#### 2c. Incident Classification

- **Who**: On-Call Engineer
- **Action**: Before classifying, fetch the latest classification guidance from Confluence using `mcp__claude_ai_Atlassian__getConfluencePage` with:
  - `cloudId`: `datacamp.atlassian.net`
  - `pageId`: `3898081296`
  - `contentFormat`: `markdown`

  Use the fetched content to determine the correct severity and outage level for each affected component. Do **not** guess or assume classifications — the Confluence page contains specific mappings of platform components to outage levels for different failure scenarios.

  Classify the incident severity:
  - **SEV-1** — Critical disruption
  - **SEV-2** — Major disruption
  - **SEV-3** — Medium disruption

  Once the severity is determined, confirm with the engineer and set it in incident.io (via `mcp__incident-io__incident_update`, or instruct the engineer to set it manually).

- **Done when**: Severity is set in incident.io.

#### 2d. Create Status Page Incident

- **Who**: On-Call Engineer
- **Action**: Create a Status Page incident on status.datacamp.com via incident.io. Use the classification guidance fetched in step 2c to:
  - Select affected components.
  - Classify each component as: **FULL OUTAGE**, **PARTIAL OUTAGE**, or **DEGRADED PERFORMANCE** based on the specific mappings from the Incident Classification page — do not infer outage levels without consulting that reference.
  - Write a user-facing summary of the incident.
- **Done when**: Incident is visible on status.datacamp.com.

#### 2e. Review/Assign Incident Commander

- **Who**: On-Call Engineer
- **Action**: The acknowledging engineer is auto-assigned as Incident Commander (IC). After accepting, reassess:
  - Am I the right IC or should someone else take over?
  - For complex incidents, consider assigning a Deputy IC.
- **Done when**: IC is confirmed or reassigned.

### Step 3: Resolution & Recovery

Once triage is complete, guide the engineer through resolution.

#### 3a. Set Security Impact

- **Who**: Incident Commander
- **Action**: Ask the engineer whether the incident has any security implications:
  - Examples: exposed endpoints, data segregation issues, potential data leakage.
  - If **Yes**: Infosec is automatically escalated.
  - Once the engineer answers, set the security impact field in incident.io (via `mcp__incident-io__incident_update`, or instruct the engineer to do it manually).
- **Done when**: Security impact is set (Yes/No) in incident.io.

#### 3b. Resolve / Recovery

- **Who**: Incident Team
- **Action**: Follow this diagnostic loop:
  1. **Deep Analysis** — Identify root cause using evidence (logs, metrics, traces). Query logs, metrics, or traces around the incident time window using `mcp__incident-io__ask_telemetry` (e.g. error rates, latency spikes, service-specific signals), or guide the engineer to check DataDog/dashboards manually.
  2. **Verify Blast Radius** — Determine full scope of affected users/services.
  3. **Default to Rollback** — If deployment-related, rollback first, investigate later.
  4. **Check Stop-Gap Measures** — Feature flags, resource limits, circuit breakers.
  5. **Watch for Secondary Effects** — Cache stampedes, reconnection storms, queue backlogs.
  6. **Document in Slack** — Post all findings and decisions in the incident channel.
  7. **Escalate if needed** — Escalate to EM or VP if the fix requires downtime for other services.
- **Principle**: Prioritize restoration over remediation. Fastest path to stable state wins.
- **Done when**: Service is restored and stable.

#### 3c. Monitor

- **Who**: Incident Team
- **Action**:
  - **Metrics**: Check dashboards/alerts that originally signalled the incident (error rates, latency, 5xx).
  - **End-to-End Testing**: Sanity check the live environment.
  - **Secondary Effects**: Monitor databases, caches, and queue backlogs.
- **Done when**: Confidence that the fix is holding and no secondary failures are emerging.

#### 3d. Update Status Page

- **Who**: Incident Commander
- **Action**: Update status.datacamp.com every ~30 minutes:
  - Draft a user-facing status update (use `mcp__incident-io__ask_incident` for a context-aware draft, or compose one based on what the engineer shares) and confirm with the engineer before posting.
  - Focus on user-visible symptoms, not technical details.
  - Be clear about impact and scope.
  - Include workarounds if available.
  - Avoid technical jargon (golden rule: if a competitor read this, would they learn something about our stack?).
  - When resolved, post: "We have applied a fix and are monitoring."
- **Done when**: Status page reflects current state.

#### 3e. Incident Logging

- **Who**: Incident Commander / Incident Team
- **Action**:
  - Post findings in real time (logs, screenshots, code snippets).
  - Post investigation direction updates to avoid duplicated effort.
  - Use threads for in-depth discussions.
  - Pin useful links.
  - Capture follow-ups as they emerge — confirm with the engineer and create them via `mcp__incident-io__follow_up_create`, or instruct the engineer to use incident.io's `/action-item` command in Slack.
- **Done when**: Ongoing throughout the incident.

### Step 4: Escalation (conditional)

#### Escalate to VP of Engineering

- **When**: SEV-1 incident, no projected recovery time, outage largely exceeding SLAs, infrastructure crisis, or massive business impact.
- **Who to page**:
  - Learner Experience domain: Nuno Rocha
  - Group Hub / Payments / Infrastructure domain: Rui Campos
  - If unavailable: escalate to the other VP, then to Eduardo Oliveira.
- **How**: Escalate through PagerDuty.

#### Inform Stakeholders / Entire Company

- **When**: VP/CTO decides broader communication is needed.
- **Where**: `#datacamp` Slack channel.
- **Include**: Summary, high-level timeline, business/customer impact, path to resolution, recommended actions.

### Step 5: Wrap up guidance

Once the incident is resolved and monitoring confirms stability, remind the engineer:

- Post-mortems are **required** for SEV-1 and SEV-2, optional for SEV-3.
- Post-mortems are created in incident.io (which auto-creates a Confluence page under [Post-Mortems](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/2714533944)).
- All action items should be captured via incident.io's `/action-item` and turned into Jira tickets.

## Notes

- **Incident creation sources**: Monitoring alerts (DataDog → PagerDuty), Service Desk (Jira → PagerDuty), or manual (incident.io website/Slack app).
- **Automation flow**: PagerDuty → incident.io → creates Jira ticket (EINC project) + Slack channel + Zoom call.
- **Status Page updates** should happen every ~30 minutes during active incidents.
- Do **not** create EINC Jira tickets directly — use the automation flow via PagerDuty/incident.io.

## Example usage

```text
/incident-handling
/incident-handling I got paged for high error rates on the API
/incident-handling We have a SEV-1, payments are failing across the board
```
