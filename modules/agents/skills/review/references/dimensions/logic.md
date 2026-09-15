# Dimension: Logic & Edge Cases (`logic`)

Reviews whether the changed code or proposed design does what it should — behavioral correctness, gaps, contradictions, undefined behavior — and the abnormal cases the change must survive.

## Diff mode

### 1. Trace behavior end-to-end
- Does the new code do what its context (commit subject, PR body, surrounding code) implies it should?
- Do the new code paths compose correctly with existing callers and callees — return values, null/absence handling, error propagation, state updates?
- Are control-flow branches exhaustive and in the right order (early returns, fall-through, missing `else`)?
- Are conditions correct — inverted booleans, off-by-one, wrong variable in a comparison, wrong operator (`&&` vs `||`)?
- Does mutable state get updated consistently, including in loops, retries, and early-exit paths?
- Does anything silently change behavior for existing callers (signature changes, default-value changes, reordered checks)?

### 2. Abnormal cases to stress-test
- **Boundary values**: empty, zero, one, maximum, negative, NaN, empty string, null/undefined.
- **Malformed or unexpected input**: wrong types, partial data, unexpected encoding, oversized payloads.
- **Error paths**: what happens when the called API/DB/network fails, times out, or returns a partial result? Is the failure surfaced, swallowed, or ignored?
- **State transitions**: invalid sequences, re-entrancy, double submission, stale state, lost updates.
- **Concurrency and race conditions** where the change shares mutable state.
- **Data-shape drift**: what if a field that is always present today is absent, or a list is empty?

## Spec / plan mode

Does the design hold together as a system of behavior?
- **Gaps**: states, transitions, or inputs the plan doesn't say how to handle.
- **Contradictions**: two statements that cannot both hold.
- **Undefined behavior**: "what happens if X" left unstated where it matters.
- **Missing invariants**: assumptions the plan depends on but never states or enforces.
- **Error paths, boundary conditions, concurrent and failed states**: does the plan enumerate them — and say what should happen in each, not just that they exist?

## What to look for

Real behavioral defects, logic errors, and concrete unhandled cases a user or external system could actually hit — not hypothetical hardening or speculative "might" scenarios. Do **not** report style, naming, performance, or security concerns; other dimensions own those. Do **not** report issues that a compiler/typechecker or linter would catch, or theoretical edge cases that upstream guards or types already make impossible.
