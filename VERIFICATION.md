# Preview Portal — Full AI Verification Matrix

**Last run:** 2026-04-23T08:20Z
**Build phase covered:** Phases 0 → 7 (end-to-end verification of the preview site prior to morning handoff)
**Verification posture:** Every claim below is paired with the evidence that produced it — a SHA256 digest, a curl header, a SQL row, a console log, a screenshot, or a grep count. No assertions are included without a corroborating check.

---

## 1. Prod-untouched diff (zero prod impact)

**Claim:** Nothing in the prod portal — code, config, or live behavior — was altered during the preview build.

### 1a. Static file diff vs backup

- Source of truth: `_Backups/portal-pre-redesign-2026-04-22/report-portal/` (Phase A snapshot)
- Compared set: all 36 runtime files (`index.html`, `app.jsx`, `components.jsx`, `data.jsx`, `views.jsx`, `folders.js`, `styles.css`, `js/auth.js`, `js/config.js`, plus css/img/js subtrees and the 27 component fragments)
- Method: `sha256sum` on every file in `ucwh-report-portal/` vs the same relative path in the backup directory; diff the two digest lists.
- Result: **all 36 files byte-identical** — every digest matches, diff list is empty. Prod HTML, prod JSX, prod auth.js, prod config.js, and prod styles.css are untouched.

### 1b. Edge function version check

- Probed via Supabase MCP `list_edge_functions` (live project, not backup)
- Results vs backup:

| Function | Live version | Backup version | Status |
|---|---|---|---|
| `sign_link` | v4 | v4 | unchanged |
| `beacon` | v3 | v3 | unchanged |
| `access_request_notify` | v1 | v1 | unchanged |

None of the three have been redeployed. No new functions have been added.

### 1c. Supabase schema drift

- Probed via `list_tables(schemas=["public"])` — 33 tables present, matches backup schema dump exactly. No columns added/removed on any portal-adjacent table (`report_portal_users`, `portal_access_requests`, `report_page_views`, `cockpit_metrics`, `daily_wash_counts`, `task_runs`, `user_state`, `lookup_sites`, `fact_daily_metrics`).
- RLS policies on the above tables unchanged from backup snapshot.

### 1d. Prod live behavior

- `curl -I https://ucwh-report-portal.netlify.app/` → HTTP 200, CSP unchanged, `X-Robots-Tag` absent (prod is indexable), deploy timestamp in Netlify header predates the preview build window.
- No prod-site deploys have fired in this session (verified via Netlify deploys API — last prod deploy is from 2026-04-17, well before Phase 0 kickoff 2026-04-22 16:20Z).

**Verdict:** Prod is bit-for-bit identical to the pre-build snapshot on disk, in Supabase, and on the wire. Zero prod impact.

---

## 2. Auth / DEV_MODE matrix

**Claim:** The preview renders and is verifiable without the Supabase redirect-URL allowlist being in place yet, via a DEV_MODE short-circuit. The Google flow is stubbed (reachable but not needed) until Deferral #3 resolves.

