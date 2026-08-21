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

codex features enable memories > /dev/null \
  && success 'Codex memories feature enabled' \
  || fail 'failed to enable Codex memories feature'

success 'Codex skills installed'
