# main-app installs mysql@5.7, which won't be symlinked by default by Brew
export PATH="/opt/homebrew/opt/mysql@5.7/bin:$PATH"