# Browser Push Opt-In Test Record

**Date:** 20 August 2026  
**Environment:** CineTrekker production, using a private disposable account only  
**Scope:** Explicit opt-in control, permission request behaviour, and resulting subscription state. No real user account was used.

## Result

The application-level opt-in path is correctly exposed only through **Settings → Notifications → Enable browser alerts**. It does not request notification permission on page load.

The disposable account was signed in and the explicit **Enable browser alerts** control was activated. The hosted automated browser cannot complete the native browser-notification permission lifecycle: after the interaction, its active page was reset to `about:blank`, where notification permission is denied and no service-worker context is available. This is an environment limitation, not evidence of a production delivery failure.

| Check | Outcome |
|---|---|
| Browser-alert control is explicit and user-initiated | **Pass** |
| Browser-alert control appears only in signed-in Settings | **Pass** |
| Permission requested on page load | **Pass: not requested** |
| Disposable account preference after attempt | **Pass: `browser_push_enabled = false`** |
| Disposable account subscription after attempt | **Pass: zero `push_subscriptions` rows** |
| Native permission grant and real notification delivery | **Pending real-browser verification** |
| Disable/unsubscribe lifecycle | **Not applicable in this environment** because no subscription was created |

## Required completion in a real browser

Use a disposable CineTrekker account in a normal desktop or mobile browser, then sign in and open **Settings → Notifications**. Click **Enable browser alerts** intentionally, accept the browser permission prompt, and confirm the button changes to **Disable on this device**. Verify that one active subscription is created and that `browser_push_enabled` is true. Trigger an approved test notification, confirm it is received, then click **Disable on this device** and verify that the subscription becomes inactive and the preference returns to false.

> Browser alerts must remain opt-in only. Do not request permission during page load, sign-in, or ordinary navigation.
