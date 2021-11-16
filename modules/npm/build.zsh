if [ -f ~/.npmrc ]; then
  NPM_TOKEN=$(cat ~/.npmrc | grep 'registry.npmjs.org' | cut -d= -f 2)
  echo "export NPM_TOKEN='$NPM_TOKEN'"
fi