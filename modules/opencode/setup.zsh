info 'installing OpenCode skills'

if ! command -v opencode > /dev/null
then
  fail 'opencode CLI not found — install it first'
fi

skills_source="$DOTFILES/modules/agents/skills"
config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
skills_target="$config_home/opencode/skills"
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
    && success "linked OpenCode skill $skill" \
    || fail "failed to link OpenCode skill $skill"
done

success 'OpenCode skills installed'
