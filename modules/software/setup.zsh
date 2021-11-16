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
info "running custom installers"
find "$DOTFILES/modules" -name install.sh | while read installer ; do info "${installer}" ; sh -c "${installer}" ; success ${installer} ; done

success "software installed successfully"