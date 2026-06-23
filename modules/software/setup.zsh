info "installing software"

# # Upgrade homebrew
info "running brew update"
brew update
success "brew update completed"

# # Run Homebrew through the Brewfile
info "running brew bundle"
brew bundle
success "brew bundle completed"

# find the installers and run them iteratively
# only run modules/*/installer.sh, not nested install.sh files vendored by plugins/caches
info "running custom installers"
find "$DOTFILES/modules" -mindepth 2 -maxdepth 2 -name installer.sh | while read installer ; do info "${installer}" ; sh "${installer}" ; success "${installer}" ; done

success "software installed successfully"