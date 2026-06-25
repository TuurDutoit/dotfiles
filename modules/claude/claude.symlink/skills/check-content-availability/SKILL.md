---
name: check-content-availability
description: Check whether course content (short description, long description, learning objectives, AI-Native variants) actually exists in main_app before requesting a translation. Use when a Localization Manager wants to confirm content presence so they don't open a translation ticket for missing or placeholder source.
allowed-tools:
  - Bash
  - Read
  - mcp__claude_ai_Google_Cloud_BigQuery__execute_sql_readonly
metadata:
  version: '1.0.0'
---

# Check Content Availability

Three failure modes this skill catches:

- **NULL source** — field empty in main_app.
- **Placeholder source** — stand-in like `"A description of the course."` (28 chars exact; SQL uses ≤30 to absorb minor whitespace drift).
- **AI-Native variant disabled** — `courses.has_variant_ai_native = 0`, so all 6 AI-Native types are unactionable.

A translation ticket for any of these wastes cycles. Run this check first.

## Context

- **Source of truth**: `datacamp-data-platform.main_app.*` in BigQuery. Use the read-only BQ executor.
- **CDC lag**: BQ lag is usually a few minutes, occasionally up to ~45 min. Re-run after 30 min before flagging content as missing — recent edits may not have streamed in yet.
- **Scope**: this skill only answers "does the source exist?". It does **not** dispatch translations or check BW status — those live with the Translations engineering team.

## Supported content types

| Content type (internal name)         | Where it lives in main_app                                                 |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `course.shortDescription`            | `courses.description`                                                      |
| `course.longDescription`             | `courses.long_description`                                                 |
| `learningObjectives`                 | `course_learning_objectives` (one row per objective, keyed by `course_id`) |
| `course.shortDescriptionAiNative`    | `courses.short_description_ai_native`                                      |
| `course.descriptionAiNative`         | `courses.description_ai_native`                                            |
| `course.chapterAiNative.title`       | `chapters_ai_native.title` (one row per chapter, keyed by `course_id`)     |
| `course.chapterAiNative.description` | `chapters_ai_native.description`                                           |
| `course.lessonAiNative.title`        | `lessons_ai_native.title` (joined: lesson → chapter → course)              |
| `course.lessonAiNative.description`  | `lessons_ai_native.description`                                            |

Gating flag: a course needs `courses.has_variant_ai_native = 1` for the 6 AI-Native types to be relevant.

## Usage

Run the numbered steps below in order: gather inputs, run Step 1 (standard fields), optionally Step 2 (AI-Native fields), drop into Step 3 to spot-check suspicious values, then summarise in Step 4.

### Inputs

1. **Course IDs** — the numeric content IDs the LM wants to translate (e.g. `33321, 40124, 50150`).
2. **Content types** (optional) — the subset the LM cares about. If omitted, check all 9.

Confirm with the user which content types are in scope before running queries. Typical defaults:

- "Long descriptions and learning objectives" → `course.longDescription`, `learningObjectives`
- "All standard descriptions" → `course.shortDescription`, `course.longDescription`, `learningObjectives`
- "AI-Native variants" → the 6 AI-Native types

### Step 1: Standard fields query

Use `mcp__claude_ai_Google_Cloud_BigQuery__execute_sql_readonly` with `projectId: datacamp-data-platform`. Substitute the course-ID list:

```sql
WITH targets AS (
  SELECT id FROM UNNEST([33321, 40124, 50150, 50152]) AS id
),
lo_counts AS (
  SELECT course_id, COUNT(*) AS lo_count
  FROM `datacamp-data-platform.main_app.course_learning_objectives`
  WHERE course_id IN (SELECT id FROM targets)
  GROUP BY course_id
)
SELECT
  t.id AS course_id,
  c.title,
  c.has_variant_ai_native AS ai_native_enabled,
  CASE
    WHEN c.description IS NULL OR LENGTH(TRIM(c.description)) = 0 THEN 'MISSING'
    WHEN LENGTH(TRIM(c.description)) <= 30 THEN 'PLACEHOLDER'
    ELSE 'YES'
  END AS short_description,
  LENGTH(c.description) AS short_desc_len,
  CASE
    WHEN c.long_description IS NULL OR LENGTH(TRIM(c.long_description)) = 0 THEN 'MISSING'
    ELSE 'YES'
  END AS long_description,
  LENGTH(c.long_description) AS long_desc_len,
  COALESCE(lo.lo_count, 0) AS learning_objectives_count,
  c.archived_at IS NOT NULL AS course_archived
FROM targets t
LEFT JOIN `datacamp-data-platform.main_app.courses` c ON c.id = t.id
LEFT JOIN lo_counts lo ON lo.course_id = t.id
ORDER BY t.id
```

**Interpretation:**

- `MISSING` → the field is NULL or empty. **Don't request translation.**
- `PLACEHOLDER` → short field at ~28 chars is almost always the stand-in `"A description of the course."`. Spot-check the actual value (see Step 3) before requesting translation.
- `YES` → real content present, safe to request.
- `learning_objectives_count = 0` → no LO rows for this course. **Don't request LO translation.**
- `course_archived = TRUE` → the course is archived (`courses.archived_at IS NOT NULL`). **Don't request translation** — confirm with the content team before proceeding.

### Step 2: AI-Native fields query (only if AI-Native types are in scope)