| URL | Expected outcome | Observed | Evidence |
|---|---|---|---|
| `?dev=1` (or bare URL after hotfix) | Fake admin session injected, App renders fully, preview + dev chips visible | ✓ | Chrome screenshot; `PreviewAuth.isDevMode()` returned `true`; `devUser()` returned `{role: 'admin', email: 'dev@preview.local', folder_access: [22 folders]}` |
| `?dev=1&role=viewer` | Fake viewer session injected, App renders fully, Library shows 20 folders (Admin cohort filtered out) | ✓ | Library tab badge flipped from 22 → 20; Admin cohort section disappeared from folder grid |
| `?dev=0` | Real Google OAuth flow fires (currently: redirects to site_url = incentive calculator until Deferral #3 resolves) | ✓ as designed | Tested: calculator loads; documented as expected pre-resolution behavior. Post-resolution this URL will render the sign-in gate. |
| Bare URL (naked preview origin) | Hotfix flipped default polarity → DEV_MODE on by default → fake admin session renders | ✓ | Phase 6 hotfix (deploy `69ea03068b12857731f61e89`) verified in Chrome; serves dashboard, not OAuth redirect |

**Admin-guard check:** `PreviewAuth.isAdmin(user)` returns `true` only when `user.role === 'admin'`. Tested: admin=true, viewer=false. Used by LibraryView to filter adminOnly folders; behavior verified in 2a below.

---

## 3. Route matrix (chip stickiness across navigation)

**Claim:** The orange PREVIEW chip and blue DEV chip survive every navigation path in the app — they render before React mounts and live outside the React root.

| Route | Preview chip | Dev chip | Notes |
|---|---|---|---|
| Today (initial load) | ✓ | ✓ | Both chips in top-right, stacked |
| Pacing | ✓ | ✓ | Clicked Pacing tab; chips unchanged |
| Library (folders view) | ✓ | ✓ | Clicked Library tab; 22 cards rendered; chips unchanged |
| Library (files view, after drill-down) | ✓ | ✓ | Clicked Morning Briefings → 50 files listed; back arrow still shows chips |
| `?dev=1&role=viewer` Library (folders view) | ✓ | ✓ | Viewer context; 20 cards; chips unchanged |
| `?dev=0` OAuth redirect destination (incentive calculator) | N/A | N/A | Navigation leaves preview origin; chips live on preview origin only — expected |

Evidence: successive Chrome `screenshot` calls across the 6 states above. Both chips are `position: fixed` in `index.html` and are never re-rendered by React.

---

## 4. Data matrix (live vs fixture fallback)

**Claim:** Preview renders real data where RLS permits and falls back to fixtures where it doesn't. Every field has a fallback; zero undefined render paths.

### 4a. Supabase query results in DEV_MODE (anon key, no signed session)

| Source table | Query | Result | Consumed by | Mode |
|---|---|---|---|---|
| `cockpit_metrics` | last 3 days, all sites/metrics | `[]` (RLS blocks anon) | 4 TodayView metric tiles, PacingView, ATTENTION list | → fixture fallback |
| `daily_wash_counts` | last 8 days | rows returned | per-site sparkbars | → live |
| `task_runs` | last 35 days | rows returned | 6 status pills + freshness dots | → live |

Evidence: `PreviewData.fetchLive()` probed in Chrome console; returned `{locations: null, attention: null, statusGroups: [6 entries], latestByTaskId: {19 entries}, asOf: "2026-04-23"}`. `locations=null` → App prop-fallback kicked in, `window.LOCATIONS` fixture used (TX150/TX100/UT426 placeholder).

### 4b. Post-handoff preview (after Deferral #3 resolved)

Once Jason signs in with his Google account (which is in `report_portal_users`):
- `cockpit_metrics` RLS passes → 4 tiles + PacingView + ATTENTION switch to live
- Header pill flips from "CACHED · 2026-04-23" to "LIVE · 2026-04-23"
- Sparkbars + status pills stay live (they were already)

This is the working-as-intended security model, not a defect. Document stub in `PREVIEW_SPEC.md` (Phase 9) covers the flip.

### 4c. Graceful degradation paths

| Failure mode | Behavior |
|---|---|
| `PreviewData.fetchLive()` rejects entirely | Returns `null`; App falls back to full fixture globals; header shows "CACHED" label |
| Individual field null (partial failure) | That field uses fixture; other fields stay live |
| Supabase UMD fails to load | `PreviewData.fetchLive()` detects missing `window.supabase`, returns `null`; App renders fixtures |
| GitHub Contents API 403/429 | `fetchFolderContents()` returns `[]`; LibraryView shows "No files" empty state rather than crashing |
| `sign_link` timeout (1500ms race) | Falls back to raw PAGES_BASE URL; report still opens |

None of these cascade into a blank page or a red-screen error boundary.

---

## 5. Library matrix (GitHub Contents API + folder taxonomy)

**Claim:** The Library view correctly enumerates REPORT_FOLDERS, applies role-based filtering, fetches real report filenames from the GitHub Contents API, and respects freshness thresholds.

### 5a. Folder enumeration

| Role | Cohort counts | Total | Verified |
|---|---|---|---|
| admin | Operations·6, Strategy·6, Forecasting·2, Dashboards·3, Intelligence·3, Admin·2 | 22 | ✓ Chrome screenshot |
| viewer | Operations·6, Strategy·6, Forecasting·2, Dashboards·3, Intelligence·3 | 20 | ✓ Admin cohort section entirely hidden for viewer |

Viewer-role filtering uses AND-logic: `role=viewer` AND folder is in `user.folder_access` AND folder is not `adminOnly`. Verified by calling `PreviewLibrary.getVisibleFolders(PreviewAuth.devUser("viewer"))` in Chrome console — returned 20-entry array, no Admin-cohort folders present.

### 5b. GitHub Contents API drill-down

- Target folder: Morning Briefings (`morning-briefings` path in `ucwh-morning-briefings` repo)
- API call: `GET https://api.github.com/repos/jbass698-121/ucwh-morning-briefings/contents/morning-briefings`
- Response: **50 HTML files** returned, filtered from `.html` extension (excluding `index.html`), sorted newest-first
- Grouping in files view: April 2026 (22 reports) + March 2026 (28 reports) — month headers visible in Chrome

### 5c. Freshness dots

`computeFolderFreshness(folder, latestByTaskId)` computes hours-since-latest-success per folder and buckets by cadence:

| Cadence | Threshold | Sample observed | Dot color |
|---|---|---|---|
| Daily (Morning Briefing, taskId=4) | 36h | 24h ago | green (ok) |
| Weekly (Weekly Ops, taskId=7) | 192h | 4d ago | green (ok) |
| Daily (Industry Briefing, taskId=21) | 36h | 23h ago | green (ok) |
| None (Expense Reports, taskId=null) | — | (no label) | gray |

All four color states (`ok` / `warn` / `neg` / `gray`) exercised by live data.

### 5d. Signed-URL behavior in DEV_MODE

- `PreviewLibrary.getSignedUrl(rawUrl)` short-circuits when `PreviewAuth.isDevMode()` returns `true`
- Clicking a report opens the raw GitHub Pages URL unchanged (no `?v=...` JWT appended)
- Verified: clicked Morning Briefing 2026-04-23 → new tab opens `https://jbass698-121.github.io/ucwh-morning-briefings/morning-briefings/MORNING_BRIEFING_2026-04-23.html` (no token)
- Post-Deferral-#3 behavior: non-DEV path awaits session → invokes `sign_link` with `Bearer {access_token}` → 1500ms timeout → falls back to raw URL on failure. Same call signature as prod. Not exercised tonight (no real session available).

### 5e. Cache behavior

- `fetchFolderContents` is memoized in-module with a 5-minute TTL
- Verified: clicked Morning Briefings → network tab shows 1 API call → back arrow → re-clicked Morning Briefings → network tab shows **0** additional calls (cache hit)

---

## 6. Telemetry (beacon + source=preview tag)

**Claim:** Every preview pageview emits exactly one beacon row tagged `source=preview`, using the prod beacon edge function with zero schema changes.

### 6a. Wire-level

- Chrome network tab: page load fires exactly **one** `POST /functions/v1/beacon`
- Status: `HTTP 202 Accepted`
- Request body (decoded from `text/plain` Blob):
  ```json
  { "report_url": "https://ucwh-report-portal-preview.netlify.app/?source=preview",
    "referrer": "",
    "time_on_page_s": 0,
    "email": "dev@preview.local" }
  ```
- Transport: `navigator.sendBeacon` with `Blob(text/plain)` — skips CORS preflight (matches prod snippet in `Automation/Scheduling/lib/beacon-snippet.html` line 24)

### 6b. Database-level

- Direct SQL via Supabase MCP `execute_sql`:
  ```sql
  SELECT id, report_url, identity_source, email, time_on_page_s
  FROM report_page_views
  WHERE report_url LIKE 'https://ucwh-report-portal-preview.netlify.app/%'
  ORDER BY id DESC LIMIT 5;
  ```
- Result: 3 rows — `id=[76,77,78]`, all with
  `report_url='https://ucwh-report-portal-preview.netlify.app/?source=preview'`,
  `identity_source='portal_session'`, `email='dev@preview.local'`, `time_on_page_s=0`
- Analyst filter works: `WHERE report_url LIKE '%source=preview%'` returns exactly the preview rows, excludes prod rows.

### 6c. Module-local idempotence

- `fired` flag in `preview-telemetry.js` IIFE closure prevents double-fire within the same page load
- Verified: calling `PreviewTelemetry.firePortalPageview(user)` a second time in Chrome console produced no new network call and returned immediately.

---

## 7. PREVIEW_READONLY posture (write-guard)

**Claim:** The preview bundle makes zero Supabase write calls, and any future write path must pass the `assertReadonly` guard to land in the bundle.

### 7a. Grep audit

Target: any Supabase `.insert(` / `.update(` / `.upsert(` / `.delete(` / `.rpc(` call in the preview bundle.

Files scanned: `index.html`, `app.jsx`, `components.jsx`, `data.jsx`, `views.jsx`, `js/config.js`, `js/auth.js` (stub), `js/preview-auth.js`, `js/preview-data.js`, `js/preview-library.js`, `js/preview-telemetry.js`.

Result: **0 hits**. The only candidate was a `portal_access_requests.insert(...)` call in the prod `js/auth.js` that Phase 1 copied in — that file is now an inert stub (see 7c below).

### 7b. Runtime guard confirmation

- Chrome console: `PreviewLibrary.PREVIEW_READONLY` → `true`
- `PreviewLibrary.assertReadonly("test-write-op")` → returns `false` and logs `[PreviewReadonly] Blocked write op: test-write-op`
- Any future code path that attempts a Supabase write must gate on `if (!assertReadonly(op)) return;` to ship — otherwise it's a code-review red flag.

### 7c. Dead-code sanitization

- Prod `js/auth.js` was copied into the preview in Phase 1 but superseded by `js/preview-auth.js` in Phase 4
- OneDrive mount refuses `rm`; stubbed out instead with an inert `(function () { })()` IIFE
- The stub is 20 lines, exports nothing, is not loaded by `index.html`, and explicitly documents why it's there
- Byte-count of the stub: 868 bytes (vs original 11,279 bytes — ~92% reduction)

---

## 8. Console cleanliness

- Chrome DevTools console across Today / Pacing / Library (folders) / Library (files) routes
- Zero errors, zero unexpected warnings
- Only noise: Babel's expected "You are using the in-browser Babel transformer" warning, which is normal for `type="text/babel"` jsx bundles. This matches prod behavior (prod has the same warning).
- No CSP violations, no mixed-content warnings, no failed resource loads.

---

## 9. Deferrals (unchanged — all non-blocking)

| # | Item | Blocking? | Needed for |
|---|---|---|---|
| 1 | GitHub preview repo creation | No | Git-backed deploy pipeline (currently: direct Netlify zip deploys work fine) |
| 2 | Local `git init` in OneDrive mount | No | Same as #1; unblock from Windows desktop |
| 3 | Supabase Auth redirect-URL allowlist (`https://ucwh-report-portal-preview.netlify.app/**`) | No | Non-DEV sign-in flow; `cockpit_metrics` live data (RLS-gated); flipping header from "CACHED" to "LIVE" |

All three are morning-handoff asks — see `STATUS.md` Phase 2 and Phase 3 entries for exact resolution steps.

---

## 10. Summary

Every exit criterion across Phases 0–7 is checked against evidence in this document. The preview is live at `https://ucwh-report-portal-preview.netlify.app/`, renders with fake or real user sessions, pulls live data from GitHub + Supabase where RLS permits, emits self-tagged telemetry, and has a write-guard posture with zero current writes. Prod is untouched at every level (file bytes, edge function versions, schema, live wire behavior).

Morning handoff: Jason resolves the three deferrals at his leisure (estimated 5 minutes total — one Supabase dashboard change, one PAT re-issue, one git init on desktop), then the preview is fully production-shadow.
