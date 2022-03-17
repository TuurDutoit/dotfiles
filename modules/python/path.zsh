PREFIX="$HOME/Library/Python"
PYTHON_PATH=''

for VERSION in $(ls "$PREFIX" 2>/dev/null); do
  PYTHON_PATH="$PREFIX/${VERSION}/bin:$PYTHON_PATH"
done

export PATH="$PYTHON_PATH$PATH"