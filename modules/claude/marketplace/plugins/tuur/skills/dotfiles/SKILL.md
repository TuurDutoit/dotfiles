---
name: dotfiles
description: "Use whenever you edit, create, or delete any file under ~/.dotfiles (including skills, plugins, shell config, hooks, Brewfile, etc.). Ensures dotfile changes are always committed and pushed so they sync across machines."
---

# Dotfiles — Auto-commit & push

Tuur's dotfiles live at `~/.dotfiles` and are synced across machines via `git@github.com:TuurDutoit/dotfiles.git`. Any change left uncommitted is effectively lost on the other machine.

**Rule:** Every change you make under `~/.dotfiles` must end with a commit and push, in the same turn.

## Workflow

After editing, creating, or deleting any file in `~/.dotfiles`:

1. **Check status** — run `git -C ~/.dotfiles status` to see what's staged/unstaged and whether there are changes you didn't make.
2. **Handle pre-existing changes** — if `status` shows modifications you didn't make this session, **pause and ask Tuur**:
   > "I see existing uncommitted changes in `~/.dotfiles` that I didn't make: `<list files>`. Should I commit + push those separately first, skip them, or include them in my commit?"
   Do NOT include unrelated pre-existing changes in your own commit without explicit approval. Default behavior after approval: commit them as a **separate** commit before your changes, so history stays clean.
3. **Stage your changes by path** — use explicit file paths (not `git add .` or `git add -A`) to avoid pulling in unrelated files.
4. **Commit** with a conventional-commit message that describes the change (e.g. `feat(skills/pa): add Waiting section`, `fix(zsh): correct PATH order`, `chore(brewfile): bump versions`).
5. **Push** — `git -C ~/.dotfiles push`. If the push fails (e.g. needs pull/rebase), pull with rebase, re-push; don't force-push without asking.
6. **Confirm** — report commit SHA(s) and push result back to Tuur.

## Scope

This applies to **any** path under `~/.dotfiles`, including but not limited to:
- `modules/claude/**` (skills, plugins, settings, hooks)
- Shell config (zsh, oh-my-zsh overrides)
- `Brewfile`, `Brewfile.lock.json`
- `bin/**` scripts
- Any new file created directly in the dotfiles tree

## Notes

- Use `git -C ~/.dotfiles <cmd>` to avoid `cd` (keeps the session's cwd intact and plays nicely with permission prompts).
- Respect the global rule from `~/.claude/CLAUDE.md`: never `--no-verify`, never force-push without explicit permission, never commit `.env*` or secrets.
- If a hook blocks the commit, fix the underlying issue and create a new commit rather than amending.
