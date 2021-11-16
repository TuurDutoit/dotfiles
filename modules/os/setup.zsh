if [ "$(uname -s)" == "Darwin" ]
then
  info "installing macos defaults"

  $DOTFILES/modules/os/set-defaults.zsh
else
  info "No OS defaults avaiable for your OS"
fi

success "OS defaults applied successfully"