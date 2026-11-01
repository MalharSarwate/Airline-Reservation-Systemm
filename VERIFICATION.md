# Verification — 1 November 2026

Implemented authentication, flight search, transactional seat holds and booking, 2D/3D seat selection, extras, mock payments, My Bookings, cancellation, PDF tickets, and admin tools.

## Checks passed

- Java 21 / Maven clean verify: seven PostgreSQL integration scenarios passed, zero failures.
- Real PostgreSQL 17.11: all Flyway migrations applied; Hibernate schema validation and database-backed readiness passed.
- Concurrency: simultaneous holds produce one success and one 409; simultaneous checkout cannot confirm the same seat twice.
- Authentication: refresh rotation/replay rejection, login failure and role restrictions tested.
- Booking: idempotency, ownership privacy, PDF signature, cancellation, expired holds and declined mock payment tested.
- Admin: adding an aircraft layout and blocking an unreserved seat tested.
- Frontend: ESLint, strict TypeScript compilation, Vite production build and four Vitest/Testing Library tests passed.
- Playwright on installed Chrome: two E2E tests passed. Full two-passenger registration → seat selection → 3D overview → passenger camera → extras → mock decline → successful payment → PDF download → cancellation; mobile search and unauthenticated booking navigation.
- Camera screenshots wait for completion of the animated transition.
- SSE endpoint delivered seat refresh events while holds changed.

## Limits

- Docker is unavailable on the authoring machine. The separate Testcontainers migration test skipped; the seven application integration scenarios ran against real workspace-local PostgreSQL instead. Docker Compose startup itself remains unverified.
- No cross-device 60 FPS benchmark or comprehensive accessibility audit. Procedural instanced geometry is used instead of GLB assets. The lazy 3D chunk is approximately 239 KB gzip.
- Payments are mock and tickets are demo documents. Basic PDF typography replaces unsupported non-ASCII characters with question marks.
- The existing npm audit reports moderate development lint dependency findings. No high/critical findings were present after the dependency updates; the runtime-only audit reported no vulnerabilities.
- JWT sessions are kept in memory, so refreshing signs out. SSE broadcasts are local to one backend process. Production deployment and hardening are not included.

See README.md for reproducible commands, admin provisioning and configuration. Tests use local demo accounts only.

## Seat-planner update

- Backend: eight PostgreSQL integration scenarios and three provider-configuration tests passed; Docker-only migration test skipped because Docker remains unavailable.
- New atomic group-hold test confirms rollback restores old holds and leaves no partial allocation after a conflict.
- Frontend: eight unit/component tests passed, including plan adjacency, availability/cabin restrictions, budget, window preference and exact exit-row age boundary. Lint and production build passed.
- Three Playwright browser journeys passed; booking journey now includes applying a group plan, comparing seats and opening a comparison's passenger view before mock checkout and cancellation.

## GitHub Pages frontend demo

- Added separate Pages build with repository asset base and hash routing; normal development still targets Spring Boot.
- Thirteen frontend unit/component tests passed, including browser-local booking, idempotency, PDFs, expiry, payment decline, group rollback and reset.
- Two static-host Playwright journeys passed against a production build, covering desktop two-traveller booking and mobile/admin/reload/reset. The booking test asserts that no backend API requests are made.
- Browser-local state simulates backend operations for presentation only; no real account authentication, cross-visitor seat locking, airline inventory or payment is claimed by this deployment.

- GitHub Actions deployment succeeded. The published CSS and JavaScript assets returned HTTP 200, and both static-demo Playwright journeys passed against the actual public GitHub Pages URL.
