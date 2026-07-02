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

while IFS= read -r skill
do
  [ -z "$skill" ] && continue

  src="$skills_source/$skill"
  dst="$skills_target/$skill"

  if [ ! -d "$src" ]
  then
    fail "missing shared skill source $src"
  fi

  if [ -e "$dst" ] || [ -L "$dst" ]
  then
    rm -rf "$dst"
  fi

  ln -s "$src" "$dst" \
    && success "linked Codex skill $skill" \
    || fail "failed to link Codex skill $skill"
done <<'SKILLS'
campus-api
dotfiles
fly
install
knex-to-kysely
lora
pr
setup
SKILLS

codex features enable memories > /dev/null \
  && success 'Codex memories feature enabled' \
  || fail 'failed to enable Codex memories feature'

success 'Codex skills installed'
