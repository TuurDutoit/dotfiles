info 'installing Codex marketplaces & plugins'

if ! command -v codex > /dev/null
then
  fail 'codex CLI not found — install it first'
fi

current_marketplaces=$(codex plugin marketplace list 2>/dev/null || true)

codex_marketplace="$DOTFILES/modules/codex/marketplace"
tuur_marketplace_root=$(printf '%s\n' "$current_marketplaces" | awk '$1 == "tuur" {print $2}')

if [ "$tuur_marketplace_root" = "$codex_marketplace" ]
then
  success 'marketplace tuur already added'
else
  if [ -n "$tuur_marketplace_root" ]
  then
    codex plugin marketplace remove tuur > /dev/null \
      && success "removed stale marketplace tuur ($tuur_marketplace_root)" \
      || fail 'failed to remove stale marketplace tuur'
  fi

  codex plugin marketplace add "$codex_marketplace" > /dev/null \
    && success 'marketplace tuur added' \
    || fail 'failed to add marketplace tuur'
fi

codex plugin add "tuur@tuur" > /dev/null \
  && success 'plugin tuur@tuur installed' \
  || fail 'failed to install plugin tuur@tuur'

success 'Codex plugins installed'