```sql
WITH targets AS (
  SELECT id FROM UNNEST([44410, 50151, 50153, 50154, 50157]) AS id
),
chap_counts AS (
  SELECT course_id,
         COUNTIF(title IS NOT NULL AND LENGTH(TRIM(title)) > 0) AS chap_title_count,
         COUNTIF(description IS NOT NULL AND LENGTH(TRIM(description)) > 0) AS chap_desc_count
  FROM `datacamp-data-platform.main_app.chapters_ai_native`
  WHERE course_id IN (SELECT id FROM targets) AND deleted_at IS NULL
  GROUP BY course_id
),
lesson_counts AS (
  SELECT ch.course_id,
         COUNTIF(l.title IS NOT NULL AND LENGTH(TRIM(l.title)) > 0) AS lesson_title_count,
         COUNTIF(l.description IS NOT NULL AND LENGTH(TRIM(l.description)) > 0) AS lesson_desc_count
  FROM `datacamp-data-platform.main_app.lessons_ai_native` l
  JOIN `datacamp-data-platform.main_app.chapters_ai_native` ch ON ch.id = l.chapter_id
  WHERE ch.course_id IN (SELECT id FROM targets)
    AND l.deleted_at IS NULL
    AND ch.deleted_at IS NULL
  GROUP BY ch.course_id
)
SELECT
  t.id AS course_id,
  c.has_variant_ai_native AS ai_native_enabled,
  CASE
    WHEN c.has_variant_ai_native = 0 THEN 'N/A (no AI-Native variant)'
    WHEN c.short_description_ai_native IS NULL OR LENGTH(TRIM(c.short_description_ai_native)) = 0 THEN 'MISSING'
    ELSE 'YES'
  END AS short_description_ai_native,
  CASE
    WHEN c.has_variant_ai_native = 0 THEN 'N/A (no AI-Native variant)'
    WHEN c.description_ai_native IS NULL OR LENGTH(TRIM(c.description_ai_native)) = 0 THEN 'MISSING'
    ELSE 'YES'
  END AS description_ai_native,
  COALESCE(ch.chap_title_count, 0) AS chapter_titles,
  COALESCE(ch.chap_desc_count, 0) AS chapter_descriptions,
  COALESCE(l.lesson_title_count, 0) AS lesson_titles,
  COALESCE(l.lesson_desc_count, 0) AS lesson_descriptions,
  c.archived_at IS NOT NULL AS course_archived
FROM targets t
LEFT JOIN `datacamp-data-platform.main_app.courses` c ON c.id = t.id
LEFT JOIN chap_counts ch ON ch.course_id = t.id
LEFT JOIN lesson_counts l ON l.course_id = t.id
ORDER BY t.id
```

**Interpretation:**

- `ai_native_enabled = 0` → the course does **not** have an AI-Native variant; all 6 AI-Native types are unactionable.
- `chapter_titles = 0` / `lesson_titles = 0` etc. → no rows in the AI-Native chapter/lesson tables for that course.
- Course-level `'MISSING'` → no source on `courses.*_ai_native`.
- **Partial AI-Native is common** — a course may have e.g. chapter titles populated but chapter descriptions all NULL. Treat each of the 4 chapter/lesson cells independently: request translation only for cells with a non-zero count.
- `course_archived = TRUE` → as in Step 1, the course is soft-archived. **Don't request translation** for any AI-Native cell either.

### Step 3: Inspect suspicious values

When a short field reads `PLACEHOLDER`, or any field looks unexpectedly small, confirm the actual value:

```sql
SELECT id, description, long_description,
       short_description_ai_native, description_ai_native
FROM `datacamp-data-platform.main_app.courses`
WHERE id IN (50150, 50152)
```

Common placeholder strings observed in the wild:

- `"A description of the course."` (28 chars exact)

If the LM confirms the content is genuinely a placeholder, **do not** request translation — flag it back to the content team.

### Step 4: Summarise for the LM

Present the result as a single per-course table marking each cell as one of:

- ✅ — source content present, translation can be requested
- ⚠️ — placeholder or suspiciously short content, needs content-team review
- ❌ — missing source, no translation possible
- N/A — AI-Native cell on a course without `has_variant_ai_native = 1`

Add a one-line action line per course (e.g. "Safe to request LD + LO for de-DE", "Skip — no source for LD").

## Known gotchas

- **BQ lag** — usually a few minutes, occasionally up to ~45 min. If a course's content was edited very recently and the query says `MISSING`, re-run after 30 min before flagging.
- **Placeholder detection is heuristic** — the ≤30-char threshold (TRIM-applied) catches the common `"A description of the course."` placeholder (28 chars exact, with a 2-char buffer for whitespace drift) but won't flag every stand-in. When in doubt, run Step 3 to read the actual value.
- **Learning objectives have variable count** — having `learning_objectives_count > 0` is sufficient to request translation. Don't impose a minimum count beyond > 0.
- **Soft-deleted/archived rows** — filter `deleted_at IS NULL` on `chapters_ai_native` / `lessons_ai_native`, and surface `courses.archived_at` on the course-level row. Archived courses should not have translations requested.
- **This skill does not check what's already in BW** — that's a separate question owned by Translations engineering. Use it only to confirm source presence upstream.

## References

- BigQuery dataset: `datacamp-data-platform.main_app`
