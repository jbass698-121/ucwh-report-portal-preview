// ============================================================
// preview-telemetry.js — preview-only pageview beacon
// ============================================================
// Depends on: config.js (SUPABASE_URL), preview-auth.js (PreviewAuth).
//
// Responsibilities:
//   - Fire a single fire-and-forget beacon call per session/tab to the
//     same `beacon` edge function prod uses, tagged with
//     report_url=https://ucwh-report-portal-preview.netlify.app/?source=preview
//     so analytics can segment preview usage from prod usage cleanly.
//   - Include the viewer email when in DEV_MODE (dev@ucwh.ai) or the
//     real auth session email otherwise. Beacon accepts { report_url,
//     email, referrer } at face value from portal-session callers.
//   - Use navigator.sendBeacon where available (survives page unload);
//     falls back to fetch(keepalive: true).
//
// Non-goals:
//   - Per-route tracking (Today/Pacing/Library). The initial session
//     pageview is enough to count preview users; a SPA route-tracker
//     would need its own design and may come later.
//   - Modifying the beacon edge function schema. This file works against
//     the existing prod beacon shape untouched.
//
// Exports a single global: `window.PreviewTelemetry`.
// ============================================================

(function () {
  var fired = false;

  function beaconUrl() {
    // SUPABASE_URL lives in config.js, exposed globally.
    if (typeof SUPABASE_URL !== "string" || !SUPABASE_URL) return null;
    return SUPABASE_URL.replace(/\/+$/, "") + "/functions/v1/beacon";
  }

  function firePortalPageview(user) {
    if (fired) return;
    fired = true;

    var url = beaconUrl();
    if (!url) return;

    // The self-describing report_url: we use the preview origin + a stable
    // marker query so downstream queries can `WHERE report_url LIKE
    // 'https://ucwh-report-portal-preview.netlify.app/%source=preview%'`.
    var previewOrigin = "https://ucwh-report-portal-preview.netlify.app/";
    var reportUrl = previewOrigin + "?source=preview";

    // Best-effort email inclusion for identity attribution. Beacon accepts
    // `email` from portal-session callers at face value (prod does the same
    // via postMessage).  DEV mode sends a stable dev marker so these rows
    // are easy to filter out downstream.
    var email = null;
    try {
      if (user && typeof user.email === "string" && user.email) {
        email = user.email;
      } else if (window.PreviewAuth && window.PreviewAuth.isDevMode()) {
        email = "dev-preview@ucwh.ai";
      }
    } catch (e) { /* ignore */ }

    var payload = {
      report_url: reportUrl,
      referrer: document.referrer || null,
      time_on_page_s: 0,
    };
    if (email) payload.email = email;

    var body = JSON.stringify(payload);

    try {
      if (navigator.sendBeacon) {
        // Blob text/plain skips CORS preflight (matches prod beacon snippet).
        var blob = new Blob([body], { type: "text/plain" });
        var ok = navigator.sendBeacon(url, blob);
        if (ok) return;
      }
      // Fallback: keepalive fetch.
      fetch(url, {
        method: "POST",
        body: body,
        headers: { "Content-Type": "text/plain" },
        keepalive: true,
        mode: "cors",
      }).catch(function () { /* fire-and-forget */ });
    } catch (e) { /* swallow */ }
  }

  window.PreviewTelemetry = {
    firePortalPageview: firePortalPageview,
  };
})();
