---
name: mission
description: Turn ideas or rough notes into concrete mission, vision, strategy, goals, and roadmap docs through an iterative interview process, writing the output to the project's strategy docs.
---

# Mission → Vision → Strategy → Goals → Roadmap

Turn rough ideas, strategy fragments, or product concepts into a coherent, structured set of strategy documents based on Lenny Rachitsky's framework:

1. **Mission**: *What are we trying to achieve?* (Why do we exist? What is our core purpose?)
2. **Vision**: *What does the world look like when we've achieved it?* (The future state / end-game.)
3. **Strategy**: *What is our plan to achieve it (our plan to win)?* (3–5 concrete bets/pillars, trade-offs, non-goals.)
4. **Goals**: *How will we measure progress?* (North Star metric and supporting key quantitative targets.)
5. **Roadmap**: *What do we need to build in order to get there?* (Prioritized initiatives/themes based on ROI: effort vs. impact on goals.)
6. **Task**: *What is one unit of work we can tackle next?* (Atomic execution units.)

---

## Process

Follow these 6 phases in order. Complete each phase before advancing.

```
Phase 1: Ingest & Assess
       │
Phase 2: The Interview (Sharpening Loop)
       │
Phase 3: Synthesize & Review
       │
Phase 4: Determine Storage Location
       │
Phase 5: Write the Strategy Bundle
       │
Phase 6: Update AGENTS.md
```

---

### Phase 1: Ingest & Assess

Read the user's prompt, rough notes, existing codebase context, or reference materials. Assess what is already clear versus what is missing, vague, or unaligned across the 5 tiers:

| Tier | Core Focus | What to Check |
| :--- | :--- | :--- |
| **Mission** | Purpose & Problem | Is the core problem clear? Is the mission concise, inspiring, and durable? |
| **Vision** | Desired Future State | Is there a vivid picture of the transformed world/user experience when we succeed? |
| **Strategy** | Plan to Win | Are there 3–5 concrete bets/pillars with explicit trade-offs and non-goals, or just a feature list? |
| **Goals** | Measurable Progress | Is there a defined North Star metric and measurable milestones? |
| **Roadmap** | Sequenced Initiatives | Are initiatives prioritized by ROI (effort vs. impact on goals)? |

---

### Phase 2: The Interview (Sharpening Loop)

Conduct an interactive, iterative interview to sharpen fuzzy concepts and uncover missing details.

#### Interview Rules

1. **Work the frontier in rounds**: Ask 2–4 targeted questions per round whose prerequisites are ready. Do not overwhelm the user with a giant wall of questions.
2. **Always propose recommendations**: Never leave a blank question. Offer a concrete draft, candidate formulation, or 2–3 sharp options for the user to react to.
3. **Sharpen vague language**: Challenge buzzwords (e.g., "streamlined", "intuitive", "all-in-one"). Ask what they mean in terms of observable user behavior or technical reality.
4. **Probe trade-offs and non-goals**: True strategy is choosing what *not* to do. Probe hard boundaries ("If forced to choose between X and Y in phase 1, which do we sacrifice?").
5. **Flexible entry point**: It is completely valid to start with Vision and derive Mission, or vice versa. Follow the user's natural momentum.
6. **Find facts yourself**: Inspect repo code, existing specs, and configs for technical facts before asking the user. Save the user's attention for product decisions.

#### Round Format

```markdown
❓ **Q1 — <Topic / Tier>**: <Question text explaining the choice or ambiguity>

➡️ **Recommended Draft**: <Your proposed draft formulation or recommended option>

---

❓ **Q2 — <Topic / Tier>**: <Question text>

➡️ **Recommended Draft**: <Your proposed draft formulation or recommended option>
```

Advance through the tiers until Mission, Vision, Strategy (3–5 bets + non-goals), Goals (North Star + metrics), and Roadmap (prioritized initiatives) are crisp and complete.

---

### Phase 3: Synthesize & Review

Before writing any files, present a consolidated summary of the strategy to the user for explicit sign-off:

1. **Mission Statement**: 1–2 sentence purpose.
2. **Vision Statement**: End-state picture + before/after contrast.
3. **Strategy**: 3–5 strategic pillars + explicit non-goals & trade-offs.
4. **Goals**: North Star metric + primary supporting KPIs per pillar.
5. **Roadmap**: Now / Next / Later initiative summary.

Ask the user to confirm the synthesis or request final tweaks.

---

### Phase 4: Determine Storage Location

Once approved, resolve the destination directory for the documentation bundle:

1. **Explicit path**: If the user provided a destination path, use it.
2. **Existing internal docs directory**: Search the repo for existing internal documentation directories. Look for:
   - `docs/`
   - Sibling internal folders such as `specs/`, `adr/`, `planning/`, `rfcs/`, `architecture/`
   - If an internal docs directory exists (e.g. `docs/`), nest the bundle inside `docs/strategy/`.
   - If internal folders like `specs/` or `adr/` live at repo root, place the `strategy/` directory alongside them or under `docs/strategy/` matching the project convention.
3. **Fallback**: If no internal documentation directories exist in the repo, create a new `docs/strategy/` directory.

---

### Phase 5: Write the Strategy Bundle

Write the strategy bundle inside the resolved `<target_dir>/strategy/` directory using the schemas in [templates.md](./references/templates.md):

| File | Purpose |
| :--- | :--- |
| **`README.md`** | Executive summary, alignment flow diagram, and pillar index table. |
| **`mission.md`** | Mission statement, core problem, target audience, values, durable boundaries. |
| **`vision.md`** | Vision statement, before-vs-after comparison table, 3–5 year horizon narrative. |
| **`strategy.md`** | Strategic narrative, 3–5 core bets/pillars (theses & initiatives), non-goals & trade-offs. |
| **`goals.md`** | North Star metric, supporting metrics by pillar (leading/lagging/guardrails), milestones. |
| **`roadmap.md`** | Prioritized initiatives grouped by horizon (Now / Next / Later) with ROI rationale. |

Verify that all files are created, correctly formatted, and cross-linked.

---

### Phase 6: Update AGENTS.md

If an `AGENTS.md` (or `CLAUDE.md`) exists in the repository root or `.dotfiles`, add a concise context pointer so other agents can discover and consume the strategy documents.

Add a single bullet under the existing pointers or documentation section:

```markdown
- Strategy, mission, vision, and roadmap docs live at `<relative_path_to_strategy_dir>/` (see `<relative_path_to_strategy_dir>/README.md`).
```

Keep the pointer concise and avoid duplicating file contents into `AGENTS.md`.
