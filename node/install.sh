if test ! $(which node -v)
then
  fnm install latest
  # https://github.com/Schniz/fnm/issues/189
  LATEST=$(fnm ls | grep -oE 'v\d+\.\d+\.\d+' | tail -n 1)
  fnm default "$LATEST"
fi

if test ! $(which spoof)
then
  sudo npm install spoof -g
fi
