if [[ -z $(command -v onelogin-aws-login) ]]
then
  info "Installing and configuring onelogin-aws-cli..."
  user "Please connect to the VPN and press Enter"
  read
  curl -s https://docs.datacamp.com/engineering-wiki/assets/install-onelogin-aws-cli.sh | bash
  cat "$DOTFILES/modules/aws/extra.config" >> "$HOME/.onelogin-aws.config"
  success "Installed and configured onelogin-aws-cli"
else
  success "onelogin-aws-cli already installed"
fi