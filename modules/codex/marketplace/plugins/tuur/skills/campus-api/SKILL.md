---
name: campus-api
description: Use when working with the campus-api to fetch course, chapter, lesson, or exercise data from DataCamp's content platform. Covers all endpoints, response shapes, and how entities link together.
---

# Campus API

Internal API for fetching DataCamp course content structure (courses, chapters, lessons, exercises).

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Production  | `https://campus-api.datacamp.com/api` |
| Staging     | `https://campus-api.datacamp-staging.com/api` |

## Endpoints

### 1. Get Course — `GET /courses/:courseId`

Returns full course metadata including chapters with their exercises.

```bash
curl -s https://campus-api.datacamp.com/api/courses/735 | jq .
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Course ID |
| `title` | string | Course title |
| `description` | string | Full HTML description |
| `short_description` | string | Marketing summary |
| `slug` | string | URL slug (e.g. `intro-to-python-for-data-science`) |
| `programming_language` | string | `"python"`, `"r"`, etc. |
| `state` | string | `"live"`, etc. |
| `difficulty_level` | number | 1 = beginner, 2 = intermediate, 3 = advanced |
| `xp` | number | Total XP for the course |
| `time_needed_in_hours` | number | Estimated duration |
| `mobile_enabled` | boolean | Whether the course works on mobile |
| `has_variant_traditional` | boolean | Has traditional (video-based) variant |
| `has_variant_ai_native` | boolean | Has AI-native variant |
| `instructors` | array | Author info (name, bio, avatar) |
| `collaborators` | array | Additional contributors |
| `datasets` | array | Downloadable datasets (`asset_url`, `name`) |
| `tracks` | array | Tracks this course belongs to |
| `prerequisites` | array | Required courses |
| `learning_objectives` | array | Learning objective strings |
| `chapters` | array | **Chapters with nested exercises** (see below) |

**Chapter object (nested in course response):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Chapter ID (use this for the exercises endpoint) |
| `title` | string | Chapter title |
| `number` | number | Chapter position (1-indexed) |
| `description` | string | Chapter description |
| `nb_exercises` | number | Total exercise count |
| `xp` | number | Total XP for the chapter |
| `number_of_videos` | number | Video exercise count |
| `free_preview` | boolean/null | Whether chapter is free |
| `has_practice` | boolean | Whether practice is available |
| `slides_link` | string | PDF slides URL |
| `exercises` | array | Exercise summaries (`type`, `title`, `aggregate_xp`, `number`, `url`) |

---

### 2. Get Lessons — `GET /courses/:courseId/lessons`

Returns the lesson structure for a course. Lessons are groupings of exercises within a chapter (a chapter has multiple lessons).

```bash
curl -s https://campus-api.datacamp.com/api/courses/735/lessons | jq .
```

**Response:** Array of lesson objects.

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Lesson ID |
| `title` | string | Lesson title (e.g. "Hello Python!") |
| `number` | number | Lesson position within the chapter (1-indexed) |
| `chapterId` | number | Parent chapter ID |
| `chapterNumber` | number | Parent chapter position |
| `exercises` | array | Exercise refs: `{ id, number }` |
| `exercises[].subexercises` | array? | Optional sub-exercise refs for `BulletExercise` types |

---

### 3. Get Exercises — `GET /courses/:courseId/chapters/:chapterId/exercises`

Returns full exercise details for a specific chapter, including code, instructions, hints, and solutions.

```bash
curl -s https://campus-api.datacamp.com/api/courses/735/chapters/1842/exercises | jq .
```

**Response:** Array of exercise objects. Fields vary by exercise type.

**Common fields (all types):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Exercise ID |
| `type` | string | Exercise type (see below) |
| `title` | string | Exercise title |
| `number` | number | Position within the chapter |
| `xp` | number | XP reward |
| `assignment` | string/null | HTML description shown to the learner |
| `instructions` | string/null | HTML task instructions |
| `sample_code` | string | Starter code template |
| `solution` | string | Reference solution |
| `hint` | string/null | HTML hint |
| `sct` | string | Submission correctness test (grading logic) |
| `pre_exercise_code` | string | Setup code run before the exercise |

**Exercise types:**

| Type | Description |
|------|-------------|
| `VideoExercise` | Video lesson. Has `projector_key`, `aspect_ratio`, `video_link`, `video_hls`. |
| `NormalExercise` | Standard coding exercise with editor. |
| `MultipleChoiceExercise` | MCQ. Has `possible_answers` and `feedbacks` arrays. |
| `BulletExercise` | Multi-part exercise. Has `subexercises` array, each a `NormalExercise`. |

**`NormalExercise` additional fields:**

| Field | Type | Description |
|-------|------|-------------|
| `sample_codes` | array | `{ difficulty, sample_code }` — alternate starter code variants |
| `possible_answers` | array | Empty for coding exercises |

**`VideoExercise` additional fields:**

| Field | Type | Description |
|-------|------|-------------|
| `projector_key` | string | Key for projector slides |
| `video_link` | string/null | Direct video URL |
| `video_hls` | string/null | HLS stream URL |
| `aspect_ratio` | number | Video aspect ratio (e.g. 56.25 = 16:9) |
| `key` | string | Short exercise key |
| `language` | string | Programming language |
| `course_id` | number | Parent course ID |
| `chapter_id` | number | Parent chapter ID |

**`BulletExercise` additional fields:**

| Field | Type | Description |
|-------|------|-------------|
| `subexercises` | array | Array of `NormalExercise` objects, each with its own `sample_code`, `solution`, `sct`, etc. |

---

### 4. Get Lesson — `GET /lessons/:lessonId`

Returns a single lesson's metadata and exercise references.

```bash
curl -s https://campus-api.datacamp.com/api/lessons/381 | jq .
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Lesson ID |
| `title` | string | Lesson title |
| `number` | number | Lesson position within the chapter |
| `chapterId` | number | Parent chapter ID |
| `chapterNumber` | number | Parent chapter position |
| `courseId` | number | Parent course ID |
| `hasPractice` | boolean | Whether practice is available |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |
| `deletedAt` | string/null | Soft-delete timestamp |
| `exercises` | array | Exercise refs: `{ id, number }` |

