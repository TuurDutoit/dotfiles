info 'installing Claude Code skills'

if ! command -v claude > /dev/null
then
  fail 'claude CLI not found — install it first (via brew cask)'
fi

current_plugins=$(claude plugin list 2>/dev/null)

# Plugins previously managed by this setup module.
while IFS= read -r spec
do
  [ -z "$spec" ] && continue
  if printf '%s\n' "$current_plugins" | grep -qF "❯ $spec"
  then
    claude plugin uninstall --scope user --yes "$spec" > /dev/null \
      && success "removed old Claude plugin $spec" \
      || fail "failed to remove old Claude plugin $spec"
  fi
done <<'PLUGINS'
claude-md-management@claude-plugins-official
typescript-lsp@claude-plugins-official
dc@datacamp
dc-developer@datacamp
dc-team-learner-experience@datacamp
tuur@tuur
PLUGINS

skills_source="$DOTFILES/modules/agents/skills"
skills_target="$HOME/.claude/skills"
mkdir -p "$skills_target"

find "$skills_source" -mindepth 1 -maxdepth 1 -type d -print | sort | while IFS= read -r src
do
  skill=$(basename "$src")
  dst="$skills_target/$skill"

  if [ -e "$dst" ] || [ -L "$dst" ]
  then
    rm -rf "$dst"
  fi

  ln -s "$src" "$dst" \
    && success "linked Claude skill $skill" \
    || fail "failed to link Claude skill $skill"
done

success 'Claude Code skills installed'
