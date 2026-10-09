---
name: "grafana-tempo"
description: "Query Grafana Tempo (distributed tracing) for traffic and latency investigations: request volume to a service, traffic by source service, filtering by path/method/user-agent, 5xx and error rates, p99 latency, or pulling example traces. Use for TraceQL, istio/kong/waypoint spans, tempo MCP tools, 'which service calls which', or debugging TraceQL queries that silently return zero rows."
---

# Grafana Tempo — internal tracing

Production distributed traces, collected at the L7 proxies only: Kong (edge), `istio-ingressgateway`, Istio ambient mesh waypoints, Fission router/executor, keycloak. Application pods emit no spans. Queries run through the `grafana_tempo_*` tools of the `mcp-internal-tooling` MCP server, inside the `execute` tool (code mode). These tools only see traces — dashboards, logs and metrics live in other tools.

## Calling the tools

```js
const T = tools["mcp-internal-tooling"];
const end = new Date().toISOString();
const start = new Date(Date.now() - 3600e3).toISOString(); // 1h ago

const res = await T.grafana_tempo_traceql_metrics_instant({
  datasourceUid: "tempo", start, end,
  query: '{ resource.service.name = "learn-platform-apis-waypoint.learn-platform-apis" && span:kind = server } | count_over_time()',
});
return JSON.parse(res.result); // { series: [{ labels, value }], metrics: { inspectedSpans, ... } }
```

All tools require `datasourceUid: "tempo"`. Results come back as JSON strings — parse them.

| Tool | Use for |
|---|---|
| `grafana_tempo_traceql_metrics_instant` | Numbers: counts, rates, percentiles, grouped breakdowns. Answers most questions. |
| `grafana_tempo_traceql_metrics_range` | Time series of the same. Bucket width is auto-sized (≈3s for a 15m window). |
| `grafana_tempo_traceql_search` | Find example traces. Returns at most 20 traces: IDs, root service, `serviceStats` per trace. |
| `grafana_tempo_get_trace` | Full span detail (all attributes) for one trace ID. Large JSON — aggregate in code. |
| `grafana_tempo_get_attribute_names` | List every usable TraceQL attribute, grouped by scope. |
| `grafana_tempo_get_attribute_values` | Distinct values of one attribute; accepts `filter_query` to narrow. |
| `grafana_tempo_docs_traceql` | Full TraceQL syntax reference (pipelines, structural operators, hints). |

Parameter names are exact: `trace_id` (snake_case) on `get_trace`, `name` on `get_attribute_values` and `docs_traceql` (required — omitting it errors), `filter_query` on `get_attribute_values`. `traceql_search` returns traces with a `traceID` field; pass that string back as `trace_id`.

**Time parameters accept RFC3339 strings only** (`2026-01-01T00:00:00Z`). `start: "1h"`, `end: "now"` and epoch seconds all fail with a parse error. Compute ISO strings with `new Date(...).toISOString()`. Duration literals *inside* queries (`span:duration > 100ms`) are fine.

## Data model

What a trace looks like for one edge request:

```
kong-ingress (SERVER span "kong", root)                    — public edge, e.g. http.host = dockerhub.datacamp.com
└─ istio-ingressgateway.istio-system (CLIENT span)         — server.address = <dest>.<ns>.svc.cluster.local
   └─ <ns>-waypoint.<ns> (SERVER span)                     — e.g. learn-experience-platform-waypoint.learn-experience-platform
      └─ (app pod — L4 only, no spans)
```

