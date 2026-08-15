# Independent Uptime Monitoring Recommendation — 15 August 2026

## Decision

CineTrekker should add an independent external monitor before broad public launch. The recommended initial provider is [UptimeRobot](https://uptimerobot.com/api/), whose documented free plan supports up to 50 monitors at five-minute intervals. This covers the current Vercel Hobby-plan alerting gap without introducing application credentials or a new production dependency. [1]

## Proposed monitor configuration

| Monitor | URL | Expected result | Purpose |
|---|---|---|---|
| Public experience | `https://cinetrekker.vercel.app/` | HTTP `200` and page content containing `CineTrekker` | Detects hosting, routing, static-asset, and public-site availability failures. |
| Discovery/API dependency | `https://cinetrekker.vercel.app/api/tmdb-proxy?endpoint=/trending/all/day&language=en` | HTTP `200` and JSON containing `results` | Exercises Vercel serverless execution, request protection, managed rate-limit availability, and the TMDB discovery path. |

Both targets were checked successfully in read-only mode on 15 August 2026. The discovery endpoint should use a conservative five-minute cadence because it performs a real, cacheable upstream-content request.

## Alert design

The owner email should be the initial alert contact. Configure alerts after two consecutive failed checks, which avoids transient one-check noise while identifying a sustained outage within approximately ten minutes. Alert messages should include only the monitor name, timestamp, HTTP status, and response-time summary. They must not include OAuth URLs, query payloads beyond the fixed monitor URL, tokens, or application-user data.

A public status page is optional at this stage. It should be added only after the owner has a repeatable incident-communication process. Better Stack is a viable alternative if the team prioritizes a free hosted status page and three-minute checks over the larger free monitor allowance offered by UptimeRobot. [2]

## Approval boundary

No UptimeRobot, Better Stack, or other monitoring account has been created. No monitor, alert contact, webhook, status page, Vercel setting, Supabase setting, or production code has been modified. Creating the two recommended monitors requires explicit approval and an account-controlled confirmation.

## References

[1] [UptimeRobot API and free-plan summary](https://uptimerobot.com/api/)  
[2] [Better Stack Uptime](https://betterstack.com/uptime)
