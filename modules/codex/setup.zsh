info 'installing Codex marketplaces & plugins'

if ! command -v codex > /dev/null
then
  fail 'codex CLI not found — install it first'
fi

current_marketplaces=$(codex plugin marketplace list 2>/dev/null || true)
current_plugins=$(codex plugin list 2>/dev/null || true)

codex_marketplace="$DOTFILES/modules/codex/marketplace"

if echo "$current_marketplaces" | grep -qF "$codex_marketplace"
then
  success 'marketplace tuur already added'
else
  codex plugin marketplace add "$codex_marketplace" > /dev/null \
    && success 'marketplace tuur added' \
    || fail 'failed to add marketplace tuur'
fi

if echo "$current_plugins" | grep -qF "tuur@tuur"
then
  success 'plugin tuur@tuur already installed'
else
  codex plugin add "tuur@tuur" > /dev/null \
    && success 'plugin tuur@tuur installed' \
    || fail 'failed to install plugin tuur@tuur'
fi

success 'Codex plugins installed'
