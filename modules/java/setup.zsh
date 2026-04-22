JDK_HOME="/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"

if [ ! -d "$JDK_HOME" ]; then
  echo "Skipping jenv setup: $JDK_HOME not found. Install with 'brew install --cask zulu@17'."
  return 0 2>/dev/null || exit 0
fi

jenv add "$JDK_HOME"
