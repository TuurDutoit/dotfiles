info "installing homebrew"

if test ! $(which brew)
then
  info "homebrew not yet installed"
  
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  success "homebrew installed successfully"
else
  success "homebrew already installed"
fi