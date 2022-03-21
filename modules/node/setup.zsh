DEST="/usr/local/bin/node"

if [ -e "$DEST" ]; then
  success "node symlink already installed"
else
  info "Installing node symlink (requires password)"
  sudo ln -s "$(brew --prefix node)/bin/node" /usr/local/bin/node
  success "node symlink installed"
fi