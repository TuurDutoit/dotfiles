info 'linking OpenCode config'

config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
opencode_home="$config_home/opencode"
module="$DOTFILES/modules/opencode"

mkdir -p "$opencode_home"

for name in AGENTS.md opencode.jsonc agents skills
do
  source="$module/$name"
  target="$opencode_home/$name"

  if [ -e "$target" ] || [ -L "$target" ]
  then
    rm -rf "$target"
  fi

  ln -s "$source" "$target" \
    && success "linked OpenCode $name" \
    || fail "failed to link OpenCode $name"
done