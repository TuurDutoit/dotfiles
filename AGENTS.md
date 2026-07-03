# Dotfiles Repository Instructions

Tuur's dotfiles live at `/Users/tuur/.dotfiles` and sync through `git@github.com:TuurDutoit/dotfiles.git`.

## Dotfiles Workflow

Every change under `/Users/tuur/.dotfiles` must end with a commit and push in the same turn. Changes left uncommitted will not sync to other machines.

1. Check status with `git -C /Users/tuur/.dotfiles status`.
2. If status shows pre-existing changes you did not make, pause and ask Tuur whether to commit and push them separately first, skip them, or include them. Do not include unrelated pre-existing changes without explicit approval.
3. Stage only explicit paths. Do not use `git add .` or `git add -A`.
4. Commit with a conventional commit message that describes the change, such as `feat(skills): add waiting workflow`, `fix(zsh): correct PATH order`, or `chore(brewfile): bump versions`.
5. Push with `git -C /Users/tuur/.dotfiles push`. If push fails because the branch needs updates, pull with rebase and push again. Do not force-push without asking.
6. Report commit SHA and push result.

## Scope

This applies to any file under `/Users/tuur/.dotfiles`, including:

- `modules/claude/**` for Claude Code settings, skills, hooks, and related scripts.
- `modules/codex/**` for Codex settings, skills, hooks, and related scripts.
- `modules/agents/**` for shared agent skills.
- Shell config, zsh modules, Oh My Zsh overrides, hooks, `Brewfile`, `Brewfile.lock.json`, and `bin/**`.

## Notes

- Use `git -C /Users/tuur/.dotfiles <cmd>` so commands work regardless of the current directory.
- Respect global rules from `/Users/tuur/.codex/AGENTS.md` and `/Users/tuur/.claude/CLAUDE.md`: never use `--no-verify`, never force-push without explicit permission, never commit `.env*` files or secrets.
- If a hook blocks a commit, fix the underlying issue and create a new commit instead of amending.