---

## Entity Relationships

```
Course (735)
├── Chapter (1842) "Python Basics"
│   ├── Lesson (381) "Hello Python!" — exercises 1-3
│   │   ├── Exercise (14251) VideoExercise
│   │   ├── Exercise (14023) NormalExercise
│   │   └── Exercise (14026) NormalExercise
│   └── Lesson (386) "Variables and Types" — exercises 4-8
│       ├── Exercise (972033) VideoExercise
│       ├── Exercise (14043) NormalExercise
│       ├── ...
│       └── Exercise (14046) BulletExercise
│           ├── Subexercise (1759073)
│           └── Subexercise (1759074)
├── Chapter (1851) "Python Lists"
│   ├── Lesson (382) "Python Lists"
│   ├── Lesson (387) "Subsetting Lists"
│   └── Lesson (390) "Manipulating Lists"
└── ...
```

- A **course** has multiple **chapters** (available in the course response under `chapters`)
- A **chapter** has multiple **lessons** (available via `/courses/:id/lessons`, grouped by `chapterId`)
- A **lesson** has multiple **exercises** (exercise IDs listed in the lesson, full details via the chapter exercises endpoint)
- A **BulletExercise** has multiple **subexercises** (nested inline)

## Navigating the API

### Get all content for a course

1. `GET /courses/:courseId` — get course metadata + chapter IDs
2. `GET /courses/:courseId/lessons` — get lesson structure (which exercises belong to which lesson)
3. `GET /courses/:courseId/chapters/:chapterId/exercises` — get full exercise content per chapter

### Find a specific exercise

1. Start with `/courses/:courseId/lessons` to find the lesson containing the exercise number
2. Use the lesson's `chapterId` to call `/courses/:courseId/chapters/:chapterId/exercises`
3. Find the exercise by `id` or `number` in the response

### Get lesson details by ID

Use `GET /lessons/:lessonId` when you already have a lesson ID (e.g. from the lessons list). Returns `courseId` and `chapterId` for further navigation.

## Notes

- Exercise `number` is the position within the **chapter**, not within the lesson.
- The course endpoint's `chapters[].exercises` array contains summaries only (type, title, xp, url) — use the chapter exercises endpoint for full content.
- Lessons don't have their own exercises endpoint — exercises are fetched per chapter.
- `BulletExercise` parent objects have empty `sample_code`/`solution`/`sct` — the actual content is in the `subexercises`.
- **Lesson exercise lists are not fully reliable:** a lesson's `exercises` array may reference exercise IDs that don't actually appear in the chapter exercises response. Always treat the chapter exercises endpoint (`/courses/:courseId/chapters/:chapterId/exercises`) as the source of truth and cross-check against it.
