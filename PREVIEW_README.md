# UCWH Report Portal — PREVIEW

**Status:** Parallel preview build of the portal visual redesign.
**Live URL (target):** https://ucwh-report-portal-preview.netlify.app
**Prod URL (untouched):** https://ucwh-report-portal.netlify.app

---

## What this is

A second, standalone Netlify site running the React + Babel redesign prototype wired to the **same** Supabase project, **same** GitHub Contents API, and **same** edge functions as production. Prod and preview are data-siblings; prod is the system of record, preview is a staging surface for visual and interaction changes.

## The prod-untouched rule

This folder, this Netlify site, this GitHub repo, and all writes originating from this origin must leave prod completely alone:

- **No file** under `Wash-Reports/report-portal/` may be modified during preview work.
- **No deploy** to Netlify site ID `58c04528-7321-4fdb-88bc-e4644a8d700c` from inside preview tooling.
- **No schema migrations** against Supabase project `cvmexkjdadiseccaavzr`. Preview is read-only or writes only to its own beacon events (tagged `source=preview`) and its own `user_state` rows.
- **No edits** to existing edge functions that break prod behavior. Edge-function version bumps (sign_link v5, beacon v4) must remain backward-compatible with prod callers.

If you find yourself about to edit anything in the prod portal folder, stop. Preview changes go here.

## What lives here

| File | Role |
|---|---|
| `index.html` | React + Babel shell, script imports, `window.TWEAKS` hook |
| `app.jsx` | `App` component + `TweaksPanel` postMessage handshake |
| `components.jsx` | Icon, Delta, Sidebar, TopBar, Tabs |
| `data.jsx` | Static fixtures (being replaced by Supabase + GitHub reads during wire-up) |
| `views.jsx` | TodayView, PacingView, LibraryView, ReportCard |
| `styles.css` | OKLCH color tokens + IBM Plex typography |
| `js/auth.js` | Supabase Google-OAuth wrapper (copied from prod, `redirectTo` swapped for preview origin) |
| `js/config.js` | Supabase URL + anon key + `REPORT_FOLDERS` + `FOLDER_COHORTS` |
| `netlify.toml` | Publish dir, SPA redirect, CSP / noindex headers |
| `.gitignore` | Excludes `.netlify_token`, `.env`, node_modules |
| `STATUS.md` | Autonomous build log — source of truth during overnight runs |
| `PREVIEW_SPEC.md` | As-built spec (written at end of build) |

## Who can touch this

- **Jason** — full write access, final call on UX choices.
- **Claude sessions** — may author changes in this folder only. Prod folder is read-only to preview builds.
- **Other humans** — preview is internal / unlisted; `X-Robots-Tag: noindex, nofollow` is set in `netlify.toml`. Do not share the preview URL externally.

## Deploys

```bash
cd /path/to/Wash-Reports/report-portal-preview
netlify deploy --prod --dir .     # token auto-loaded from .netlify_token
```

Deploys here only land on the preview site. The Netlify site ID lives in `.netlify/state.json` (after first `netlify link` / site creation). Do not copy prod's `.netlify/` folder in — the site ID must be the preview's own.

## Rollback

There is no rollback for preview. If the preview site breaks, fix forward or delete the Netlify site. Prod is untouched; there is nothing to roll back.

## Source of truth

- Plan: `../report-portal/PREVIEW_PARALLEL_PLAN.md`
- Build log: `STATUS.md` in this folder
- Backup of prod (pre-redesign): `../_Backups/portal-pre-redesign-2026-04-22/`
