PREFIX="$HOME/Library/Python"
PYTHON_PATH=''

for VERSION in $(ls "$PREFIX"); do
  PYTHON_PATH="$PREFIX/${VERSION}/bin:$PYTHON_PATH"
done

export PATH="$PYTHON_PATH$PATH"
export AWS_DEFAULT_PROFILE=datacamp-prod-developer