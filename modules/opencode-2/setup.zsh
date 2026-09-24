info 'linking OpenCode config'

config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
opencode_home="$config_home/opencode"
module="$DOTFILES/modules/opencode-2"

mkdir -p "$opencode_home"

for name in AGENTS.md opencode.jsonc agents plugins commands
do
  source="$module/$name"
  target="$opencode_home/$name"

  if [ -d "$target" ] && [ ! -L "$target" ]
  then
    # Migrate any pre-existing untracked files not already in source
    if [ -d "$source" ]
    then
      for file in "$target"/*
      do
        if [ -e "$file" ]
        then
          filename="$(basename "$file")"
          if [ ! -e "$source/$filename" ]
          then
            cp -R "$file" "$source/" 2>/dev/null || true
          fi
        fi
      done
    fi
    rm -rf "$target"
  elif [ -e "$target" ] || [ -L "$target" ]
  then
    rm -rf "$target"
  fi

  ln -s "$source" "$target" \
    && success "linked OpenCode $name" \
    || fail "failed to link OpenCode $name"
done

# rtk 0.49.0 still generates the V1 plugin API, which OpenCode 2 does not run.
# plugins/rtk.ts is a tracked V2 port, so only bootstrap it when absent;
# delete it and re-run this script once rtk ships a V2-native template.
if command -v rtk > /dev/null && [ ! -e "$module/plugins/rtk.ts" ]
then
  rtk init -g --opencode
  success 'initialized rtk OpenCode plugin'
fi
