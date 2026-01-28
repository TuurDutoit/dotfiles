if [ -f ~/.npmrc ]; then
  export NPM_TOKEN=$(cat ~/.npmrc | grep 'registry.npmjs.org' | cut -d= -f 2)
fi