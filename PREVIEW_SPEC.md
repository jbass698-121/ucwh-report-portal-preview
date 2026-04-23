# Preview Portal — Specification

**Owner:** Jason Bass
**Status:** Live (with 3 non-blocking deferrals — see Morning Handoff section)
**URL:** https://ucwh-report-portal-preview.netlify.app/
**Prod counterpart:** https://ucwh-report-portal.netlify.app/
**Repository path:** `report-portal-preview/` (top of Wash-Reports workspace)
**Version:** 1.0 | 2026-04-23

---

## Purpose

A production-shadow preview of the Report Portal redesign. Lives on a separate Netlify origin so design iteration can happen against real Supabase + real GitHub data without risking prod. Wears a persistent "PREVIEW" chip so there is never ambiguity about which site a screenshot came from.

Design tenet: **zero prod impact**. No prod files, edge functions, schema, or live behavior change because the preview exists. Hash-verified in `VERIFICATION.md` Section 1.

---

## What the preview does (and does not)

| Capability | Preview | Prod |
|---|---|---|
| Google OAuth sign-in | Yes (once redirect URL allowlisted — Deferral #3) | Yes |
| DEV_MODE fake session (`?dev=1`, on by default) | Yes | No |
| Live `cockpit_metrics` reads (RLS-gated) | Yes for signed-in users; fixture fallback in DEV_MODE | Yes |
| Live `daily_wash_counts` (anon) sparkbars | Yes | Yes |
| Live `task_runs` status pills + freshness dots | Yes | Yes |
| GitHub Contents API — real report filenames | Yes | Yes |
| `sign_link` edge function — signed-URL report access | Yes (non-DEV path); DEV short-circuits to raw URLs | Yes |
| `beacon` edge function — pageview telemetry | Yes, tagged `?source=preview` | Yes |
| Any Supabase writes | No — `PREVIEW_READONLY=true` guard | Yes (`portal_access_requests.insert`, `user_state.upsert`) |
| `X-Robots-Tag: noindex` | Yes | No |

---

## Architecture

### Bundle composition

```
index.html
├─ React 18 UMD + Babel standalone (runtime JSX transform)
├─ Supabase UMD
├─ js/config.js         (shared with prod — SUPABASE_URL, REPORT_FOLDERS, FOLDER_COHORTS, GITHUB_API)
├─ js/preview-auth.js   (preview-specific — replaces prod js/auth.js)
├─ js/preview-data.js   (preview-specific — Supabase reads with fixture fallback)
├─ js/preview-library.js (preview-specific — GitHub Contents API + signed URLs + freshness dot logic)
├─ js/preview-telemetry.js (preview-specific — pageview beacon with source=preview tag)
├─ js/auth.js           (retired stub — 20-line inert IIFE, not loaded)
├─ data.jsx             (fixture data — locations, reports, status groups, sidebar nav)
├─ components.jsx       (shared UI primitives — Icon, Delta, SparkBar, Sidebar, TopBar, Tabs, StatusDot)
├─ views.jsx            (Today, Pacing, Library views)
├─ app.jsx              (root + AuthGate + route switch + tweaks panel + edit-mode handshake)
└─ styles.css           (design system)
```

### What is shared with prod, what is forked

| File | Relationship |
|---|---|
| `index.html` | Forked — preview adds chips, loads preview-*.js files, wires PreviewAuth.init() |
| `js/config.js` | Shared structure, byte-identical to prod |
| `js/auth.js` | Forked — stubbed to inert in preview; prod is active |
| `js/preview-auth.js` | Preview-only |
| `js/preview-data.js` | Preview-only |
| `js/preview-library.js` | Preview-only |
| `js/preview-telemetry.js` | Preview-only |
| `data.jsx` / `components.jsx` / `views.jsx` / `app.jsx` / `styles.css` | Forked — redesign iteration surface |
| `netlify.toml` | Forked — preview adds `X-Robots-Tag: noindex`, CSP mirrors prod |

**Editing protocol:** All preview changes go in `report-portal-preview/`. Touching any file in `ucwh-report-portal/` requires explicit Jason sign-off — preview is NOT a staging environment for prod bytes; it is a design-iteration target. When the redesign is approved, a separate promotion step copies approved files into prod.

---

## Auth model

### DEV_MODE (default on)

- Triggered by bare URL or `?dev=1`
- `PreviewAuth.init()` does not touch Supabase
- `PreviewAuth.getSession()` returns a synthetic session with `user.email = "dev@preview.local"`
- `PreviewAuth.devUser(role)` returns a fake user with `role='admin'` (or `'viewer'` if `?role=viewer` is on the URL) and `folder_access = [all non-adminOnly REPORT_FOLDERS]`
- Visual indicator: blue `DEV · FAKE SESSION` chip below the orange `PREVIEW` chip, top-right of viewport
- Purpose: the preview must render fully without the Supabase redirect-URL allowlist. DEV_MODE is the escape hatch.

### Real-auth mode (`?dev=0`)

- Triggered by `?dev=0` on the URL, or (after Deferral #3 resolves) by removing DEV_MODE default
- Fires `supabase.auth.signInWithOAuth({provider: 'google', options: {redirectTo: window.location.origin + window.location.pathname}})`
- On return, reads `report_portal_users` row by `auth_uid` to get `{role, folder_access, display_name, avatar_url}`
- If no row exists → `NoAccessCard` renders (directs user to request access)
- Pre-resolution behavior: redirects to `cvmexkjdadiseccaavzr` project's `site_url` (the UCWH Incentive Calculator) — visible as "OAuth leak" until Deferral #3 lands.

### Deferral #3 resolution (morning handoff)

Jason adds `https://ucwh-report-portal-preview.netlify.app/**` to the Supabase redirect-URL allowlist:

- Dashboard → Project `cvmexkjdadiseccaavzr` → Authentication → URL Configuration → Redirect URLs → `+ Add URL` → paste the wildcard URL → Save.
- Estimated time: 60 seconds.
- After resolution: `?dev=0` renders a proper sign-in gate. Signing in with an email present in `report_portal_users` flips the header pill from "CACHED" to "LIVE" because `cockpit_metrics` RLS now passes.

---

## Data layer

### Supabase queries (preview-data.js → `PreviewData.fetchLive()`)

Runs three parallel `Promise.all` queries on `status === 'signed_in'`:

1. **`cockpit_metrics`** — last 3 days × all sites × all metrics. RLS policy requires the JWT email to exist in `report_portal_users`. Drives:
   - 4 TodayView metric tiles (variance_pct → "Delta" chip; multiplied by 100 for display-percent)
   - PacingView (full metric table)
   - ATTENTION list (rows where `status='red'`, sorted by `|variance_pct|` desc, top 4)

2. **`daily_wash_counts`** — last 8 days. RLS `qual=true` (public). Drives per-site 8-day sparkbars.

3. **`task_runs`** — last 35 days. RLS `qual=true` (public). Drives:
   - 6 status pill groups keyed by `task_number` per CLAUDE.md task inventory (Data Pulls, Daily, Weekly, Monday, Monthly, Utility)
   - Per-folder freshness dots (latest successful run per taskId → hours-since)

### Site code translation

Prototype's fixture used `TX150` / `TX100` / `UT426` — none of `TX150`/`TX100` exist in Supabase. `preview-data.js` uses real codes:

| Code | Display label |
|---|---|
| `TX160` | Houston, TX |
| `TX190` | Spring, TX |
| `UT426` | Saratoga Springs, UT |

Fixture data in `data.jsx` retains the old codes for DEV_MODE fallback when RLS blocks `cockpit_metrics`.

### Fixture fallback

Every live prop has a fixture fallback. If `fetchLive()` rejects entirely → full fixture mode. If individual fields are null → per-field fixture. Never a blank page.

---

## Library view

### GitHub Contents API integration

- Endpoint: `GET https://api.github.com/repos/jbass698-121/ucwh-morning-briefings/contents/{folder.path}`
- No authentication — uses the public 60/hr/IP anonymous rate limit (acceptable given session caching and small user base)
- Filter: `.html` files only, excluding `index.html`
- Sort: newest-first by filename (YYYY-MM-DD prefix convention)
- Cache: 5-minute in-memory TTL per folder, per tab

### Signed URLs

- `sign_link` edge function mints a JWT containing `{email, report_url, exp}` scoped to one URL
- Non-DEV path: `Bearer {access_token}` POST with 1500ms timeout, falls back to raw PAGES_BASE URL on failure
- DEV path: short-circuits to raw URL (no session to sign with) — loses access-control but is visible in preview chips as DEV mode

### Folder taxonomy

- Source: `REPORT_FOLDERS` in `js/config.js` (22 folders as of 2026-04-23)
- Cohorts: Operations · Strategy · Forecasting · Dashboards · Intelligence · Admin (order from `FOLDER_COHORTS`)
- Role filtering: admin sees all 22; viewer sees 20 (Admin cohort filtered via `adminOnly: true` on folders)

### Freshness dots

| Cadence | Threshold (hrs since last success) | Color state |
|---|---|---|
| Daily | 36 | green if < 36, red if ≥ 36 |
| Weekly | 192 | green if < 192, yellow if 192–336, red if > 336 |
| Monthly | 768 | green if < 768 |
| Live | 24 | green if < 24 |
| On-Demand / Admin | — | gray (no expiry applicable) |
| No `taskId` mapping | — | gray |

---

## Telemetry (preview-telemetry.js)

### Design constraint: prod beacon schema is frozen

The prod `beacon` edge function's payload accepts `{report_url, email, time_on_page_s, referrer}` — no `source` field. Adding one would redeploy the edge function and therefore touch prod behavior. **Not acceptable.** Instead, `source=preview` is encoded in `report_url` as a query string:

```
report_url = "https://ucwh-report-portal-preview.netlify.app/?source=preview"
```

Analysts filter with:

```sql
WHERE report_url LIKE '%source=preview%'
```

### Emission details

- Fires once per pageview, after `status === 'signed_in'` resolves
- Transport: `navigator.sendBeacon` with `Blob(text/plain)` body (skips CORS preflight, matches prod pattern)
- Fallback: `fetch(keepalive: true)`
- Module-local `fired` flag prevents double-fire within a page load
- Email: real session email if present; else `dev-preview@ucwh.ai` in DEV_MODE; `dev@preview.local` when `PreviewAuth.devUser()` is source

---

## Security posture

### PREVIEW_READONLY

- Constant in `preview-library.js`: `const PREVIEW_READONLY = true`
- Exported on `window.PreviewLibrary.PREVIEW_READONLY`
- `assertReadonly(op)` guard: returns `false` + logs `[PreviewReadonly] Blocked write op: {op}` when called
- Currently there are **zero** write operations in the preview bundle (grep-verified — see `VERIFICATION.md` Section 7a). The constant is a forward guard: any future `.insert/.update/.upsert/.delete/.rpc()` path must pass through `assertReadonly` to ship.

### CSP + headers (netlify.toml)

- Identical CSP to prod (`frame-ancestors 'self' https://jbass698-121.github.io`)
- Adds `X-Robots-Tag: noindex, nofollow` (preview is unlisted)
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS (Netlify default)

### Dead-code sanitization

Prod `js/auth.js` was copied in Phase 1 and superseded in Phase 4 by `js/preview-auth.js`. It contained a `portal_access_requests.insert(...)` call that was never loaded (`index.html` references `preview-auth.js` not `auth.js`), but was still grep-visible. OneDrive mount refused `rm`, so the file was overwritten with an inert 20-line IIFE stub that exports nothing.

---

## Deployment

### Netlify

- Site name: `ucwh-report-portal-preview`
- Site ID: `5f16f5ea-c595-47ca-8d66-db12b14aa602`
- Plan: `nf_team_dev` (free; adequate for a preview)
- Deploy method today: zip upload via Netlify API using the stored `.netlify_token`
- Deploy method post-handoff: Git-based Netlify deploys once Deferrals #1 + #2 resolve (GitHub repo exists + local git init works)

### Prod-untouched invariants

Every deploy must preserve:
- `ucwh-report-portal/` file bytes (SHA256-verified against `_Backups/portal-pre-redesign-2026-04-22/`)
- Supabase edge function versions (`sign_link` v4, `beacon` v3, `access_request_notify` v1)
- Supabase schema (33 public tables, RLS policies frozen)

---

## Morning handoff (Jason's ask list)

### Deferrals to resolve at leisure

| # | Item | Where | Estimated time |
|---|---|---|---|
| 1 | GitHub preview repo creation | Need new fine-grained PAT with "Administration: Read and write" OR classic PAT with `repo` scope. Then `gh repo create jbass698-121/ucwh-report-portal-preview --public --source=.` from the preview folder. | 3 min |
| 2 | Local `git init` in OneDrive mount | Retry from Windows desktop (current mount refused config write). Then `git remote add origin ... && git push -u origin main`. | 2 min |
| 3 | Supabase Auth redirect URL allowlist | Supabase dashboard → Project `cvmexkjdadiseccaavzr` → Authentication → URL Configuration → Redirect URLs → Add: `https://ucwh-report-portal-preview.netlify.app/**` | 1 min |

**None block the preview being live or functional.** Resolution only unlocks: git-backed Netlify deploys (#1+#2), non-DEV sign-in flow (#3).

### Verification Jason should run after Deferral #3

1. Open https://ucwh-report-portal-preview.netlify.app/?dev=0
2. Click "Sign in with Google" → complete Google flow with ucwmoltbot@gmail.com (or any email in `report_portal_users`)
3. Header pill should flip from "CACHED" to "LIVE"
4. TodayView metric tiles should show real delta numbers (not fixture values)
5. Preview chip still visible; Dev chip should now be HIDDEN (post-sign-in, real session takes over)

---

## Out-of-scope for this build (future phases)

- Per-route pageview tracking (SPA route-level beacons beyond initial pageview)
- `user_state` preference writes (theme, pinned folders)
- Edit-mode deploy-to-disk handshake (the `/*EDITMODE-BEGIN*/` marker is wired but the host-write loop is prod-only)
- Commenting / annotations on reports
- Automated Lighthouse checks on preview deploys

Each of these is additive and can be wired without touching prod.

---

## Contact

- Owner: Jason Bass (ucwmoltbot@gmail.com)
- Build author: Claude Opus 4.7 overnight autonomous build, 2026-04-22 → 2026-04-23
- Build transcript: Phases 0 → 8 logged in `STATUS.md`
- Evidence archive: `VERIFICATION.md`
