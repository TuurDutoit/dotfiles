# Global Rules

## Pointers

- Use the `coding-workflow-quality` skill when planning, implementing, testing, reviewing, or otherwise modifying code.
- Use the `git-github-workflow` skill for all Git, GitHub, and pull request work.
- Use the `pr` skill when opening a PR
- Use the `circleci-investigate-job-failures` skill to investigate CircleCI failures
- Use the `show-me` skill when writing docs, specs, or plans, or when explaining things to me (diagrams, code sketches, focused artifacts)

- Use the `bt` CLI to interact with Braintrust (reference: `braintrust-cli` skill)
- My dotfiles live at `/Users/tuur/.dotfiles`. If I ask you to change something in my dotfiles, or configure something globally, this is where you should look.
  - When creating or updating global skills, always do so in my dotfiles (`modules/agents/skills`)
  - Always quote frontmatter string fields (`name: "my-name"`, `description: "..."`) with double quotes to prevent YAML parsing issues with colons (`:`).
- Handoff documents (e.g. from the `handoff` skill) are stored under ~/Documents/Obsidian/DataCamp/Agents/Handoffs - not in the current workspace, and not in a temporary OS directory
- Multi-review diffs are stored under ~/Documents/Obsidian/DataCamp/Agents/Diffs - not in the current workspace, and not in a temporary OS directory

## General - very important!

- Keep explanations brief and to the point. Assume I have no context and avoid using jargon - explain things in simple terms.
- Back up all your statements with hard proof - DO NOT assume things. Find references in official docs, issue trackers or public forums. Find the actual error message when something crashes. Get a screenshot to validate a UI looks good. Be your own critic.
- When you run into unplanned problems, limitations or contradictions, don't try to find workarounds - escalate them to me so I can improve the setup or provide guidance.
- If you have a problem installing packages through npm or Yarn, stop and let me know.
- Keep changes simple, elegant, and well integrated with the existing code. Prefer the smallest coherent solution over new abstractions or complexity.
- Before implementing a feature, consider whether a focused refactor of the affected code would make the change clearer or simpler. When it would, do that refactor first; avoid speculative refactors unrelated to the feature.

## Continuous Improvement

- After completing a task, briefly reflect on how the work went and whether anything should be documented or updated.
- Look for durable learnings: unexpected friction, hard-to-find information, confusing behavior, repeated user steering, important architectural decisions, or repetitive project-wide changes.
- When a learning would help future work, update the most appropriate durable documentation (for example, the README, `AGENTS.md`, a skill, or another relevant doc) as part of the task. Keep guidance specific, concise, and scoped to where it applies.
- Mention relevant documentation updates or observations in the handoff. Do not add speculative, one-off, or project-specific rules to global instructions.

## Conversations

When commenting in Github, always add the following snippet at the end of your message:

```
> 🤖 posted on behalf of Tuur
```

## Running Commands

- Prefer ready-made commands from AGENTS.md, README.md, or `package.json` scripts (in that order) over crafting your own. Check these sources first.

## Sessions and Subagents

- When starting new sessions or subagents, always use the default model (omit or leave the model argument empty) unless explicitly told which model to use.

## Jira

- Default to project `LX` (Learner Experience) when creating Jira tickets, unless told otherwise.
- Use the tools in the "internal Cloudflare MCP portal" to access Jira

## Confluence

- Always use the HTML or ADF format to fetch and save Confluence content. The Markdown format doesn't support some content types, which results in parts of the page getting lost when updating it.
- Use the tools in the "internal Cloudflare MCP portal" to access Confluence

## BigQuery

- Always default to project ID `datacamp-data-platform`. Do not guess or use any other project ID unless explicitly told to.

## Project Aliases

Whenever referencing a project in this list (e.g. in session names, spec documents, or conversations with Tuur), you may abbreviate the full project name to its alias:

- `content-authorization-service` → `CAS`

## Git Commits

Imported from the company-managed instructions file; OpenCode 2 no longer loads the managed `instructions` entry, so these rules live here now.

When you create a git commit, append one contiguous trailer block to the commit message:

OpenCode-Model: <model-id>
Co-authored-by: opencode-agent[bot] <219766164+opencode-agent[bot]@users.noreply.github.com>

Replace `<model-id>` with the model that performed the development work. If multiple models contributed materially, add one `OpenCode-Model` trailer per model.

Separate the commit body from the trailer block with exactly one blank line. Do not put blank lines between trailers. Keep `Co-authored-by` as the final trailer so GitHub recognizes the bot co-author.

Never replace the `Co-authored-by` trailer with `OpenCode-Model`. These are separate trailers and both must be present on commits you create.

When amending, rewording, or otherwise editing a commit message, preserve any existing `Co-authored-by` and `OpenCode-Model` trailers unless the user explicitly asks you to remove them.

Only add these trailers to commits you create yourself. Do not add them when the user is creating the commit, when only preparing changes, or when suggesting a commit message.

## Pull Requests

Imported from the company-managed instructions file.

When creating or updating GitHub pull requests, prefer the most specific available PR creation skill for the current repo or organization.

Use generic PR creation skills only when repo- or organization-specific PR requirements, labels, templates, issue-tracker transitions, and notification flows are not needed.

For normal DataCamp PR creation, always prefer the company-wide PR workflow skill when available. Do not use generic PR workflows or PR skills from other toolchains unless the user explicitly asks for that specific workflow.
