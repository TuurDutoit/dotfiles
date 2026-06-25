---
name: phrase-translations
description: Use when working with i18n, translations, Phrase Strings, .phrase.yml, locale files, or translation keys in any DataCamp repository
metadata:
  tags: i18n, translations, phrase, locale, internationalization
---

# Phrase Translations

## Overview

DataCamp uses **Phrase Strings** for static UI translations, managed via `@datacamp/translations-cli` (NOT the raw `phrase` CLI). All commands go through this wrapper.

## Setup

**CLI:** `brew install phrase-cli` (dependency, but you never call it directly)

**Access token:** `PHRASE_ACCESS_TOKEN` env var. Find in 1Password: "Phrase Local Development API KEY". Add to `.zshrc`:
```bash
export PHRASE_ACCESS_TOKEN=<token>
```

**Config:** Each repo has `.phrase.yml` at root. If missing, the app isn't set up for translations — use `init` (see below).

## Commands Quick Reference

All commands use `npx @datacamp/translations-cli@latest <command>` (or `yarn dlx` equivalent).

**Monorepo note:** Always run commands from the directory containing `.phrase.yml`. In a monorepo, `cd` into the package first — the CLI errors if it can't find the config file.

| Command | What it does |
|---------|-------------|
| `pull` | Download translations from Phrase to local files |
| `push` | Upload local translations to Phrase |
| `delete` | Delete a translation key from Phrase (interactive or `--projectId xxx --keyName abc`) |
| `init` | Set up a new app with Phrase (creates `.phrase.yml`, Phrase project, language folders) |
| `generate-resources` | Generate `resources.generated.ts` mapping file for i18next |

## Daily Workflows

### Pull (get latest translations)

```bash
npx @datacamp/translations-cli@latest pull
```

**ALWAYS pull before starting work on a new branch/feature.** This gets translator/linguist updates from Phrase.

**CRITICAL CHECK after pull:** Review git diff on your English translation file. If you see English keys removed or reverted to old values:
- You have newer local translations that Phrase doesn't have yet
- **Undo the pull changes**, then `push` first, then `pull` again
- Check `update_translations` in `.phrase.yml` — set to `true` if English values are reverting

### Push (create new translations)

```bash
npx @datacamp/translations-cli@latest push
```

**NEVER add non-English content** (e.g. Spanish) when creating new keys. Only add English. Leave other language files empty for those keys. Phrase's `autotranslate` handles machine-translation — adding non-English content breaks this.

After pushing new English keys, **pull** to get auto-translated content for other languages:
```bash
npx @datacamp/translations-cli@latest push
npx @datacamp/translations-cli@latest pull
```

### Update existing translations

Updating copy for existing keys requires a **delete-then-recreate** cycle:

1. **Delete** each key from Phrase (see delete command below)
2. **Remove** the keys from ALL language JSON files locally
3. **Add** updated English copy to the English file only
4. **Push:** `npx @datacamp/translations-cli@latest push`
5. **Pull:** `npx @datacamp/translations-cli@latest pull`

You cannot just push updated values — Phrase won't regenerate translations for existing keys.

### Delete a translation key

```bash
npx @datacamp/translations-cli@latest delete --projectId <id> --keyName "namespace.key.name"
```

Project ID is in `.phrase.yml`. This is **non-reversible**.

## Setting Up a New App

```bash
npx @datacamp/translations-cli@latest init
```

This creates:
- `.phrase.yml` config
- A Phrase Strings project (name MUST match GitHub repo name for multi-repo, or reflect repo + package for monorepo)
- `languages/` folder with `translation.json` per locale

Then:
1. Run `npx @datacamp/translations-cli@latest generate-resources`
2. Set up i18next with `i18next-icu` plugin (MUST use ICU for consistent interpolation):

```typescript
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import ICU from "i18next-icu"
import resources from "./languages/resources.generated"

i18n.use(ICU).use(initReactI18next).init({
  fallbackLng: "en-US",
  lng: language,
  interpolation: { escapeValue: false },
  resources,
})
```

3. Optionally add Glossary & Common shared projects (see below)

## Glossary & Common Projects

Shared translation projects managed by the Translations squad. Add to `.phrase.yml` pull targets:

```yaml
pull:
  targets:
    - file: ./src/languages/<locale_code>/translation.json
    # common project (e.g. "more", "See all", "search")
    - file: ./src/languages/<locale_code>/common.json
      project_id: '2e749d22978a5ca32b655075a5c4a292'
    # glossary project (e.g. "course", "track", "certification")
    - file: ./src/languages/<locale_code>/glossary.json
      project_id: 'ac3af427e927853d44c34bf7f403e480'
```

Convention: Glossary/Common keys use **camelCase**. App-specific keys use **PascalCase** prefix (component name).

## .phrase.yml Reference

```yaml
phrase:
  host: https://api.us.app.phrase.com/v2
  file_format: nested_json
  project_id: "your-project-id"

  push:
    sources:
    - file: ./src/languages/<locale_code>/translation.json
      params:
        autotranslate: true        # enables machine pre-translation
        update_translations: true  # push updates existing keys (set true to avoid stale pulls)

  pull:
    targets:
    - file: ./src/languages/<locale_code>/translation.json
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `phrase push/pull` directly | Use `npx @datacamp/translations-cli@latest push/pull` |
| Adding Spanish (or other) content for new keys | Only add English. Autotranslate handles the rest. |
| Pushing updated copy without deleting first | Delete keys from Phrase, remove from all locale files, re-add English only, push, pull |
| Not pulling before starting work | Always pull on new branch to get translator updates |
| Running CLI from wrong directory in monorepo | `cd` into the package containing `.phrase.yml` first |
| Pull reverts English translations | You have newer local state. Undo pull, push first, then pull. Check `update_translations: true` |
| Phrase fails to translate interpolations | Some ICU interpolations don't auto-translate well. Manually translate via Google Translate. |
