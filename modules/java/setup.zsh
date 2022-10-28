OPENJDK_DIR="/opt/homebrew/Cellar/openjdk@11"

for v in $(ls "$OPENJDK_DIR"); do
  jenv add "$OPENJDK_DIR/$v"
done