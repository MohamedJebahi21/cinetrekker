# Local remediation validation notes

## 2026-08-20

The updated local Vite server started on port 8081 because port 8080 was already occupied. Browser navigation to `http://localhost:8081/` showed only the bootstrap shell (`CT` and `CineTrekker`) after waiting, with no visible interactive elements. The browser console reported no output. This state is unsuitable for validating the client changes until the local bootstrap/runtime mismatch is diagnosed; TypeScript validation and the production client build had already passed.

## 2026-08-20 follow-up

The local Vite development server is not a suitable browser target under the current strict Trusted Types policy: its dynamically loaded module fails in the browser and the bootstrap watchdog replaces the shell after 12 seconds. A production-style `vite preview` on port 8082 does mount and render the updated application. In that preview, the new Home hero skeleton maintains the same reserved visual area above the first main-content cards, avoiding the previous zero-height-to-hero expansion. Local preview cannot complete TMDB-backed requests because it lacks the production server/proxy environment; its Fresh Discovery section shows the existing retry state. Final data-resolved layout and invalid-detail fallback verification therefore require the deployed Vercel environment.

## 2026-08-20 deployed verification

After the release quality gate passed, direct production navigation to `https://cinetrekker.vercel.app/movie/not-a-real-cinetrekker-title-999999999` successfully booted the client. It rendered a visible “The requested title was not found” recovery state with retry and global navigation instead of the prior blank page. This verifies the deployed `api/edge-meta.js` fallback repair.

A production check of `/this-route-should-not-exist-2026` rendered the visible 404 recovery page. After hydration, the document reported `robots: noindex,follow`, the expected 404 H1, and the current self-canonical URL. This verifies the deployed noindex correction.

The final quality workflow for the Discover spotlight-slot correction passed. A subsequent production measurement still reported Home CLS near zero but Discover CLS 0.418 from a shift at about 1.9 seconds in which the footer left the viewport as Discover content rendered. The settled live Discover page itself showed the populated spotlight, Browse By, and Mood controls correctly. This remains an open stability investigation and is not yet a verified performance pass.
