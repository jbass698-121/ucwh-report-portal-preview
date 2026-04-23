# Draft Slack Message — Preview Portal Ready

**Purpose:** Morning announcement to Jason / the team that the preview portal is live.
**Draft only — do not post.** Jason reviews and sends manually (or approves for automation).

---

## Short version (paste-ready)

> **Preview portal is live →** https://ucwh-report-portal-preview.netlify.app/
>
> Runs in DEV_MODE by default (fake admin, real data). Orange "PREVIEW" chip top-right — it is not prod. Prod portal is bit-for-bit untouched (hash-verified).
>
> Three non-blocking handoff items before full sign-in works — see `report-portal-preview/PREVIEW_SPEC.md` → Morning Handoff section (~6 min total).

---

## Longer version (if posting to #ceo-insights or similar strategic channel)

> **Report Portal Redesign — Preview is live**
>
> URL: https://ucwh-report-portal-preview.netlify.app/
>
> **What it is:** parallel preview of the portal redesign running on its own Netlify origin. Wears a persistent orange "PREVIEW" chip so there is never ambiguity about which site a screenshot came from. Production portal is bit-for-bit untouched — SHA256-verified against the pre-build backup (all 36 runtime files match), edge functions unchanged (sign_link v4, beacon v3, access_request_notify v1), schema unchanged.
>
> **What works today:**
> • Today / Pacing / Library views render with real Supabase data (sparkbars + task status + freshness dots are live)
> • Library fetches real report filenames from the `ucwh-morning-briefings` GitHub repo (22 folders for admin, 20 for viewer)
> • Clicking a report opens the actual HTML file
> • Telemetry emits `source=preview` tagged beacons so preview traffic is cleanly separable from prod (`WHERE report_url LIKE '%source=preview%'`)
>
> **Three non-blocking handoff items** before real sign-in works (total ~6 min):
> 1. Supabase Auth redirect URL allowlist (~1 min, dashboard)
> 2. GitHub preview repo creation (~3 min, needs PAT re-issue)
> 3. Local git init (~2 min, from desktop)
>
> Full spec + evidence matrix in `report-portal-preview/PREVIEW_SPEC.md` and `VERIFICATION.md`.

---

## Channel targeting (for reference)

Per `CLAUDE.md` Slack channel registry:

| Channel | ID | Fit |
|---|---|---|
| #ceo-insights | C0AJX23QJHK | Best fit — strategic/infrastructure milestone |
| #weekly-reports | C0AJA3HALR5 | OK — "new tool available" framing |
| DM to Jason | — | Safest default — let Jason decide who else to loop in |

**Recommendation:** DM to Jason first. Broad-channel announce is premature until Deferral #3 lands and the portal runs for the whole team, not just DEV_MODE.

---

## NOT posting anything autonomously

Per feedback_unattended_tasks + explicit_permission rules: messages that post on the user's behalf require explicit approval. This file is a draft for Jason to approve or edit, not an announcement.
