# Dimension: Performance & Scalability (`performance`)

Reviews for latency regressions, algorithmic complexity, memory pressure, N+1 queries, and data-growth risks.

## Diff mode

Focus on hot paths, data volume, and data growth:
- **Complexity**: nested loops over the same collection, O(n²) or worse patterns introduced by the change, quadratic string/JSON building in loops.
- **N+1 queries**: per-item DB/API calls inside loops where one batched call would do.
- **Memory**: unbounded collections, loading entire tables/files into memory where streaming/pagination fits, retained references.
- **Redundant work**: recomputing the same value in a loop, duplicated requests, missing caching where the codebase already caches similar values.
- **I/O**: serial awaits that could run in parallel, sync file operations on hot paths.
- **Rendering/UI**: work re-run on every render/keystroke that could be memoized or moved out.
- **Data growth**: will this get slower as the dataset, user count, or time horizon grows? What happens at 10× current volume?

Judge relative to the codebase's existing standards — do **not** flag micro-optimizations the codebase never bothers with, do **not** demand caching where none exists and the workload doesn't need it, and do **not** raise speculative "might be slow" claims without concrete evidence that the code path handles large volume or hot execution.

## Spec / plan mode

Only if the design plausibly touches hot paths, large data sets, or data growth: does the plan address scaling, batching, pagination, caching, or indexes where its own scale assumptions require them?

## What to look for

Measurable, concrete regressions or capacity risks introduced (or overlooked) by this change.
