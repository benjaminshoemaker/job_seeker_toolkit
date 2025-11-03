Agent guidelines for this repo

Scope
- This document guides coding agents and contributors working in this repository.
- Follow these rules for any files you modify or add.

Tech overview
- Frontend: Vite + React 18 (TypeScript). Entry: `src/main.tsx`.
- Backend: Minimal Node HTTP server in `server/server.js` that serves static `build/` and `/api` routes.
- Tests: Vitest with jsdom for frontend and node env for backend. Config in `vitest.config.ts` (uses single-threaded forks to avoid worker issues in sandboxes).

Analytics (PostHog)
- Separation by environment is required. Use separate Dev and Prod PostHog projects and keys.
- Client init lives in `src/lib/analytics.ts`. Import `initAnalytics()` in `src/main.tsx` only.
- When calling the generation API from the client, include the distinct id header if available: `x-ph-distinct-id` (see `src/components/CoverLetterGenerator.tsx`).
- Server‑side event capture and counters are in `server/analytics.js`:
  - `phCapture({ event, properties, distinct_id })` — sends events to PostHog ingestion.
  - `phCountCoverLetters()` — HogQL query with simple 60s in-memory cache.
  - Add new counters or events here rather than in `server/server.js`.
- The stats endpoint uses `buildStatsResponse()` in `server/server.js`. Prefer extending this or adding new small builders and routes if you need more counters.

Environment & secrets
- Never commit real secrets. Use `.env.example` as the template. Frontend vars are prefixed with `VITE_`.
- Required analytics env (see `.env.example`):
  - Dev: `VITE_POSTHOG_DEV_KEY`, `POSTHOG_DEV_PROJECT_KEY`, `POSTHOG_DEV_PROJECT_ID`, `POSTHOG_DEV_PERSONAL_API_KEY`.
  - Prod: `VITE_POSTHOG_PROD_KEY`, `POSTHOG_PROD_PROJECT_KEY`, `POSTHOG_PROD_PROJECT_ID`, `POSTHOG_PROD_PERSONAL_API_KEY`.
  - Optional region hosts: `VITE_POSTHOG_HOST`, `POSTHOG_INGESTION_HOST`, `POSTHOG_API_HOST`.

Testing rules
- Do not start long-running servers in tests. `server/server.js` now guards against starting the listener under Vitest, but prefer testing helpers (`server/analytics.js`) or exported builder functions (e.g., `buildStatsResponse`).
- Frontend tests should mock network (`global.fetch`) and analytics (`src/lib/analytics`).
- For backend analytics tests, mock `global.fetch` and reset the analytics cache via `__resetStatsCache()`.
- Prompt updates must keep `server/prompt.test.ts` green; it asserts the manual JD metadata fallback messaging remains accurate and that the resume-evidence failure path stays removed.
- Run tests with `npm run test:run`. Analytics-focused tests: `npm run test:analytics`. Coverage: `npm run test:coverage` then open `coverage/index.html`.

Coding style & constraints
- Keep changes minimal and focused. Avoid broad refactors unless requested.
- Match existing code style (no added copyright headers, minimal inline comments).
- Prefer small, testable helpers. If adding new analytics events, centralize them in `server/analytics.js` and expose minimal endpoints.

Common pitfalls
- EADDRINUSE during tests: ensure no external server is running; tests should not start the server.
- CORS in production: set `ALLOWED_ORIGIN` correctly; `/api` will 403 otherwise.
- PostHog domains: Web Analytics Domains must be exact origins (no wildcards); add dev and prod origins separately.
- Cover letter prompt should only fail when company or role title cannot be inferred. The error shown to users must instruct them to add `Company: [Company Name]` and `Role: [Role Title]` at the top of the job description; keep client copy in sync with `server/server.js` and related tests.
