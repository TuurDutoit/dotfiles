if ((!$+commands[npm])); then
  return 1
fi

# Adds node_modules/.bin to the PATH
npm-bin-hook() {
  if [[ -a package.json ]]; then
    path=(
      $PWD/node_modules/.bin
      $path
    )
  else
    PATH=$(echo -n $PATH | tr ":" "\n" | sed "/node_modules/d" | tr "\n" ":")
  fi
}

autoload -Uz add-zsh-hook

add-zsh-hook preexec npm-bin-hook

# Add NPM_TOKEN to environment
if [ -f ~/.npmrc ]; then
  export NPM_TOKEN=$(cat ~/.npmrc | sed -e "s/.*_authToken=//")
fi

# Install node version from .nvmrc
nvmrc-hook() {
  if [[ -a .nvmrc ]]; then
    required_version=$(cat .nvmrc)
    current_version=$(node -v | cut -c2-)
    if [ "$current_version" != "$required_version" ]; then
      n `cat .nvmrc`
    fi
  fi
}

add-zsh-hook chpwd nvmrc-hook
