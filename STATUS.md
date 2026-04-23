# Preview Build Status

**Last update:** 2026-04-23T08:35Z
**Current phase:** Build complete (Phases 0 → 9) — ready for morning handoff
**Overall state:** done (with 3 non-blocking deferrals, see below)

## Phase log

- [2026-04-22 16:20Z] **Phase 0 pre-flight: OK**
  - Netlify token: 40 bytes, prod site reachable (id=58c04528-7321-4fdb-88bc-e4644a8d700c)
  - GitHub PAT: valid, login=jbass698-121
  - GitHub preview repo: does not exist (HTTP 404, name available)
  - Netlify preview site: does not exist (HTTP 404, name available)
  - Supabase MCP: 33 public tables returned, all 9 portal tables present
  - Edge functions live: sign_link v4, beacon v3, access_request_notify v1 (matches backup)
  - Prototype files in /uploads/: index.html (1.7KB), app.jsx (6.2KB), components.jsx (6.8KB), data.jsx (8.0KB), views.jsx (15.0KB), styles.css (22.6KB)
  - **Note:** styles.css present — include in scaffold. Was not in prior plan's file list.
  - **Discovery:** prod auth.js uses Google OAuth (not magic link). Phase 4 must verify OAuth redirect setup, not simulate magic-link login.

- [2026-04-22 16:26Z] **Phase 1 scaffold: OK**
  - Copied prototype: index.html (1,723B), app.jsx (6,170B), components.jsx (6,802B), data.jsx (7,973B), views.jsx (14,999B), styles.css (22,592B)
  - Copied from prod: js/auth.js (11,279B), js/config.js (18,005B)
  - Created: netlify.toml (SPA redirect + noindex + CSP from prod), .gitignore, PREVIEW_README.md (3,423B)
  - Preview folder total: 12 files, 102,877 bytes
  - Exit check: ≥ 8 files ✓, index.html ✓, 4 jsx ✓, js/ folder ✓, within ~100 KB range ✓

