# Airline Reservation System

**Shareable frontend demo:** [Open Aeroline on GitHub Pages](https://malharsarwate.github.io/Airline-Reservation-Systemm/)

The Pages version includes all frontend pages, compiled CSS, JavaScript and the interactive 3D cabin. It runs with explicitly simulated browser-local accounts, seats, bookings and admin changes; no laptop, Java server or database is needed to view this demo. Use example passenger details. For the real Java/PostgreSQL implementation, follow the local instructions below.

A local full-stack airline reservation demo built with Java 21 / Spring Boot 3, PostgreSQL and React 18 / TypeScript. Authentication, searchable flights, seat holds, 2D and 3D cabin selection, booking checkout and booking management are connected to the backend.

## Features

- Register/login with BCrypt passwords, 15-minute JWT access tokens, rotating hashed refresh tokens (7 days), logout and USER/ADMIN authorization.
- Flight search by origin, destination, UTC date, traveller count and cabin, with price/duration/departure sorting and pagination.
- 10 airports, two aircraft layouts (3–3 A320 and 2–4–2 A330), four cabins, and 744 seeded departures across 31 days from database initialization.
- Up to six travellers per booking; passenger details, seat assignment, baggage, meals, mock approval/decline, and an eight-character PNR.
- Accessible 2D map with arrow-key navigation, per-seat pricing/features, seat-state colors and warnings.
- Lazy-loaded `<Cabin3D />`: procedural instanced seat geometry, windows, cutaway side walls, floor, overhead bins, exit/galley/lavatory indicators, orbit overview and animated passenger-eye camera. Works with both aircraft layouts. Automatic 2D fallback when WebGL is unavailable or 3D rendering fails.
- Ten-minute server-side holds, expiry cleanup, SSE seat-state notifications and periodic reconciliation. Server-side prices and hold validation prevent trusting client totals.
- My Bookings, cancellation, mock refunds and downloadable PDF e-tickets.
- ADMIN tools for adding aircraft layouts, creating/withdrawing flights, changing fares, blocking seats/changing surcharges and viewing bookings.
- Flyway migrations, JPA entities, repositories, transactional services, DTO-only controllers, validation and a global error handler.

This is a development/demo project. Payments are simulated and tickets are not valid for travel. No airline inventory or payment provider is connected.

## Run locally

Install JDK 21, Node.js 22.13+ (or supported Node 24/26), and Docker Desktop / Docker Engine with Compose. Maven is downloaded by the included wrapper. Commands below use macOS/Linux shell syntax; use `mvnw.cmd` on Windows and set environment variables in PowerShell.

From the project root:

```sh
# Generate random local secrets (OpenSSL required).
./scripts/init-env.sh
# Alternatively: copy .env.example to .env and replace BOTH secret placeholders.
docker compose up -d --wait postgres

# Export configuration for Spring Boot; it does not automatically load .env.
set -a
. ./.env
set +a
cd backend
./mvnw spring-boot:run
```

In a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open [the app](http://localhost:5173). Search Mumbai (BOM) → Delhi (DEL) tomorrow, choose a flight, register, enter traveller details, select seats, then complete mock checkout. Switch between **2D map** and **3D cabin**; after selecting a seat, choose **Passenger view**.

The frontend proxies `/api` and `/actuator` to port 8080. For a different backend port, copy `frontend/.env.example` to `frontend/.env`, update `API_PROXY_TARGET`, and restart Vite.

### First administrator

Register your own account through the UI. Promote only that local account using your database console:

```sh
# Run from the project root after exporting .env as above.
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

In psql, substitute your account's email:

```sql
UPDATE app_user SET role = 'ADMIN' WHERE email = 'your-email@example.com';
\q
```

Sign out and sign in again to obtain a JWT with the ADMIN role. There are no hard-coded admin credentials and registration always creates a USER. Flight IDs are in the booking URL (`/book/25`) and API responses. Admin fares and withdrawal are intentionally restricted when active holds/bookings exist; booked flights cannot be silently repriced or withdrawn.

## API and health

- [Swagger UI](http://localhost:8080/swagger-ui.html)
- [OpenAPI JSON](http://localhost:8080/v3/api-docs)
- [Health](http://localhost:8080/actuator/health)
- [Database-backed readiness](http://localhost:8080/actuator/health/readiness)

Use `Authorization: Bearer <accessToken>` on authenticated API calls. A public seat map never exposes another traveller's hold ID or user ID. SSE sends invalidation events only; the client fetches the authenticated seat map after each event. Same-origin Vite proxying avoids broad CORS rules.

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/register`, `/login`, `/refresh`, `/logout`; `GET /api/users/me` |
| Search | `GET /api/airports`, `/fares`, `/extras`, `/flights/search`, `/flights/{id}` |
| Seats | `GET /api/flights/{id}/seatmap`, `/flights/{id}/events`; `POST /api/seats/hold`; `DELETE /api/seats/hold/{id}` |
| Booking | `POST /api/bookings`; `GET /api/bookings/me`; `POST /api/bookings/{id}/cancel`; `GET /api/bookings/{id}/ticket` |
| Admin | `GET/POST /api/admin/aircraft`; `POST /api/admin/flights`; `PATCH /api/admin/flights/{id}/price`; `POST /api/admin/flights/{id}/cancel`; `PATCH /api/admin/flights/{id}/seats/{number}`; `GET /api/admin/bookings` |

## Concurrency and session design

Seat inventory uses `@Version` optimistic locking. A database flight-row write lock coordinates holds, checkout, fare updates and administrative flight changes. This deliberately favors correctness over maximum per-flight throughput. Confirmed seat allocations have a partial unique index on `(flight_id, seat_number)` where active; cancellation makes the historical allocation inactive. All seats, passengers, payment and booking records commit together. Booking requests carry an idempotency key. Availability events are sent after commit, not before.

The server treats expired holds as unavailable to the old owner immediately; cleanup runs every 15 seconds. SSE reconnects after its two-minute lifetime, and the frontend also refreshes availability every 15 seconds. Events are process-local: multi-instance deployment would need a shared event broker. A failed optimistic update returns 409 and the frontend refreshes availability.

Access and refresh tokens are kept in frontend memory, not localStorage. Refresh tokens are rotated with a database lock and stored hashed server-side. Reloading the page signs out; sign back in to recover a still-active hold by selecting that seat. Logout revokes its refresh token; an already-issued access token expires within 15 minutes. Never commit `.env` or share JWT signing keys.

## Verification

Frontend:

```sh
cd frontend
npm ci
npm run lint
npm run format:check
npm test
npm run build
```

Backend PostgreSQL suite (use a dedicated disposable test database):

```sh
# Create airline_test in the running local development container once.
# Run after exporting .env from the project root.
docker compose exec postgres createdb -U "$POSTGRES_USER" airline_test
cd backend
DATABASE_URL=jdbc:postgresql://localhost:5432/airline_test RUN_DB_TESTS=true ./mvnw clean verify
```

Adjust the port if you changed `POSTGRES_PORT`. The seven real-database scenarios cover auth, refresh replay, authorization, booking idempotency, ownership privacy, PDF output, cancellation, simultaneous holds, simultaneous checkout, payment failure, expiry, search validation and admin operations. They create separate fixture flights and random accounts, so reruns do not require deleting existing data. `RUN_DB_TESTS=true` enables that suite; omitting it skips those tests. A separate Testcontainers migration test runs when Docker is available.

Playwright E2E (start the normal backend first; tests create local demo users/bookings):

```sh
cd frontend
npx playwright install chromium
npm run test:e2e
# Or use an already installed Chrome:
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

Playwright starts/reuses the Vite server. It covers the two-passenger registration-to-cancellation flow, 3D/passenger view, mock decline and recovery, ticket download, mobile search and unauthenticated booking navigation. `test-results/` contains failure traces and visual captures. See [VERIFICATION.md](VERIFICATION.md) for actual results and limitations.

## Project structure

```text
backend/src/main/java/com/airline/reservation/
  api/          Validated request/response DTOs and thin controllers
  config/       JWT/security configuration
  domain/       JPA entities
  repository/   Spring Data repositories
  service/      Auth, search, seats, booking, events, admin, PDF
backend/src/main/resources/db/migration/
frontend/src/
  api/          Fetch client with refresh-token retry
  components/   Flight cards, 2D map, lazy 3D cabin and fallback
  pages/        Search, auth, booking flow, bookings, admin
  store.ts      In-memory Zustand auth state
frontend/e2e/   Playwright journeys
scripts/       Local environment initialization
```

## Development limits and next hardening steps

- Procedural seats are the allowed model fallback; no GLB or Draco assets are used. The 3D bundle is lazy-loaded and seats are instanced with demand-driven rendering. The 60 FPS goal has not been benchmarked across target devices.
- This is one-way, direct-flight booking. Multi-city, connecting flights, refunds through real payment providers and real airline integrations are outside this demo.
- Seed dates are relative to first database initialization and do not regenerate every day. Create later departures through Admin when the seeded range expires.
- PDF tickets currently use a basic ASCII font; unsupported characters appear as `?`. Full multilingual typography is not implemented.
- Production deployment still needs HTTPS, rate limiting, email verification/account recovery, a production secret store, monitoring, and a reverse proxy for API/SSE. Vite's development proxy is not bundled into `dist`. Do not expose the demo unchanged as a production reservation service.
- Moderate npm advisories in the lint tooling are documented in verification; runtime dependency audit is separate.

Stop the frontend/backend with Ctrl+C. `docker compose stop` preserves the database. `docker compose down` preserves the named volume; `docker compose down -v` deletes it. Changing `.env` database credentials does not change an already-initialized PostgreSQL user's password.

## Amadeus provider search

The home page includes a separate Amadeus comparison panel. Configure `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, and `AMADEUS_ENVIRONMENT=test` in the root `.env`, export it and restart Spring Boot. Use `production` only with approved production credentials. Test results are limited/cached, not live offers. Secrets remain on the backend. OAuth tokens are cached in memory; outbound requests have timeouts. No credentials are included. Provider offers are NOT sent through the demo seat/booking flow. This integration searches adult fares only. Prices cover all requested adults. Live connectivity cannot be verified until valid credentials are supplied. API reference: https://developers.amadeus.com/

## Seat-planning assistant

In the Choose seats step, open **Help me choose**. Set a priority (sit together, window, aisle, extra legroom, distance from marked facilities, or price) and an optional total fare-and-seat budget. Up to three available arrangements show passenger assignments, total cost and reasons/trade-offs. Preview highlights suggested seats without holding them. Compare two seats for position, legroom, recline, power and current availability, then open either seat's 3D passenger view.

**Reserve this plan** calls `POST /api/seats/hold/group`, replacing only the current booking form's holds in a single database transaction. If one seat cannot be held, the previous assignments and holds remain unchanged. Booking validation still applies at checkout. The planner excludes exit rows when any traveller is under 16, uses deterministic seat-feature rules, and does not predict real cabin noise or comfort. Prices exclude baggage and meal extras.

## GitHub Pages deployment

The `.github/workflows/pages.yml` workflow installs frontend dependencies, runs unit tests, builds with `npm run build:pages`, and publishes `frontend/dist` using GitHub Actions. Repository Settings → Pages must use **GitHub Actions**. `PAGES_BASE_PATH` is set from the repository name. No API keys, database passwords or server secrets are needed for this static demo.

The Pages build uses hash routes, for example `/#/flights` after the repository prefix, so copied links and reloads work on a static host. It includes all compiled CSS and lazy-loaded 3D modules. `npm run build` and `npm run dev` continue to use the Spring Boot API; the separate `build:pages` command enables browser-local simulation.

Try it locally:

```sh
cd frontend
npm ci
npm run build:pages
npm run preview -- --mode pages
# Open the printed URL with /Airline-Reservation-Systemm/ appended.
```

Click **Enter demo** to explore as a traveller or admin, without entering real account credentials. Bookings/admin changes are saved only in the current browser's localStorage; sign-in is in memory and resets on reload. **Reset demo** clears the demo data after confirmation. Ten-minute holds and group-reservation rollback are simulated locally and are not shared between different visitors.

Run `npm run test:pages` after building to test the static deployment without the backend. Set `PAGES_DEMO_URL=https://malharsarwate.github.io/Airline-Reservation-Systemm/` to run the same browser journeys against the live site.
