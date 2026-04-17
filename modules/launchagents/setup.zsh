info 'installing LaunchAgents'

AGENTS_SRC="$DOTFILES/modules/launchagents/agents"
AGENTS_DST="$HOME/Library/LaunchAgents"

mkdir -p "$AGENTS_DST"
mkdir -p "$HOME/Library/Logs"

for tmpl in "$AGENTS_SRC"/*.plist.tmpl
do
  [ -f "$tmpl" ] || continue

  name=$(basename "$tmpl" .tmpl)
  dst="$AGENTS_DST/$name"

  sed -e "s|{{HOME}}|$HOME|g" -e "s|{{DOTFILES}}|$DOTFILES|g" "$tmpl" > "$dst"

  launchctl unload "$dst" 2>/dev/null || true
  launchctl load "$dst" \
    && success "LaunchAgent $name loaded" \
    || fail "failed to load LaunchAgent $name"
done
