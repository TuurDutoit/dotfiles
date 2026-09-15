# Dimension: Code Quality & Standards (`quality`)

Reviews code quality, documented repo standards, abstractions, simplification, naming, and the smell baseline (code changes only; never runs in spec/plan mode).

## Track 1 — Documented standards (hard findings)

Read the repo's documented coding standards — `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CODING_STANDARDS.md`, whichever exist at the checkout path — and report every place the diff violates one, **citing the exact standard (file + rule)**.
- Do **not** report a violation if the rule is explicitly silenced in the code (e.g. via an ignore comment, disable directive, or documented exception).
- Do **not** report missing tests / coverage gaps unless the documented standard explicitly requires them for the changed area.
- A documented standard outranks Track 2: where a documented standard endorses something a smell would flag, the repo wins.

## Track 2 — Smell baseline and generic quality (judgement calls)

Read `references/smell-baseline.md` for Fowler code smells. Baseline smells are always judgement calls, never hard violations — phrase them as "possible `<smell>`".

### Negative filters — do NOT report:
- Anything tooling already enforces (linters, formatters like `oxfmt`/`prettier`, typecheckers like `tsc`).
- Pedantic nitpicks a senior engineer would not flag.
- Subjective style preferences not explicitly mandated in documented repo standards.
- Speculative "might be confusing" complaints without concrete clarity defects.

### Also check:
- Unnecessary new abstractions that add indirection without value.
- Code that can be removed, merged, or simplified directly in this diff.
- Naming (variables, functions, types) demonstrably inconsistent across the changed files or with existing codebase conventions.
- Obfuscated code whose intent is genuinely unclear.

## What to look for

Quality issues in the changed code itself. The **diff is the primary source of truth** for what changed; read the relevant source files at the checkout path for context.
