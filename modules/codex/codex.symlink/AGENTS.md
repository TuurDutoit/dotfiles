# Global Rules

## Pointers

- Use the `$git-github-workflow` skill for all Git, GitHub, and pull request work.
- Use the `$coding-workflow-quality` skill when planning, implementing, testing, reviewing, or otherwise modifying code.
- Use the `$circleci-investigate-job-failures` to investigate CircleCI failures
- Use the `circleci` CLI to interact with CircleCI (reference: `$circleci-cli` skill)
- Use the `bt` CLI to interact with Braintrust (reference: `$braintrust-cli` skill)
- My dotfiles live at `/Users/tuur/.dotfiles`. If I ask you to change something in my dotfiles, or configure something globally, this is where you should look.
  - When creating or updating global skills, always do so in my dotfiles (`modules/agents/skills`)

## General

- When you run into unplanned problems, limitations or contradictions, don't try to find workarounds - escalate them to me so I can improve the setup or provide guidance.

## Running Commands

- Prefer ready-made commands from AGENTS.md, README.md, or `package.json` scripts (in that order) over crafting your own. Check these sources first.
- Run Yarn, npm and Just scripts outside the sandbox
- Run the coderabbit CLI outside the sandbox

## Approvals

- The following 3rd-party tools are approved to send internal data to:
  - Braintrust
  - CodeRabbit
- The following tools work fully locally (they don't send any data):
  - `rtk`: wraps around common CLIs, can be treated like the "child" command it runs (e.g. `rtk git` can be treated like `git`)

## Jira

- Default to project `LX` (Learner Experience) when creating Jira tickets, unless told otherwise.

## BigQuery

- Always default to project ID `datacamp-data-platform`. Do not guess or use any other project ID unless explicitly told to.
