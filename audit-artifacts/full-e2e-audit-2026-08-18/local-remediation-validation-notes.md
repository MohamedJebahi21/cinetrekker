# Local remediation validation notes

## 2026-08-20

The updated local Vite server started on port 8081 because port 8080 was already occupied. Browser navigation to `http://localhost:8081/` showed only the bootstrap shell (`CT` and `CineTrekker`) after waiting, with no visible interactive elements. The browser console reported no output. This state is unsuitable for validating the client changes until the local bootstrap/runtime mismatch is diagnosed; TypeScript validation and the production client build had already passed.

## 2026-08-20 follow-up

The local Vite development server is not a suitable browser target under the current strict Trusted Types policy: its dynamically loaded module fails in the browser and the bootstrap watchdog replaces the shell after 12 seconds. A production-style `vite preview` on port 8082 does mount and render the updated application. In that preview, the new Home hero skeleton maintains the same reserved visual area above the first main-content cards, avoiding the previous zero-height-to-hero expansion. Local preview cannot complete TMDB-backed requests because it lacks the production server/proxy environment; its Fresh Discovery section shows the existing retry state. Final data-resolved layout and invalid-detail fallback verification therefore require the deployed Vercel environment.
