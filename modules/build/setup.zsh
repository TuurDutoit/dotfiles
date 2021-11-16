info "building modules"

local LOCALRC="$DOTFILES/out/localrc"
mkdir -p "$DOTFILES/out"
echo "" > "$LOCALRC"

info "compiling path files"

local PATH_FILES=$(find "$DOTFILES/modules" -name 'path.zsh')
for FILE in $PATH_FILES; do
  cat "$FILE" >> "$LOCALRC"
  echo "\n" >> "$LOCALRC"
done

success "path files compiled"
info "compiling build files"

local BUILD_FILES=$(find "$DOTFILES/modules" -name 'build.zsh')
for FILE in $BUILD_FILES; do
  source "$FILE" >> "$LOCALRC"
  echo "\n" >> "$LOCALRC"
done

success "build files compiled"
info "compiling init"

local INIT_FILE="$DOTFILES/out/init.zsh"
echo "alias init='source $INIT_FILE'" >> "$LOCALRC"
echo "" > "$INIT_FILE"

local INIT_FILES=$(find "$DOTFILES/modules" -name 'init.zsh')
for FILE in $INIT_FILES; do
  cat "$FILE" >> "$INIT_FILE"
  echo "\n" >> "$INIT_FILE"
done

success "init compiled"

echo "alias reload='source $HOME/.zshrc'" >> "$LOCALRC"

success "modules built"