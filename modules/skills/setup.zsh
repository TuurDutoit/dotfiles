info 'installing DataCamp Engineering skills'

if ! command -v gh > /dev/null
then
  fail 'gh CLI not found — install it first (via brew bundle)'
fi

if ! command -v npx > /dev/null
then
  fail 'npx not found — install Node.js first'
fi

skills_repo='git@github.com:datacamp-engineering/skills.git'

# Desired skills: everything in datacamp-wide/, plus explicit extras
desired_skills=$(
  {
    gh api repos/datacamp-engineering/skills/contents/datacamp-wide \
      --jq '.[] | select(.type == "dir") | .name' 2>/dev/null
    echo 'lx-ask-for-pr-review'
  } | sort -u
)

if [ -z "$desired_skills" ]
then
  fail 'failed to list desired skills (is gh authenticated?)'
fi

installed_skills=$(DISABLE_TELEMETRY=1 npx -y skills list -g --agent claude-code --json 2>/dev/null | jq -r '.[].name' 2>/dev/null)

missing_skills=''
for skill in $(echo "$desired_skills")
do
  if ! echo "$installed_skills" | grep -qFx "$skill"
  then
    missing_skills="$missing_skills $skill"
  fi
done

if [ -z "$missing_skills" ]
then
  success 'all DataCamp skills already installed'
else
  info "installing skills:$missing_skills"
  DISABLE_TELEMETRY=1 npx -y skills add "$skills_repo" -g -a claude-code -y -s $missing_skills > /dev/null \
    && success 'DataCamp skills installed' \
    || fail 'failed to install DataCamp skills'
fi
