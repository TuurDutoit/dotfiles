info 'installing shared DataCamp agent skills'

if ! command -v npx > /dev/null
then
  fail 'npx not found — install Node.js first'
fi

DISABLE_TELEMETRY=1 npx skills add git@github.com:datacamp-engineering/skills.git \
  --global \
  --agent opencode \
  --skill \
    add-kong-redirect \
    adopt-openapi-docs \
    create-agents-md-files \
    create-justfile \
    create-ticket \
    cve-fixer \
    dc-babysit-pr \
    dc-create-pr \
    dc-migrate-ci-format-lint \
    dc-migrate-oxfmt \
    dc-migrate-oxfmt-oxlint \
    dc-migrate-oxlint \
    dc-team-lx-ask-for-pr-review \
    dead-code \
    enable-teleport-for-db \
    improve-codebase-architecture \
    incident-handling \
    migrate-to-fission \
    translations-cli \
  --full-depth \
  --yes \
  && success 'DataCamp agent skills installed' \
  || fail 'failed to install DataCamp agent skills'

DISABLE_TELEMETRY=1 npx skills add mattpocock/skills \
  --global \
  --agent opencode \
  --skill \
    ask-matt \
    code-review \
    codebase-design \
    diagnosing-bugs \
    domain-modeling \
    grill-me \
    grill-with-docs \
    grilling \
    handoff \
    implement \
    improve-codebase-architectur \
    prototype \
    research \
    resolving-merge-conflicts \
    setup-matt-pocock-skills \
    tdd \
    teach \
    to-questionnaire \
    to-spec \
    to-tickets \
    triage \
    wait-what \
    wayfinder \
    wizard \
    writing-for-agents \
    implement-spec \
    loop-me \
    retro \
  --full-depth \
  --yes \
  && success 'Matt Pocock agent skills installed' \
  || fail 'failed to install Matt Pocock agent skills'

skills_source="$DOTFILES/modules/agents/skills"
skills_target="$HOME/.agents/skills"
mkdir -p "$skills_target"

find "$skills_source" -mindepth 1 -maxdepth 1 -type d -print | sort | while IFS= read -r src
do
  skill=$(basename "$src")
  dst="$skills_target/$skill"

  if [ -e "$dst" ] || [ -L "$dst" ]
  then
    rm -rf "$dst"
  fi

  ln -s "$src" "$dst" \
    && success "linked agent skill $skill" \
    || fail "failed to link agent skill $skill"
done

info 'installing diagram-design skill'

diagram_design_repo="$HOME/Projects/diagram-design"

if [ -d "$diagram_design_repo/.git" ]
then
  git -C "$diagram_design_repo" pull --ff-only \
    && success 'diagram-design repo updated' \
    || fail 'failed to update diagram-design repo'
else
  mkdir -p "$HOME/Projects"
  git clone https://github.com/cathrynlavery/diagram-design.git "$diagram_design_repo" \
    && success 'diagram-design repo cloned' \
    || fail 'failed to clone diagram-design repo'
fi

ln -sfn "$diagram_design_repo/skills/diagram-design" "$skills_target/diagram-design" \
  && success 'linked diagram-design skill' \
  || fail 'failed to link diagram-design skill'

info 'installing rtk'
rtk init -g --opencode
success 'rtk installed'