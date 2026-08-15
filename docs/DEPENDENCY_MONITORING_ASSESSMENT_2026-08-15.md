# Dependency Monitoring Assessment — 15 August 2026

## Purpose and scope

This assessment reviews observability for CineTrekker’s two launch-critical managed dependencies: **Supabase Auth** and the **managed Upstash Redis** instance used by production request-rate limiting. It is deliberately read-only. No dashboard setting, environment variable, alert destination, billing plan, or provider integration was changed.

## Current coverage

| Dependency | Confirmed observation | Launch implication |
|---|---|---|
| Supabase Auth | The project’s Auth Logs view is available. In the visible one-hour window, it showed four `INFO` events for `Login` or `/token | request completed` and no visible errors. The view provides time, severity, status-code, and endpoint filters. | There is a workable first-line investigation surface for sign-in and OAuth failures, but no evidence of an active threshold alert or scheduled review. |
| Upstash Redis rate limiting | Production code resolves Vercel-managed Upstash aliases first, performs the counter update through the REST pipeline endpoint, and fails closed with HTTP `503` when Redis is unavailable. It emits a `rate_limit_unavailable` security event. | A Redis failure protects the application from unprotected writes, but it also blocks protected API paths. Detecting this promptly is therefore an availability requirement. |
| External uptime | Existing UptimeRobot monitors cover the public homepage and discovery/API route every five minutes. | Public reachability is independently monitored, but these checks do not prove Auth success or Redis counter health. |

> **Operational distinction:** An “Up” public page can coexist with a degraded sign-in or rate-limit dependency. Dependency signals must therefore complement, rather than replace, the existing uptime checks.

## Provider capabilities and constraints

Supabase automatically captures authentication events—including signups, logins, verification, recovery, token refresh, and logout—in Auth audit logs. Its dashboard also exposes Auth server logs, and the Logs Explorer can query the `auth_logs` source. Database-backed audit-log storage is optional and consumes database storage. [1] [2]

Upstash’s console supplies operational charts for request volume, throughput, service-time latency, data size, connections, keyspace, and hits/misses. The Prometheus integration can feed operator-defined retention rules and alerts, but Upstash documents that it is available only for Pro databases or Enterprise-plan coverage. [3] [4]

| Option | Benefit | Cost or limitation | Recommendation |
|---|---|---|---|
| Supabase Auth Logs and Logs Explorer | Fast incident triage for failed login, OAuth callback, token, and provider errors. | Retention depends on the Supabase plan; this is investigation capability, not an automatic alert. | **Adopt now as procedure**; no provider change required. |
| Supabase Auth audit-log database storage | Enables SQL-searchable audit entries in `auth.audit_log_entries`. | Uses database storage and should be retained only as long as operationally necessary. | **Approval required** before enabling. |
| Supabase Log Drain | Sends provider logs to an external observability destination for alerting and retention. | Requires a chosen recipient, credentials, privacy review, and possibly recurring cost. | **Defer pending approval.** |
| Upstash Console metrics | Shows demand, latency, cache efficiency, and capacity indicators without application changes. | Requires periodic human review; no alert routing has been verified. | **Adopt now as procedure**; no provider change required. |
| Upstash Prometheus and Grafana | Supports tailored dashboards, retention, recording rules, and alerts. | Requires a supported Upstash plan plus a Prometheus/Grafana operating environment and monitoring token management. | **Defer** unless traffic or on-call needs justify the operational overhead. |
| Existing security-event webhook | The application can send a throttled alert for `rate_limit_unavailable` when `SECURITY_ALERT_WEBHOOK_URL` is set. | The current configuration is intentionally not inspected. The event payload can include request metadata, so a privacy review is required before routing it externally. | **Approval required** before configuration or validation. |

## Recommended operating model

For the present launch stage, use a light operational model that preserves privacy and cost discipline. The owner should review the Supabase Auth Logs at least daily during the first two launch weeks, then weekly if the error baseline remains stable. A review should filter the prior 24 hours for non-success statuses and inspect unexpected spikes in `Login`, `/token`, recovery, and OAuth-related failures. During any sign-in incident, correlate the timestamp with API and Postgres logs rather than searching all sources at once, as Supabase recommends source-specific, time-bounded investigation. [2]

The owner should review the Upstash console once per week and after any rate-limit incident. The minimum dashboard checks are request volume, service-time tail latency, data size, and hits/misses. A sudden drop in Redis requests alongside increased application `503` responses may indicate a connectivity or credential path failure; a sustained rise in latency or error signals should be treated as an incident precursor.

| Signal | Initial trigger | First response | Escalation threshold |
|---|---|---|---|
| Auth failure | User report, Auth-log error, or spike in non-success status codes. | Confirm the affected provider and endpoint; check recent deployment and OAuth configuration changes; preserve timestamps and request IDs. | Repeated failures across accounts or an inability to sign in with a supported provider for more than 15 minutes. |
| Rate-limit dependency failure | `rate_limit_unavailable` security event, protected endpoint returning `503`, or related Vercel error. | Confirm Redis reachability and managed integration variables without exposing values; check Upstash health metrics and Vercel function logs. | Two or more affected protected endpoints or sustained `503` responses for five minutes. |
| Capacity or latency concern | Upstash throughput, data size, or tail-latency trend materially deviates from its normal baseline. | Capture the time window and affected endpoints; compare with expected traffic and recent releases. | Trend persists for one hour or causes user-visible endpoint failures. |

## Approval-gated next actions

The following actions are intentionally **not** performed by this assessment. They need explicit approval because they alter a provider configuration, create a third-party data flow, or may incur ongoing cost.

1. Enable Supabase database-backed audit-log storage or create a Log Drain.
2. Configure and test `SECURITY_ALERT_WEBHOOK_URL` with a vetted alert destination and a data-minimised payload.
3. Upgrade or change the Upstash plan, enable Prometheus, issue a monitoring token, or operate Grafana/Prometheus.
4. Add external synthetic checks that perform an Auth or rate-limit mutation rather than a safe public health check.

## References

[1]: https://supabase.com/docs/guides/auth/audit-logs "Supabase Auth Audit Logs"
[2]: https://supabase.com/docs/guides/monitoring-and-debugging/logs "Supabase Logging and Logs Explorer"
[3]: https://upstash.com/docs/redis/howto/metrics-and-charts "Upstash Redis Metrics and Charts"
[4]: https://upstash.com/docs/redis/integrations/prometheus "Upstash Redis Prometheus Integration"
