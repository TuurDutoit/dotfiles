fnm install latest
# https://github.com/Schniz/fnm/issues/189
LATEST=$(fnm ls | grep -oE 'v\d+\.\d+\.\d+' | tail -n 1)
fnm default "$LATEST"