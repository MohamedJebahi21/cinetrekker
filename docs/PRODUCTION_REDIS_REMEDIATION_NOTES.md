# Production Redis Remediation Notes

On 15 August 2026, the production TMDB proxy was probed with the required first-party Origin header. It returned HTTP 503 with the client-safe error `Request protection is temporarily unavailable. Please try again shortly.` and a request reference beginning `ct_`.

The Vercel CineTrekker project contains both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, scoped to Production and Preview. The values are sensitive and were not revealed or copied. Their existing configuration does not allow the production rate limiter to establish a usable Redis connection.

The Vercel edit form requires replacement credentials; it does not generate or repair Upstash values itself. A valid Upstash REST URL and REST token must be provisioned or recovered through an authorized Upstash account or managed-store integration, then saved to these two Vercel variables and redeployed.

## Managed Upstash Provisioning

A new managed Upstash Redis database, `upstash-kv-champagne-forest`, was provisioned through the Vercel marketplace on the free `iad1` plan and connected to CineTrekker for Production and Preview. No secret values were revealed.

The integration generated masked variables under the selected prefix, including `UPSTASH_REDIS_REST_KV_REST_API_URL` and `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`; it did not replace the application’s legacy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names. The server-side rate-limit resolver must accept these managed-variable aliases, after which a deployment can safely use the new store without copying credentials.
