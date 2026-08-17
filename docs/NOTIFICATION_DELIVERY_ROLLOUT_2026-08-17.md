# CineTrekker Notification Delivery Rollout

**Author:** Manus AI  
**Date:** 2026-08-17  
**Status:** In-app controls implemented; background and cross-device delivery intentionally deferred.

## Current implementation

CineTrekker now exposes a notification control center inside **Settings**. It gives users an effective control for followed-title release updates and a separate control for small in-app update banners. The current implementation persists these choices locally on the active device and gates the existing client-side followed-title notification producer before it writes an inbox item or displays a toast. When release updates are disabled, the producer still refreshes its followed-title state so turning alerts back on does not create a backlog of outdated updates.

The interface also makes two future categories visible without pretending they are active: **replies and social activity**, and a **weekly watchlist digest**. Both are explicitly marked as upcoming. The notification preview now contains a direct link to these controls.

> The first principle for the future delivery system is that notification controls must always be more specific than the delivery channel. A user should decide *which events* are useful before being asked to allow a browser or email to deliver them.

## Delivery options for the next phase

| Approach | User experience and tradeoffs | Cost | Setup complexity |
|---|---|---:|---:|
| **Keep the in-app inbox only** | The product continues to show follow updates while users are active in CineTrekker. It has no permission prompt and no background delivery, but it cannot bring users back when the app is closed. This is the lightest and safest option. | No new delivery cost | Small |
| **Opt-in web push plus scheduled digest** | Users explicitly enable browser alerts from Settings, and a background job checks releases, prepares a weekly digest, and sends only eligible items. It reaches users away from the site, but requires a service worker, a stored push subscription for each device, VAPID credentials, server-side message signing, delivery limits, and a robust unsubscribe path. | Provider and background-compute dependent | Large |

The second option is appropriate only after the release-alert category has proven useful in the inbox and after preferences are migrated from device-local storage to user-level storage. It must not use a browser permission prompt on page load. MDN recommends asking permission after a user action, using only useful and time-sensitive notifications, and making opt-out easy.[1] [2]

## Recommended next delivery design

The preferred implementation path for true delivery is a user-controlled background job paired with a dedicated subscription table. For each device, CineTrekker would store only the browser push subscription, user identifier, preference version, and subscription status. A service worker would render mobile-compatible notifications through `ServiceWorkerRegistration.showNotification()`. The product would request permission only from a clear **Enable browser alerts** action after explaining the exact categories enabled.[2]

Release checks and the weekly digest are deterministic. They should be run by a scheduled backend job rather than an AI task. Supabase supports recurring Postgres jobs and can invoke Edge Functions on a schedule, which fits the current Supabase-backed architecture.[3] [4] A later release-alert job should run at a modest cadence, deduplicate by title and event, respect a quiet-hour policy, and use a short expiry for time-sensitive release messages. The weekly digest should run once per user-selected week and only when the user has opted in.

## Delivery safeguards

| Safeguard | Requirement |
|---|---|
| Consent | Request browser permission only from an explicit user action, never from page load or the activation flow. |
| Relevance | Start with followed-title episode/release events, direct replies, and a single weekly digest. Do not send generic recommendations. |
| Frequency | Deduplicate per title and event; combine bursts into a single notification; default weekly digest to off. |
| Mobile compatibility | Use a service worker for system notifications rather than the page-level `Notification()` constructor. |
| Unsubscribe | Provide a one-click disable control in Settings and register subscription removal immediately. |
| Observability | Record send attempts, delivery failures, opt-outs, and notification opens without storing title text in analytics. |

## References

[1] [MDN — Web Push API Notifications best practices](https://developer.mozilla.org/en-US/docs/Web/API/Push_API/Best_Practices)  
[2] [MDN — Using the Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API)  
[3] [Supabase — Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)  
[4] [Supabase — Cron](https://supabase.com/docs/guides/cron)

## Production verification

Production verification on 2026-08-17 confirmed that the signed-in **Settings → Notifications** section renders the effective followed-title release switch and the separate in-app update-banner switch. The release switch, banner switch, open-inbox link, desktop Settings navigation entry, and explicitly marked upcoming social/digest categories were all present and readable. The control center correctly states that browser and email delivery are not yet enabled.
