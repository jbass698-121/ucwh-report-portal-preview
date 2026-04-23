# report-portal-preview -- Folder Index
**Updated:** 2026-04-23 | **Files:** 14

| File | Description |
|------|-------------|
| .gitignore | Git ignore rules |
| .netlify_token | Netlify personal access token for portal deployment |
| _INDEX.md | This folder index |
| app.jsx | Root React component with AuthGate, routing, tweaks panel, live-data prop wiring, telemetry fire-once effect |
| components.jsx | Shared UI primitives — Icon, Delta, SparkBar, Sidebar, TopBar, Tabs, StatusDot (4-state) |
| data.jsx | Fixture data — locations, reports, status groups, sidebar nav (used for DEV_MODE + graceful degradation) |
| DRAFT_SLACK_MESSAGE.md | Draft announcement message to Jason / team (not posted — review-only) |
| index.html | HTML shell — loads React/Babel/Supabase UMDs, 5 preview-*.js bundles, jsx files, PREVIEW + DEV chips |
| netlify.toml | Netlify build/redirect config with CSP, noindex, prod-mirrored security headers |
| PREVIEW_README.md | Quick-start README (written Phase 1, covers local dev) |
| PREVIEW_SPEC.md | Canonical spec — architecture, auth model, data layer, library, telemetry, security, handoff |
| STATUS.md | Build status log — Phase 0 → 8 entries with deploy IDs and evidence |
| styles.css | Full design-system stylesheet — tokens, layout, cards, pacing grid, library, status-dot 4-state |
| VERIFICATION.md | Full AI verification matrix — prod-untouched diff, auth, routes, data, library, telemetry, write-guard |
| views.jsx | Today, Pacing, Library (folder + files views) — live-data prop consumption, fixture fallbacks |

## js/

| File | Description |
|------|-------------|
| auth.js | Retired stub (20-line inert IIFE) — superseded by preview-auth.js in Phase 4; not loaded by index.html |
| config.js | Shared config (byte-identical to prod) — SUPABASE_URL, REPORT_FOLDERS, FOLDER_COHORTS, GITHUB_API |
| preview-auth.js | Preview auth adapter — DEV_MODE short-circuit, Google OAuth wrapper, session management |
| preview-data.js | Parallel Supabase reads (cockpit_metrics, daily_wash_counts, task_runs 35d) with fixture fallback |
| preview-library.js | GitHub Contents API + signed-URL mint + freshness dot logic + PREVIEW_READONLY guard |
| preview-telemetry.js | Pageview beacon with `source=preview` tag (single fire per session, prod beacon schema untouched) |

> **MAINTENANCE:** Update this index when adding or removing files from report-portal-preview/.
