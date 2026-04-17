info 'installing Claude Code marketplaces & plugins'

if ! command -v claude > /dev/null
then
  fail 'claude CLI not found — install it first (via brew cask)'
fi

current_marketplaces=$(claude plugin marketplace list 2>/dev/null)
current_plugins=$(claude plugin list 2>/dev/null)

# Marketplaces: "name|source" (source = github repo, URL, or path)
while IFS='|' read -r name source
do
  [ -z "$name" ] && continue
  if echo "$current_marketplaces" | grep -qF "❯ $name"
  then
    success "marketplace $name already added"
  else
    claude plugin marketplace add "$source" > /dev/null \
      && success "marketplace $name added" \
      || fail "failed to add marketplace $name"
  fi
done <<MARKETPLACES
claude-plugins-official|anthropics/claude-plugins-official
tuur|$DOTFILES/modules/claude/marketplace
MARKETPLACES

# Plugins: "plugin@marketplace[|disabled]"
while IFS='|' read -r spec flag
do
  [ -z "$spec" ] && continue
  if echo "$current_plugins" | grep -qF "❯ $spec"
  then
    success "plugin $spec already installed"
  else
    claude plugin install "$spec" > /dev/null \
      && success "plugin $spec installed" \
      || fail "failed to install plugin $spec"
  fi
  if [ "$flag" = "disabled" ]
  then
    claude plugin disable "${spec%@*}" > /dev/null 2>&1 || true
    success "plugin $spec disabled"
  fi
done <<'PLUGINS'
claude-md-management@claude-plugins-official
ralph-loop@claude-plugins-official
typescript-lsp@claude-plugins-official
superpowers@claude-plugins-official|disabled
tuur@tuur
PLUGINS

success 'Claude Code plugins installed'
