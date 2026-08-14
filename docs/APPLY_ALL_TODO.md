# CineTrekker "Apply All" Launch-Readiness Todo List

This document outlines the concrete execution plan for all remaining local launch-readiness improvements requested by the user.

## Todo List & Execution Status

- [x] **Task 1: Bundle & Asset Optimization (P1-P2)**
  - *Action:* Optimize heavy component chunks and convert static Apple touch icons / branding assets to ensure maximum Lighthouse performance and optimal image delivery.
  - *Status:* Completed.
- [x] **Task 2: Deep-Dive RLS & Migration Security Audit (P1)**
  - *Action:* Inspect all Supabase migration files (`supabase/migrations/`) to verify Row Level Security policies, table ownership, trigger safety, and rate-limiting enforcement.
  - *Status:* Completed.
- [x] **Task 3: Comprehensive Accessibility Sweep Across All Routes (P2)**
  - *Action:* Run automated Playwright accessibility and viewport overflow checks across secondary routes (`/trending`, `/discover`, `/calendar`, `/settings`, `/profile`).
  - *Status:* Completed.
- [x] **Task 4: Finalize Execution Report & Deliverable (P3)**
  - *Action:* Package all findings, verification results, and execution records into a clear summary for the user.
  - *Status:* Completed.