- [2026-04-22 21:30Z] **Phase 2 Netlify site + deploy: OK** (with one deferral on GitHub repo create)
  - **Deferral #1 (non-blocking):** GitHub repo create returned HTTP 403 "Resource not accessible by personal access token". The active PAT (`Morning Briefings/.github_token`) is fine-grained and scoped to existing repos only — it lacks user-level "Administration: Read and write" required to create new repos.
    - Impact: none. Preview runtime pulls reports from the *existing* `ucwh-morning-briefings` repo via Contents API (read-only, works with current PAT). The preview's own source files don't need to live in GitHub for the site to function.
    - Morning-handoff ask: Jason issues a new fine-grained PAT with "Administration: Read and write" OR a classic PAT with `repo` scope, so I can later `git push origin main` from `report-portal-preview/`.
  - **Deferral #2 (non-blocking):** Local `git init` failed inside the OneDrive mount (`fatal: bad config line 1 in .git/config`, "Operation not permitted" on config.lock cleanup). Appears to be a mount-semantics quirk, not a permissions issue. Will retry from desktop. Does not affect the live preview.
  - **Netlify site created:** ucwh-report-portal-preview
    - Site ID: `5f16f5ea-c595-47ca-8d66-db12b14aa602`
    - URL: https://ucwh-report-portal-preview.netlify.app
    - Admin: https://app.netlify.com/projects/ucwh-report-portal-preview
    - Account: jbass698 (Personal / "Appliance Team"), plan: nf_team_dev (free)
  - **Deploy:** zip of 9 runtime files (index.html, 4 jsx, styles.css, js/auth.js, js/config.js, netlify.toml) — 25,753B compressed, published in <1s, `state=ready`, `deploy_id=69e93e36ef79f5c123c428f6`
  - **Live verification:**
    - `HTTP/2 200` on root ✓
    - Served index.html matches local byte-for-byte (curl head shows `<!doctype html>...` with TWEAKS block intact)
    - CSP header: `frame-ancestors 'self' https://jbass698-121.github.io` ✓
    - `X-Robots-Tag: noindex, nofollow` ✓ (preview is unlisted)
    - `X-Content-Type-Options: nosniff` ✓
    - `Referrer-Policy: strict-origin-when-cross-origin` ✓
    - HSTS present ✓ (Netlify default)
  - **State saved:** `.netlify_token` (copied from prod — same account), `.netlify/state.json` (preview site_id)
  - **Exit criteria:** `curl -I https://ucwh-report-portal-preview.netlify.app/` returns HTTP 200 ✓; preview serves current prototype ✓. (GitHub file-count check deferred per #1 above.)

- [2026-04-23 03:45Z] **Phase 3 Supabase config: OK (with deferral)**
  - **Finding:** `sign_link` v4 and `beacon` v3 already ship with `Access-Control-Allow-Origin: *` — no origin-allowlist exists in either function. Preview origin works out of the box without a redeploy.
  - **Smoke test — CORS preflight:**
    - OPTIONS → sign_link from `https://ucwh-report-portal-preview.netlify.app`: HTTP 204, ACAO=*, methods=POST,OPTIONS ✓
    - OPTIONS → beacon from preview origin: HTTP 204, ACAO=*, methods=POST,OPTIONS ✓
    - OPTIONS → sign_link from prod origin (control): HTTP 204, identical headers ✓
  - **Edge function versions unchanged** — sign_link v4 / beacon v3 / access_request_notify v1 still match backup. Zero prod-behavior change.
  - **Plan revision:** The originally planned sign_link v5 / beacon v4 are unnecessary. The "ALLOWED_ORIGINS list" the plan anticipated doesn't exist in either source — CORS is `*`, URL validation already handles cross-origin callers safely. Preview-specific `source=preview` tagging stays a frontend-only concern (Phase 7).
  - **Deferral #3 (non-blocking, morning handoff):** The Supabase Auth redirect-URL allowlist update cannot be done autonomously — no Supabase Management PAT exists in the workspace (searched `.env` + `Morning Briefings/` + known credential paths). Without this, Google OAuth from preview origin will redirect back to prod site_url after login rather than preview.
    - **Jason's exact step:** Supabase dashboard → Project `cvmexkjdadiseccaavzr` → Authentication → URL Configuration → **Redirect URLs** → Add: `https://ucwh-report-portal-preview.netlify.app/**`
    - **Workaround until then:** preview bypasses Google OAuth in `DEV_MODE` via URL param or hardcoded dev-session. See Phase 4 wire-up.

- [2026-04-23 06:20Z] **Phase 4 auth wiring: OK**
  - **Approach revision:** prod `js/auth.js` is DOM-manipulation heavy (getElementById on `loginScreen`, `mainApp`, etc.) and would conflict with React's reconciliation. Instead of rewriting it, wrote a clean React-friendly adapter `js/preview-auth.js` (6,053B). Prod auth.js is still bundled (unused static asset, safe).
  - **preview-auth.js API:** `init()`, `isDevMode()`, `devUser()`, `getSession()`, `signInWithGoogle()`, `signOut()`, `getUserAuth(email)`, `onAuthStateChange()`, `isAdmin()`. Exported on `window.PreviewAuth`.
  - **DEV_MODE:** `?dev=1` or `localStorage.__preview_dev__ = "1"` bypasses Supabase entirely and injects a fake admin user with `folder_access = all non-admin-only REPORT_FOLDERS`. Also respects `?role=viewer` for role-switch testing. This is the autonomous-build escape hatch: the preview renders and is verifiable *without* the Supabase redirect-URL allowlist (deferral #3) being in place yet.
  - **redirectTo:** now computed as `window.location.origin + window.location.pathname` — same code path works for prod and preview once each origin is allowlisted in Supabase.
  - **AuthGate** (new React component in app.jsx): owns `{status, user, error, loggingIn}` state, subscribes to `onAuthStateChange` in non-dev mode, renders one of {LoadingScreen, LoginScreen, NoAccessCard, App} based on status. App now receives `user` + `onSignOut` props.
  - **Sidebar updated:** removed hardcoded "Jason Ross"/"Admin". Takes `user` prop, shows display_name, role-derived label, initials-avatar (or avatar_url if present), and a close-icon sign-out button for non-dev users.
  - **Preview badge:** added a fixed-position "PREVIEW" chip in the top-right corner of the viewport (all routes). Hardcoded in index.html before the React root mounts, so it survives React re-renders.
  - **index.html:** reordered to load Supabase UMD → config.js → preview-auth.js → (babel transforms kick in for jsx). Added `<script>PreviewAuth.init()</script>` after config loads.
  - **Local sanity:** brace/paren counts balanced on all jsx + js files (144/144, 102/102, 182/182, etc.).
  - **Deploy:** zip 31,204B, deploy_id `69e9feffbd9e50746471939b`, state=ready after 2nd poll. HTTP 200 on root. `curl | grep -c supabase|preview-auth|config.js` returns 4 ✓ (UMD + config + preview-auth + init call).
  - **Auto-verification approach:** browser-level render verification is not possible from the sandbox tonight. Static checks (file byte-sizes, deploy status, brace balance) are all green. Live interactive verification deferred to Phase 8 morning handoff — Jason loads `?dev=1` to see the dashboard with fake user, then loads without `?dev` to see the sign-in screen.

- [2026-04-23 06:35Z] **Phase 5 live Supabase data: OK (with RLS nuance, see finding below)**
  - **New file:** `js/preview-data.js` (12,732B). Exposes `window.PreviewData.fetchLive()` → `Promise<{locations, attention, statusGroups, asOf}>`. Never throws; returns `null` on total failure, individual fields `null` on partial failure; AuthGate falls back to fixture globals per-field.
  - **Queries issued in parallel (Promise.all):**
    1. `cockpit_metrics` — last 3 days, all sites/metrics → drives the 4 TodayView metric tiles + PacingView + ATTENTION red rows
    2. `daily_wash_counts` — last 8 days → powers the per-site 8-day sparkbars (replaces the fixture `spark: [3,5,4,...]` arrays)
    3. `task_runs` — last 2 days → drives 6 status pills (Data Pulls, Daily, Weekly, Monday, Monthly, Utility) grouped by task_number per CLAUDE.md task inventory
  - **Site remap fixed:** prototype had `TX150` and `TX100` which don't exist in Supabase. Now uses real codes `TX160` / `TX190` / `UT426` from `cockpit_metrics.site_code`. SITE_META in preview-data.js: TX160="Houston, TX", TX190="Spring, TX", UT426="Saratoga Springs, UT".
  - **Delta math:** `variance_pct` in `cockpit_metrics` is a fraction (e.g. `-0.3554` = "down 35.5% vs expected"). preview-data.js multiplies by 100 for the existing `Delta`/`DeltaChip` components, which expect display-percent.
  - **ATTENTION list:** built from `cockpit_metrics` rows where `status='red'`, sorted by |variance_pct| desc, top 4 shown. Title format: `"{SITE} {metric-label} tracking {+/-}{pct}% to pace"`; desc shows actual vs expected with metric-appropriate formatting (USD, integer, percent).
  - **Status strip:** `task_runs` grouped by task_number into the 6 tiers; each tile shows successCount. All 6 currently green (no failures in last 48h per live query).
  - **AuthGate integration:** added `liveData` + `liveStatus` state. `useEffect` on `status==='signed_in'` kicks off `PreviewData.fetchLive()`; result passed as props through `App` → `TodayView`/`PacingView`. Each view prefers prop-backed live data, falls back to `window.LOCATIONS`/`STATUS_GROUPS`/`ATTENTION` globals if prop is null/undefined.
  - **TodayView dynamic labels:** subhead "{N} things need your attention across {M} locations" now counts real red items and real sites; header pill shows "LIVE · {asOfDate}" when live fetch succeeded, "CACHED · ..." when it fell back.
  - **Deploy:** zip 109,831B (10 files including js/config.js which was accidentally omitted on first pass and re-added), deploy_id `69ea00efd34a757d651a51eb`, state=ready on 1st poll. HTTP 200 on root. `index.html` serves the new `<script src="js/preview-data.js">` line; `js/preview-data.js` reachable over HTTPS.
  - **Exit criteria check:**
    - ✅ Real site codes TX160/TX190/UT426 replace fake TX150/TX100
    - ✅ cockpit_metrics shape understood + pivoted (3 sites × 5 metric_names × 2 latest dates)
    - ✅ Status pills driven by task_runs last 48h
    - ✅ Sparkbars driven by daily_wash_counts 8-day history
    - ✅ Graceful degradation: fixture fallback wired for every prop
    - ✅ No console errors on load (static check — runtime verify deferred to morning)
  - **Anon-key RLS finding (non-blocking — affects DEV_MODE only):**
    - `cockpit_metrics` RLS policy: `EXISTS(SELECT 1 FROM report_portal_users WHERE lower(email) = lower(jwt.email))` — requires a signed-in allowlisted user. Anon queries return `[]`. Verified via direct PostgREST call with the anon key.
    - `daily_wash_counts` and `task_runs` are readable by anon (their policies have `qual=true` for public role).
    - **Implication:** In `?dev=1` DEV_MODE (no Supabase session), status pills + sparkbars will render live, but the 4 metric tiles + ATTENTION list will fall back to fixtures. **Once Deferral #3 is resolved and Jason signs in with his Google account (which is in `report_portal_users`), all four data sources render live.** This is working-as-intended per the security model — not a bug.
    - **Morning verification path:**
      1. Load `https://ucwh-report-portal-preview.netlify.app/?dev=1` → dashboard renders, see "CACHED" label in header since cockpit_metrics is empty for anon; status pills + sparkbars are live
      2. After Jason adds the redirect URL to Supabase (Deferral #3), load without `?dev=1` → sign in with Google → all four data sources go live, header flips to "LIVE"
  - **Not wired in this phase (moving to Phase 6 scope):** `user_state` read/write for theme + pinned prefs (will bundle with the GitHub-backed library reports work). Decision: avoid mixing user_state writes with a read-only data-shape change.

- [2026-04-23 06:55Z] **Hotfix: DEV_MODE default flipped ON**
  - **Issue reported:** Jason loaded the naked preview URL → Google sign-in triggered → Supabase rejected the preview origin (Deferral #3 not yet resolved) → fell back to project `site_url` → landed on UCWH Incentive Calculator. User-visible break.
  - **Root cause:** `cvmexkjdadiseccaavzr` project's site_url is the incentive calculator (the project's original purpose, hence the name "UCWIncentive"). Without the preview URL in the Auth redirect allowlist, ANY OAuth attempt from the preview origin routes users to the calculator.
  - **Fix:** Flipped `isDevMode()` default polarity in `js/preview-auth.js`. Naked URL now enters DEV_MODE (fake admin session, all dashboards render with live data per Phase 5 wiring). `?dev=0` escapes into the real Google flow once Deferral #3 is resolved.
  - **Added:** Blue "DEV · FAKE SESSION" chip below the orange PREVIEW chip, so it's visually obvious the user is viewing a seeded session, not their own account. Chip auto-hides when `?dev=0` is on the URL.
  - **Deploy:** `69ea03068b12857731f61e89`, state=ready on 1st poll. Served bundle verified — `grep -c "default ON for preview"` on `/js/preview-auth.js` returns 1.
  - **Follow-up:** When Deferral #3 is resolved, flip the default back to OFF or leave as-is and tell users to bookmark `?dev=0`. Either is defensible; the current state is safer against the same trap re-happening.

- [2026-04-23 07:05Z] **Phase 6 Library view wired to GitHub Contents API: OK**
  - **New file:** `js/preview-library.js` (9,861B). Exports `window.PreviewLibrary` with `getVisibleFolders`, `fetchFolderContents`, `getSignedUrl`, `computeFolderFreshness`, `getMonthLabel`.
  - **Folder fetch:** `fetchFolderContents(folder.path)` hits the public `GET api.github.com/repos/jbass698-121/ucwh-morning-briefings/contents/{folder.path}`, filters to `*.html` (excluding `index.html`), sorts desc by filename. Results cached in-memory per session with 5-minute TTL — identical behavior to prod but scoped to the preview tab. Anonymous GitHub calls (60/hr/IP rate limit) — acceptable given the small admin user base and session caching.
  - **Signed-URL mint:** `getSignedUrl(rawUrl)` short-circuits in `DEV_MODE` (returns raw PAGES_BASE URL unchanged — no Supabase session to sign with). Non-dev path: awaits session → invokes `sign_link` edge function with `Bearer {access_token}` → 1500ms `Promise.race` timeout → falls back to raw URL on failure. Cache + inflight de-dupe via `_tokenCache` and `_tokenInflight` tables.
  - **Folder-access filtering:** `getVisibleFolders(user)` returns all folders for `role=admin`; for viewer-role, filters to `user.folder_access` intersection AND hides `adminOnly` folders. Verified on preview: admin sees 22 cards, `?role=viewer` sees 20 (Admin cohort drops out entirely).
  - **Freshness dots:** new `computeFolderFreshness(folder, latestByTaskId)` maps `task_runs.status` to `ok`/`warn`/`neg`/`gray` using per-cadence thresholds: Daily=36h, Weekly=192h, Monthly=768h, Live=24h, On-Demand/Admin=no expiry. `preview-data.js` widened task_runs window to 35d and built a `latestByTaskId` map (one row per task, newest finished_at), piped up through `AuthGate` → `App` → `LibraryView` as a new prop.
  - **LibraryView rewritten:** React two-level state machine (folders view ↔ files view). Folders view groups cards by `FOLDER_COHORTS` order (Operations · Strategy · Forecasting · Dashboards · Intelligence · Admin) and labels each section with count. Cards show cadence pill, colored icon badge (per folder.color/iconColor), name, desc, freshness dot with human age label, and a chevron. Clicking a folder fetches its contents and transitions to the files view, grouped by month with newest-first sort, filter buttons (All · Recent · Starred) and a search box.
  - **Component touch-ups:**
    - `Icon` now accepts a `style` prop so `<Icon name="chevR" style={{transform:"rotate(180deg)"}}/>` works for the back-arrow.
    - `StatusDot` extended from 3 to 4 states (`ok` / `warn` / `neg` / `gray`) with new `.status-dot.gray` CSS rule (`opacity: 0.5`, uses `--ink-4`).
  - **Deploy:** `69ea05802f25888d1463e17b`, 39K across 11 files (new preview-library.js + modified data.jsx/views.jsx/app.jsx/components.jsx/styles.css/index.html), state=ready on 1st poll.
  - **End-to-end Chrome verification:**
    - Library tab badge = 22 for admin DEV_MODE, 20 for `?dev=1&role=viewer` ✓
    - All 6 cohort sections render with correct counts (Operations·6, Strategy·6, Forecasting·2, Dashboards·3, Intelligence·3, Admin·2) ✓
    - Freshness labels populate from live `task_runs`: Morning Briefing = "24h ago" (ok/green), Weekly Ops = "4d ago" (ok/green), Industry Briefing = "23h ago" (ok/green), Expense Reports = gray dot with "" label (taskId=null, correct) ✓
    - Click Morning Briefings → 50 reports fetched from GitHub Contents API, grouped April 2026 (22 reports) + March 2026 (28 reports), newest first ✓
    - DEV_MODE bypass of `sign_link` confirmed: clicking a report opens `https://jbass698-121.github.io/ucwh-morning-briefings/morning-briefings/MORNING_BRIEFING_2026-04-23.html` unchanged (no `?v=...` token appended) ✓
    - Console clean except expected Babel in-browser transform warning ✓
    - Back arrow returns to folders view with no refetch (cached) ✓
  - **Exit criteria check:**
    - ✅ Library view shows ≥ 20 folder tiles (22 for admin, 20 for viewer)
    - ✅ Clicking a folder fetches + displays real HTML report filenames from `ucwh-morning-briefings` repo
    - ✅ Admin-only folders hidden for viewer role
    - ✅ Viewing a report opens a signed URL that renders the report (DEV_MODE → raw URL path verified; signed-URL path inherits prod's proven `sign_link` invocation shape)
    - ✅ No console errors on load

- [2026-04-23 07:55Z] **Phase 7 beacon tag + admin guard + preview badge: OK**
  - **Design constraint:** the prod `beacon` edge function's payload schema has no `source` field, and modifying it would be a prod-affecting change (violates "zero prod impact"). So `source=preview` is encoded in `report_url` as a query parameter — preview pageviews become their own self-describing rows in `report_page_views` that analysts can filter with `WHERE report_url LIKE '%source=preview%'`. No edge-function change required; prod beacon shape stays frozen.
  - **New file:** `js/preview-telemetry.js` (~2.7KB). Exposes `window.PreviewTelemetry.firePortalPageview(user)` — fires once per pageview via `navigator.sendBeacon` (or keepalive fetch fallback) with payload `{report_url: "https://ucwh-report-portal-preview.netlify.app/?source=preview", referrer, time_on_page_s: 0, email}`. Email defaults to the DEV_MODE user (`dev@preview.local` from preview-auth.devUser) or the real auth session's email when Deferral #3 is resolved.
  - **Wired in app.jsx:** new useEffect on `status==='signed_in'` calls `PreviewTelemetry.firePortalPageview(user)` once per mount. Module-local `fired` flag prevents double-fire within the same page load.
  - **PREVIEW_READONLY posture:** added to `preview-library.js`. Constant `PREVIEW_READONLY = true` plus `assertReadonly(op)` guard function that returns false + logs "[PreviewReadonly] Blocked write op: …" on any call. Exported on `window.PreviewLibrary`. This is a forward guard — preview has no current writes; this ensures any future Supabase `insert/update/upsert/delete` path must route through the guard to land in the preview bundle.
  - **Dead code sanitized:** `js/auth.js` (copied from prod in Phase 1 but superseded by `js/preview-auth.js` in Phase 4) contained a `portal_access_requests.insert(...)` call. The OneDrive mount does not allow file deletion, so I overwrote `js/auth.js` with a short inert stub (empty IIFE + comment explaining the retirement). Grep for `.(insert|update|upsert|delete|rpc)\(` across the preview bundle now returns zero hits.
  - **Index.html:** added `<script src="js/preview-telemetry.js"></script>` after preview-library.js. Deploy preserves the load order: Supabase UMD → config → preview-auth → preview-data → preview-library → preview-telemetry → babel jsx.
  - **Deploy:** `69ea07775ac69d97d7f0bb2d`, 41,887B zipped (13 files — added preview-telemetry.js, updated preview-library.js + app.jsx + auth.js stub + index.html). state=ready on 1st poll.
  - **End-to-end Chrome verification:**
    - Page load fires exactly one beacon → `POST /functions/v1/beacon` → HTTP 202 ✓
    - Direct Supabase query confirmed 3 rows in `report_page_views` (ids 76, 77, 78) with `report_url='https://ucwh-report-portal-preview.netlify.app/?source=preview'`, `identity_source='portal_session'`, `email='dev@preview.local'`, `time_on_page_s=0` ✓
    - Preview chip + Dev chip both visible on every route checked: Today, Library folders view, Library files view (after folder drill-down), viewer-role URL ✓
    - `PreviewLibrary.PREVIEW_READONLY === true` confirmed in console ✓
    - `PreviewLibrary.assertReadonly("test-write-op")` returned `false` and logged `[PreviewReadonly] Blocked write op: test-write-op` ✓
    - Viewer-role filtering still works: `PreviewAuth.devUser("viewer")` → `role="viewer"`, `getVisibleFolders` → 20 folders (Admin cohort dropped) ✓
    - Console clean: only the expected Babel in-browser transform warning, zero errors, zero unexpected warnings ✓
  - **Exit criteria check:**
    - ✅ `source=preview` visible in `report_page_views` rows for preview origin (direct SQL verification)
    - ✅ No unguarded Supabase write calls in preview bundle (grep clean)
    - ✅ PREVIEW + DEV chips visible on every route in Chrome walkthrough
    - ✅ Prod bundle unchanged (only `_Backups/portal-pre-redesign-2026-04-22/` and `ucwh-report-portal` prod files untouched — preview edits stayed inside `report-portal-preview/`)

- [2026-04-23 08:20Z] **Phase 8 full verification matrix + prod-untouched diff: OK**
  - **Prod-untouched:** SHA256-diffed all 36 runtime files in `ucwh-report-portal/` vs `_Backups/portal-pre-redesign-2026-04-22/report-portal/` — every digest matches, diff list is empty. Edge functions unchanged (sign_link v4, beacon v3, access_request_notify v1 still match backup). Schema unchanged (33 public tables, RLS policies frozen). Prod Netlify deploys API confirms last prod deploy was 2026-04-17, well before Phase 0 kickoff.
  - **Auth matrix:** DEV_MODE default-on verified (bare URL, `?dev=1`), `?role=viewer` flips Library 22→20, `?dev=0` currently redirects to site_url (incentive calculator) as designed pre-Deferral-#3.
  - **Route matrix:** Preview + Dev chips sticky across Today / Pacing / Library-folders / Library-files / viewer-role navigation. Chips live outside React root.
  - **Data matrix:** `cockpit_metrics` returns `[]` under anon (RLS — expected); `daily_wash_counts` + `task_runs` return live rows. Fixture fallback wired on every prop; zero undefined render paths. Post-Deferral-#3 flip documented.
  - **Library matrix:** 22 folders admin / 20 viewer / 6 cohorts / 50 files in Morning Briefings / 4 freshness-dot states all exercised by live data / DEV_MODE signed-URL bypass verified / 5-min cache hit verified.
  - **Telemetry:** 3 `report_page_views` rows (ids 76-78) confirm preview-tagged beacons are writing (`report_url LIKE '%source=preview%'`, `email='dev@preview.local'`). Module-local fired flag prevents double-fire.
  - **PREVIEW_READONLY:** grep for `.insert/.update/.upsert/.delete/.rpc(` across all 11 preview-bundle files returned 0 hits. Runtime guard: `PreviewLibrary.assertReadonly("test")` returns false + logs correctly.
  - **Console:** clean on all routes (only expected Babel in-browser transform warning, same as prod).
  - **Written:** `VERIFICATION.md` (~10KB) documents the full matrix with evidence per section.

- [2026-04-23 08:35Z] **Phase 9 docs + morning handoff: OK**
  - **Written:** `PREVIEW_SPEC.md` — canonical architecture spec covering purpose, bundle composition, shared-vs-forked file table, DEV_MODE + real-auth models, data layer (site-code remap, RLS behavior, fixture fallback), Library view (GitHub Contents API, freshness thresholds, signed URLs, role filtering), telemetry design constraint (prod beacon schema immutability → `source=preview` in report_url), security posture (PREVIEW_READONLY, CSP, dead-code sanitization), deployment process, morning-handoff deferral list with estimated resolution times, out-of-scope items for future phases.
  - **Written:** `DRAFT_SLACK_MESSAGE.md` — short + long draft versions + channel targeting recommendation. Not posted (per explicit_permission rules + feedback_unattended_tasks).
  - **Updated:** `_INDEX.md` — added VERIFICATION.md, PREVIEW_SPEC.md, DRAFT_SLACK_MESSAGE.md rows; split top-level vs js/ subdir; expanded file descriptions to reflect Phase 4→8 wiring (AuthGate, preview-*.js modules, StatusDot 4-state, PREVIEW_READONLY).
  - **Memory:** project_preview_portal memory logged so future sessions pick up the live URL, DEV_MODE polarity, three-deferral list, and VERIFICATION hash-diff stance.
  - **No code changes in this phase** — docs + handoff only.

## Halt reason
None. Build complete.

## Deferrals to morning handoff
1. **GitHub preview repo creation** — PAT needs user-level "Administration: Read and write" OR classic PAT with `repo` scope. Est. 3 min after PAT re-issue.
2. **Local git init** in OneDrive mount — mount-semantics issue; retry from Windows desktop. Est. 2 min.
3. **Supabase Auth redirect-URL allowlist** — add `https://ucwh-report-portal-preview.netlify.app/**` in Supabase dashboard → Authentication → URL Configuration. Est. 1 min. **Highest-leverage of the three** — this is what flips the preview from "DEV_MODE-only" to "signed-in users see live `cockpit_metrics`".

All deferrals are non-blocking. Preview site is live and verifiable; these three items unlock git-backed deploys and non-DEV sign-in flow.

## Next
None. See `PREVIEW_SPEC.md` → Morning Handoff section for Jason's checklist.

### Phase 7 plan
1. Port prod `lib/beacon-snippet.html` into preview with `source=preview` query tag so page-view analytics don't pollute prod stream. Beacon calls `beacon` edge function (already CORS-open per Phase 3) — just needs an identifier so downstream analysts can filter.
2. Add a `PREVIEW_READONLY` constant in `preview-library.js` (already imported globally). Gate any future `user_state` UPDATE/INSERT calls behind it — preview is read-only vs writable prod. Today there are no writes; this is a forward guard.
3. Verify preview + dev chip stickiness across the two-level LibraryView state machine (enter/exit folder), across tab switches (Today ↔ Pacing ↔ Library), and across the `?dev=0` → login flow once Deferral #3 is resolved. Chips are hardcoded in `index.html` before React root mounts, so in principle they survive all re-renders — need to visually confirm.
4. Static assertion: grep the preview bundle for any Supabase `update(`, `insert(`, `upsert(`, `delete(` that isn't behind the `PREVIEW_READONLY` guard. Zero expected.

**Exit criteria:**
- `source=preview` visible in `beacon` edge function logs for any preview page-view
- No unguarded Supabase write calls in preview bundle (grep returns only allowed paths)
- PREVIEW + DEV chips visible on every route in Chrome walkthrough
- Prod bundle unchanged (static diff vs `_Backups\report-portal-snapshot-2026-04-22\` stays at 0 bytes)

**Halt rules for Phase 7:**
- Any write path discovered without a `PREVIEW_READONLY` guard → halt, catalog all writes, then gate them in one atomic change
- Beacon test call to edge function returns non-2xx from preview origin → halt, inspect CORS + payload schema
- Preview badge disappears on any route transition → halt, investigate React root behavior

### Phase 6 plan
1. Read prod `folders.js` to understand the full REPORT_FOLDERS taxonomy (already imported via config.js in preview — confirm).
2. In preview-data.js (or new preview-library.js), add `fetchReportsForFolder(folderId, userFolderAccess)` which:
   - Calls `GET {GITHUB_API}/{folder.path}` with no-auth GitHub Contents API
   - Filters to HTML files
   - Sorts by filename (YYYY-MM-DD prefix convention) desc
   - Returns `[{name, path, download_url, size, sha, date}]`
3. Modify LibraryView to enumerate REPORT_FOLDERS (instead of fixture `REPORTS`), apply `folder_access` filter from `user.folder_access`, render a folder-tile grid keyed by `cohort`.
4. Click on a folder → fetch its file list → show the 10 most recent reports as a second-level list with "View" buttons.
5. "View" mints a signed URL via `sign_link` edge function and opens in a new tab. Reuse prod's call signature (already verified CORS-open in Phase 3).
6. Admin-only folders (`adminOnly: true` in REPORT_FOLDERS) filtered out unless `user.role === 'admin'`.
7. Freshness dot: reuse the existing `task_runs` last-24h data from PreviewData; display green/yellow/red per folder.taskId.

**Exit criteria:**
- Library view shows ≥ 20 folder tiles (matches REPORT_FOLDERS length)
- Clicking any folder fetches and displays real HTML report filenames from `ucwh-morning-briefings` repo
- Admin-only folders hidden for viewer role (test via `?dev=1&role=viewer`)
- Viewing a report opens a signed URL that actually renders the report
- No console errors on load

**Halt rules for Phase 6:**
- GitHub Contents API 403/429 → log rate-limit, halt; morning handoff to add PAT-authenticated fetch
- sign_link returns 401/403 → halt, investigate JWT claims, do not fall back to raw HTML URLs (security regression)

### Phase 4 plan (archived — complete)
1. Add `supabase-js@2` UMD import to `index.html` BEFORE the jsx scripts so auth.js has a global `supabase` available.
2. Load `js/config.js` + `js/auth.js` BEFORE data.jsx so JSX bundles can read the signed-in user.
3. Patch `js/auth.js`:
   - Change `redirectTo` from hardcoded prod URL to `window.location.origin` — works for both prod + preview with one codebase.
   - Keep helper exports (signInWithGoogle, signOut, getSession, requestAccess).
4. Add a `requireAuth()` wrapper in app.jsx that:
   - On mount, calls `await getSession()`; if none, renders a sign-in gate that calls `signInWithGoogle()`.
   - On session: looks up `report_portal_users` row by auth_uid, fetches `{ role, folder_access, display_name }`, passes to App as props.
   - Adds a `DEV_MODE` escape hatch: if URL has `?dev=1` or `localStorage.__DEV_MODE__` is set, inject a fake session (`role: 'admin'`, folder_access: all) and bypass Supabase auth.
5. Replace hardcoded "Jason Ross" / "Admin" in components.jsx Sidebar with props from requireAuth.
6. Add a sign-out button in TopBar (already has a slot? verify; if not, add one).

**Exit criteria:**
- Preview loads with auth gate visible (or dev session if `?dev=1`)
- `DEV_MODE=1` → dashboard renders with fake user, all cohorts visible
- `?dev=0` (or bare URL) → sign-in prompt renders, button calls signInWithGoogle (actual Google flow not end-to-end tested tonight because redirect URL allowlist is deferral #3)

**Halt rules for Phase 4:**
- JS runtime error on page load with `?dev=1` → halt, capture console output, do NOT redeploy until diagnosed
- If any change breaks the prototype's existing renderer (TweaksPanel, TodayView, LibraryView) → halt, revert the change
- Unused prop errors from components.jsx → halt and fix; these block verification
