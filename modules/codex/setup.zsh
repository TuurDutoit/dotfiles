info 'installing Codex skills'

if ! command -v codex > /dev/null
then
  fail 'codex CLI not found — install it first'
fi

codex plugin remove tuur@tuur > /dev/null 2>&1 \
  && success 'removed old Codex plugin tuur@tuur' \
  || success 'old Codex plugin tuur@tuur not installed'

codex plugin marketplace remove tuur > /dev/null 2>&1 \
  && success 'removed old Codex marketplace tuur' \
  || success 'old Codex marketplace tuur not configured'

skills_source="$DOTFILES/modules/agents/skills"
skills_target="$HOME/.codex/skills"
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
    && success "linked Codex skill $skill" \
    || fail "failed to link Codex skill $skill"
done

codex features enable memories > /dev/null \
  && success 'Codex memories feature enabled' \
  || fail 'failed to enable Codex memories feature'

success 'Codex skills installed'
