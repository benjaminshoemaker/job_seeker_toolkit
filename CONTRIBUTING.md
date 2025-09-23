# Contributing to Job Seeker Toolkit

Thanks for helping improve this open-source toolkit. This project focuses on practical, no-paywall tools that make job seeking simpler.

## Ways to Contribute
- Report bugs: https://github.com/benjaminshoemaker/job_seeker_toolkit/issues/new?template=bug_report.md
- Request features: https://github.com/benjaminshoemaker/job_seeker_toolkit/issues/new?template=feature_request.md
- Ask questions / discuss ideas: https://github.com/benjaminshoemaker/job_seeker_toolkit/discussions
- Open a pull request: see the PR template that appears when you open one

## Development Setup
- Requirements: Node >= 18, npm
- Install deps: `npm i`
- Local dev (two terminals):
  - A) API/server: `node server/server.js`
  - B) Vite client: `npm run dev`
- Prod build: `npm run build` then serve with `node server/server.js`
- Env for Cover Letter tool (optional unless working on it): copy `.env.example` to `.env` and set `OPENAI_API_KEY`, `OPENAI_MODEL`, `PORT`.

## Testing
- Run tests in watch mode: `npm test`
- Run once: `npm run test:run`
- Type check: `npm run typecheck`

## Code Guidelines
- Keep UX simple, fast, and accessible (mobile-friendly, proper labels, focus states, contrast).
- Reuse existing UI primitives in `src/components/ui/*` and follow Tailwind conventions used in the repo.
- Keep changes scoped and incremental; prefer small PRs.
- TypeScript preferred for new files; avoid one-letter variable names; keep naming consistent.
- Don’t introduce tracking, paywalls, or heavy dependencies without strong justification.

## Pull Requests
- Use the PR template checklist (auto-applies on open).
- Link related issues with `Fixes #123` when applicable.
- Include screenshots/GIFs for UI changes.
- Note any breaking changes and migration steps.
- Ensure tests/type checks pass before requesting review.

## Issue Templates
- Bug reports and feature requests use templates in `.github/ISSUE_TEMPLATE/`.
- If you’re unsure whether to open an issue or a discussion, start with Discussions and we’ll help scope it.

## Project Areas (for labeling/scope)
- Resume / portfolio
- Job discovery / search
- Outreach / networking
- Applications / tracking
- Interviews / prep
- Offers / negotiation

Appreciate your contributions! If you’re looking for a place to start, check for `good first issue` or ask in Discussions.

