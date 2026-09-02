info 'linking OpenCode AGENTS.md'

config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
opencode_home="$config_home/opencode"
agents_source="$DOTFILES/modules/opencode/AGENTS.md"
agents_target="$opencode_home/AGENTS.md"

mkdir -p "$opencode_home"

if [ -e "$agents_target" ] || [ -L "$agents_target" ]
then
  rm "$agents_target"
fi

ln -s "$agents_source" "$agents_target" \
  && success "linked OpenCode AGENTS.md" \
  || fail "failed to link OpenCode AGENTS.md"