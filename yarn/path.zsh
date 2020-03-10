# sup yarn
# https://yarnpkg.com

if (( $+commands[yarn] ))
then
  export PATH="`yarn global bin 2>/dev/null`:$PATH"
fi
