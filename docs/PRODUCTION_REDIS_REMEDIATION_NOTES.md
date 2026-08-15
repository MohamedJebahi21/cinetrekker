# Production Redis Remediation Notes

On 15 August 2026, the production TMDB proxy was probed with the required first-party Origin header. It returned HTTP 503 with the client-safe error `Request protection is temporarily unavailable. Please try again shortly.` and a request reference beginning `ct_`.

The Vercel CineTrekker project contains both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, scoped to Production and Preview. The values are sensitive and were not revealed or copied. Their existing configuration does not allow the production rate limiter to establish a usable Redis connection.

The Vercel edit form requires replacement credentials; it does not generate or repair Upstash values itself. A valid Upstash REST URL and REST token must be provisioned or recovered through an authorized Upstash account or managed-store integration, then saved to these two Vercel variables and redeployed.

## Managed Upstash Provisioning

A new managed Upstash Redis database, `upstash-kv-champagne-forest`, was provisioned through the Vercel marketplace on the free `iad1` plan and connected to CineTrekker for Production and Preview. No secret values were revealed.

The integration generated masked variables under the selected prefix, including `UPSTASH_REDIS_REST_KV_REST_API_URL` and `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`; it did not replace the application’s legacy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names. The server-side rate-limit resolver must accept these managed-variable aliases, after which a deployment can safely use the new store without copying credentials.

The compatibility commit `7282880` passed the complete local quality gate and was pushed to `main`. Vercel built and marked its production deployment ready in 18 seconds. Live protected-endpoint verification is the next step.

## Initial Live Verification

A direct same-origin probe of `/api/tmdb-proxy?endpoint=%2Ftrending%2Fall%2Fday` returned HTTP 200 with TMDB JSON and an `X-Request-Id`, confirming the managed Redis-backed protection path is reachable. The first browser homepage load nevertheless rendered the client-safe Fresh Discovery error state with reference `ct_fb736391ef774eee8c2e55a502eb4820`. No browser-console error was emitted. Server logs and the exact homepage request shape must be inspected before declaring the release healthy.
