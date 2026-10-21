---
name: "kong-datadog-logs"
description: "Find Kong request logs in Datadog: per-endpoint traffic, status codes, latency, client geo and callers for any service behind Kong. Use when asked what traffic a service receives, which endpoints are hit, who calls them, how many 4xx/5xx a route returns, whether old endpoints are still used, or when a Kong log query returns nothing."
---

# Kong request logs in Datadog

Kong ships two unrelated streams to Datadog, both tagged `source:kong`:

| Stream | Selector | One record per | Has `@route.*` |
|---|---|---|---|
| Access log | `source:kong service:<upstream-service>` | request | yes |
| Kong's own log | `source:kong service:kong` | nginx error / plugin warning | no |

**Query traffic with `source:kong service:<upstream-service>`.** The `service` is the upstream, never `kong`.

## Querying

```js
const D = tools["datacamp-internal-cloudflare-mcp"];

const res = await D.datadog_analyze_datadog_logs({
  filter: "source:kong service:checkout-api",
  from: "now-24h",
  to: "now",
  sql_query: `SELECT "@http.url_details.path" AS path, "@http.method" AS m,
                     "@http.status_code" AS s, count(*) AS n
              FROM logs
              GROUP BY "@http.url_details.path", "@http.method", "@http.status_code"
              ORDER BY count(*) DESC LIMIT 30`,
  extra_columns: [
    { name: "@http.url_details.path", type: "varchar" },
    { name: "@http.method", type: "varchar" },
    { name: "@http.status_code", type: "bigint" },
  ],
  telemetry: { intent: "..." },
});
```

`datadog_search_datadog_logs` returns the same fields for one raw record (`extra_fields: ["*"]`), displayed with a `custom.` prefix.

## Attributes

| Attribute | Notes |
|---|---|
| `@http.url_details.path` | request path — the field for endpoint questions |
| `@http.url` | full URL including host |
| `@http.method`, `@http.status_code` | `@http.status_code` is numeric |
| `@http.status_category` | `OK`, `warning`, … |
| `@http.useragent` | client User-Agent |
| `@request.uri` | path as received, before any rewrite |
| `@upstream_uri` | path after the rewrite — compare to `@request.uri` to see what Kong did |
| `@upstream_status` | status returned by the upstream |
| `@request.id` | Kong request id |
| `@request.headers.host`, `.origin`, `.referer`, `.user-agent`, `.x-forwarded-for`, `.x-requested-with`, `.x-client-service-name` | caller identity and provenance |
| `@request.size`, `@response.size` | bytes |
| `@response.status`, `@response.headers.x-kong-upstream-latency` | upstream response and timing |
| `@route.name`, `.hosts`, `.id`, `.strip_path` | the Kong route that matched |
| `@service.name`, `.host`, `.port` | the upstream Kong service |
| `@latencies.kong`, `.proxy`, `.request`, `.kong_internal`, `.dns`, `.client`, `.third_party` | milliseconds |
| `@client_ip`, `@network.client.geoip.country.iso_code`, `.city.name`, `.as.name`, `.as.number` | caller geo and ASN |
| `@trace_id.w3c` | W3C trace id, usable in Tempo |
| `@tries` | one entry per upstream attempt (host, ip, balancer latency) |

The Datadog `status` field maps onto the status code: `ok` = 2xx, `notice` = 3xx, `warn` = 4xx, `error` = 5xx. So `status:warn` is the cheap way to isolate client errors without declaring extra columns.

## Recipes

```
filter: source:kong service:<svc> status:warn                       // 4xx only
filter: source:kong service:<svc> @http.status_code:[500 TO 599]    // 5xx
filter: source:kong service:<svc> @http.url_details.path:/health    // one endpoint
```

Endpoint census, legacy-route check, and caller breakdown — all the same SQL shape:

```sql
-- endpoints no longer under a versioned prefix
WHERE "@http.url_details.path" NOT LIKE '/api/v1/%'
-- distinct callers rather than request count
SELECT count(DISTINCT "@client_ip") AS ips, count(*) AS n FROM logs
-- who: country, browser, referring app
GROUP BY "@network.client.geoip.country.iso_code", "@http.useragent", "@request.headers.referer"
```

## Pitfalls

- **`service:kong` is a trap.** It is the proxy's own stderr — nginx errors and plugin warnings, no request lines. Zero records there carry `@route.name`. A real service's traffic lives under its own name, and `service:kong` volume tracks warnings, not traffic.
- **`custom.X` in search output becomes `@X` in `extra_columns`.** Declaring `"@custom.http.url"` fails with `Column '@custom.http.url' cannot be resolved`.
- **Access logs have an empty `message`.** `message LIKE '%/path%'` and `use_log_patterns` both find nothing; every useful field is an attribute.
- **`service:` alone mixes streams** for any service that also logs itself — add `source:kong` to exclude the app's own records. For services that don't log, it changes little; for ones that do it is the difference between 190k and 1.8M rows.
- **Volume is high** — hundreds of thousands to millions per day for a busy route. Always bound the window; a 14-day query is a 180s timeout candidate.
- **The record's `tags` array carries the Kong pod's tags**, including `service:kong` and `kube_cluster_name:kong-cluster`. Trust the `service` field for whose traffic it is, not the tags.
- **Unmatched traffic and health checks** show empty `@route.name`, `@http.url_details.path` and `@http.status_code`. Skip them before drawing conclusions about coverage.
- **`@http.url_details.path` is usually clean** of query strings, but scanner probes can put `?...` in the path itself, so don't assume one URL segment.

## Cross-check against traces

Tempo holds Kong root spans under `resource.service.name = "kong-ingress"`, at a 5% sample (see the `grafana-tempo` skill). They carry `span.http.host`, `span.http.url` and `span.http.client_ip` — but no `span.url.path`, so match on `span.http.url` here. Use Tempo for shape and caller attribution, Datadog for exact counts.