- **`resource.service.name` is the proxy**; for waypoint spans it is `<canonical-service>.<namespace>`. The destination of a span is in **`span:name`** (also `span.server.address`, `span.name.original`), formatted `<dest>.<ns>.svc.cluster.local:<port>/*`. A namespace waypoint serves many destination services — grouping by `span:name` is how you split them.
- **Who emits what:** kong → one SERVER span named `kong`; istio-ingressgateway → CLIENT spans (one per upstream hop); waypoints → SERVER spans. All Envoy spans carry `component=proxy`.
- **Trace context propagates through app headers, so one traceID can contain a whole fan-out** (kong request + every downstream internal call), but **parent links across app hops are missing**: apps propagate unsampled span IDs, so each internal waypoint span's parent is absent from the trace. Consequence: TraceQL structural operators (`>>`, `>` …) only match inside recorded chains — reliably, just the edge chain (kong → gateway → first waypoint). See [Source attribution](#source-attribution).
- **Status codes have two types.** Envoy spans (gateway, waypoints) store `http.status_code` as a **string** (`"307"`); kong stores it as an **int** (`307`). See [Gotchas](#gotchas).
- Envoy resources: `deployment.environment.name="prod"`, `k8s.cluster.name="app-cluster"`. Kong resources: `deployment.environment.name="production"`, `k8s.cluster.name="kong-ingress-us-east-1"`, plus `service.version`. Two different spellings of prod — filter per-proxy, not per-env.
- Only production data exists today. Kong already traces here (root spans); more sources may appear over time — re-check `get_attribute_names`/`get_attribute_values` rather than trusting this file.

### Attribute quick reference

| Attribute (span scope) | Meaning |
|---|---|
| `http.method`, `http.request.method` | Request method (both populated on Envoy spans) |
| `http.status_code` | Response status — **string on Envoy, int on kong** |
| `url.path` | Concrete request path (specific IDs, not templates) — filter with regex |
| `http.url` | Full URL as seen by that proxy (rewritten at each hop) |
| `server.address` | Destination host the proxy sent to (client spans), or serves (server spans) |
| `http.host` | Raw Host header — on kong spans this is the public hostname |
| `user_agent` | Full User-Agent string (Envoy spans only; kong spans have none). Reflects the *immediate* caller for internal traffic |
| `response_flags` | Envoy flags: `-` ok, `UH` no healthy upstream, `UC`/`DC` upstream/downstream connection terminated |
| `guid:x-request-id` | Shared across the kong → gateway → waypoint edge chain; regenerated at each internal hop |
| `kong.request.id` | Kong's request ID (kong spans only) |
| `http.client_ip`, `net.peer.ip` | Client / direct peer IP (kong spans) |
| `istio.canonical_service`, `istio.namespace` | The proxy's own identity |
| `node_id` | Emitting pod (`waypoint~IP~pod.namespace~…`) |
| `request_size`, `response_size` | Bytes |

Intrinsics (colon notation): `span:name`, `span:kind` (`server`/`client`), `span:status` (`error`/`ok`/`unset`), `span:duration`, `trace:rootService`, `trace:duration`. Envoy spans are mostly `span:status=unset` even on 5xx — detect HTTP errors via status codes, not span status.

## Recipes

Substitute the waypoint service name for the namespace you care about (look it up first if unsure: `get_attribute_values` on `resource.service.name`).

**Request volume to one destination service** (per hour, → per second with `| rate()`):

```
{ resource.service.name = "learn-platform-apis-waypoint.learn-platform-apis"
  && span:kind = server && span:name = "campus-api.learn-platform-apis.svc.cluster.local:80/*" }
| count_over_time()
```

**All destinations behind a waypoint:**

```
{ resource.service.name = "learn-platform-apis-waypoint.learn-platform-apis" && span:kind = server }
| count_over_time() by (span:name)
```

**Edge → mesh destinations** (which mesh services receive edge traffic):

```
{ resource.service.name = "istio-ingressgateway.istio-system" && span:kind = client }
| count_over_time() by (span.server.address)
```

**Public entry points** (kong root spans by Host header — expect scanner/wildcard noise like `-02.datacamp.com`; backtick raw strings avoid Go escape pitfalls):

```
{ resource.service.name = "kong-ingress" && span.http.host =~ `.*\.datacamp\.com` }
| count_over_time() by (span.http.host)
```

**Find where an app lives** (its waypoint and full span names, across all proxies at once):

```
{ span:name =~ "campus-api.*" && span:kind = server }
| count_over_time() by (resource.service.name, span:name)
```

**Ranking:** group-by series come back in label order, not value order. Append `| topk(10)` to limit the series, and still sort by `value` in code when ranking matters.

**Filter by method and path pattern.** Path values are concrete (`/api/v1/sessions/7618c387-…/heartbeat`), so patterns need regex. Regexes are **fully anchored** — wrap with `.*`:

```
{ resource.service.name = "learn-experience-platform-waypoint.learn-experience-platform"
  && span.http.method = "POST" && span.url.path =~ "/api/v1/sessions/.*/heartbeat" }
| count_over_time()
```

**Exclude user agents** (bots, probes, load tests) — full UA strings, regex-filtered:

```
{ resource.service.name = "learn-experience-platform-waypoint.learn-experience-platform"
  && span:kind = server
  && span.user_agent !~ ".*(HeadlessChrome|kube-probe|Baiduspider).*" }
| count_over_time()
```

This only works on Envoy spans: kong spans carry no `user_agent` at all, and any `user_agent` condition (positive or negated) excludes attribute-less spans entirely.

**Errors and latency:**

```
{ resource.service.name = "learn-platform-apis-waypoint.learn-platform-apis"
  && span:kind = server && span.http.status_code =~ "5.." } | count_over_time()      // 5xx (string!)
{ resource.service.name = "kong-ingress" && span.http.status_code >= 500 } | count_over_time()  // kong: int compare
{ resource.service.name = "learn-platform-apis-waypoint.learn-platform-apis"
  && span.response_flags != "-" } | count_over_time()                                // upstream failures
{ resource.service.name = "learn-platform-apis-waypoint.learn-platform-apis" && span:kind = server }
| quantile_over_time(span:duration, 0.99)                                            // seconds; also avg_/max_/min_over_time
{ resource.service.name = "learn-experience-platform-waypoint.learn-experience-platform"
  && span:kind = server && span.http.status_code =~ ".*" }
| count_over_time() by (span.http.status_code)   // split by status — the =~ ".*" forces the
                                                 // string column; without it, every group is nil
```

**Breakdown by caller type** (coarse — the `user_agent` is the immediate caller's client library):

```
{ resource.service.name = "dc-general-platform-waypoint.dc-general-platform" && span:kind = server }
| count_over_time() by (span.user_agent)
```

**Time series** (same query shape through `grafana_tempo_traceql_metrics_range`; ~3s buckets over a 15m window):

```
{ resource.service.name = "learn-experience-platform-waypoint.learn-experience-platform" && span:kind = server }
| count_over_time()
```

### Source attribution

- **From the edge:** structural metrics work across the recorded edge chain — `{ resource.service.name = "kong-ingress" } >> { resource.service.name = "<waypoint>.<ns>" } | count_over_time()` counts edge-originated traffic to that waypoint.
- **Mesh-internal hops (app → app): not reliably attributable.** The caller's span is never recorded, parent links are missing, `x-request-id` is regenerated per hop, and `downstream_cluster`/`peer.address` on waypoint server spans are `-`/`envoy://internal_client_address/`. The best available signal is `span.user_agent` (client library of the immediate caller). If apps gain OTel instrumentation later, re-verify — do not assume this limitation.

### Discovering the data when unsure

1. `get_attribute_names` → what can be queried (scoped: `resource`, `span`, `intrinsic`).
2. `get_attribute_values` with `filter_query` → real values, e.g. all `span:name` values behind one waypoint, or all `user_agent` values for one service.
3. `traceql_search` with the `with (most_recent=true)` hint + `get_trace` on an interesting ID → ground truth for how attributes actually look.

## Gotchas

- **`http.status_code` is a string on Envoy spans.** `= 500`, `>= 500` and even `!= nil` silently match nothing; `= "500"` and `=~ "5.."` work. Presence checks and group-bys on Envoy spans need `span.http.status_code =~ ".*"` to force the string column. Kong spans are the opposite (int). When in doubt, test with `= "200"` and `= 200`.
- **The span name is the intrinsic `span:name`** (colon notation). Dot notation `span.name` queries a nonexistent attribute and evaluates to nil.
- **Regexes are fully anchored** (Go RE2): `=~ "api/v1"` never matches; use `=~ ".*api/v1.*"`. String literals follow Go escaping rules — `"\."` is a parse error; escape as `"\\."` or use backtick raw strings: `` `.*\.datacamp\.com` ``.
- **`traceql_search` returns ≤ 20 traces** and, without `most_recent=true`, not necessarily the newest ones. Use it for examples, `traceql_metrics_*` for numbers.
- **Duration units differ by context:** metrics results (`avg_over_time`, `quantile_over_time`) are **seconds**; duration literals in span filters (`> 100ms`) are parsed with their unit. Long streaming spans are normal — max values of 100s+ at streaming-heavy services are real.
- **`resource.service.name` is the proxy** — filtering on an app name there matches nothing. Destination lives in `span:name` / `span.server.address`.
- **One request can be many spans:** a kong→gateway→waypoint request produces 3 spans. Count `span:kind = server` spans at one proxy for request counts; a raw `count_over_time()` over everything double-counts.
- **Watch `metrics.inspectedSpans`/`inspectedBytes`** in responses — they show how much a query scanned; prefer tight selectors over broad `{}` queries.
