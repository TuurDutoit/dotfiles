if ((!$+commands[npm])); then
  return 1
fi

# Adds node_modules/.bin to the PATH
npm-bin-hook() {
  PATH=$(echo -n $PATH | tr ":" "\n" | sed "/node_modules/d" | tr "\n" ":")
  if [[ -a package.json ]]; then
    path=(
      $PWD/node_modules/.bin
      $path
    )
  fi
}

autoload -Uz add-zsh-hook

add-zsh-hook preexec npm-bin-hook

# Add NPM_TOKEN to environment
if [ -f ~/.npmrc ]; then
  export NPM_TOKEN=$(cat ~/.npmrc | sed -e "s/.*_authToken=//")
fi
