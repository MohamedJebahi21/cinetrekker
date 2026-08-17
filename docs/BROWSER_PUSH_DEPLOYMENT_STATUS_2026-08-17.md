# Browser Push Deployment Status

**Date:** 2026-08-17  
**Status:** **Production rollout complete.** Browser alerts and weekly-digest delivery are deployed with explicit user opt-in, server-only VAPID credentials, and managed recurring jobs.

## Production configuration

| Component | Production state | Verification evidence |
|---|---|---|
| Notification schema | Applied | `notification_preferences`, `push_subscriptions`, and `notification_delivery_log` are live with their row-level security policies. |
| Delivery worker | Deployed | `notification-delivery` is live with legacy JWT verification disabled; it validates its own scheduler credential instead. |
| VAPID credentials | Configured server-side | `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, and `WEB_PUSH_CONTACT_EMAIL` are encrypted Edge Function secrets. The private key is never added to the web client. |
| Client key | Deployed | `VITE_WEB_PUSH_PUBLIC_KEY` is configured in Vercel for Production and Preview; the production Settings screen now shows an active **Enable browser alerts** action rather than **Coming soon**. |
| Scheduler isolation | Configured | `NOTIFICATION_DELIVERY_CRON_SECRET` is dedicated to this worker, leaving the pre-existing `CRON_SECRET` used by the episode checker unchanged. |
| Scheduled jobs | Active | `cinetrekker-notification-pending-push` runs every 15 minutes; `cinetrekker-weekly-watchlist-digest` runs daily at 00:00 UTC. |

## Privacy and opt-in safeguards

The web app registers its service worker after the first render, but it does **not** request notification permission on page load. The permission request is reachable only from **Settings → Notifications → Enable browser alerts**. A device subscription can be created only after the user grants that system permission and enables Browser Alerts in the app.

> The delivery worker evaluates only subscriptions whose owner has opted in to browser push and to the relevant notification preference. Existing in-app notification behavior remains independent and unchanged.

The scheduled calls use Vault-backed values and a dedicated scheduler credential. The worker accepts that credential through `x-cron-secret`; it is not committed to source control and is not exposed to the browser.

## Verification completed

| Check | Result |
|---|---|
| Production worker authorization via isolated scheduler credential | Passed. A no-delivery probe reached the worker and returned the expected validation response `400 A notification record is required`, demonstrating that the request was authenticated rather than rejected as unauthorized. |
| Managed network call path | Passed. `pg_net` returned request ID `1` and recorded the expected worker response without an error. |
| Scheduled jobs | Passed. Both jobs are present and marked active in `cron.job`. |
| Frontend availability | Passed. The signed-in production Settings page displays the active **Enable browser alerts** control. |
| Permission on initial page load | Passed by design. The application does not prompt on load; permission is requested only through the explicit Settings action. |

## Remaining user-level acceptance test

A signed-in browser must still grant the operating system's notification permission through the explicit Settings action. That one interactive acceptance step should then confirm that a row is created in `push_subscriptions` for the device. It was intentionally not auto-granted during deployment testing.

The implementation follows the browser requirement that notification permission be requested from a user gesture and that persistent delivery use a service worker.[1] [2] The managed scheduler uses Supabase Cron (`pg_cron`) and asynchronous network requests (`pg_net`).[3] [4]

## References

[1] [MDN — Web Push API Notifications best practices](https://developer.mozilla.org/en-US/docs/Web/API/Push_API/Best_Practices)  
[2] [MDN — Using the Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API)  
[3] [Supabase — Cron](https://supabase.com/docs/guides/cron)  
[4] [Supabase — pg_net: Async Networking](https://supabase.com/docs/guides/database/extensions/pg_net)
