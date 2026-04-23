// ============================================================
// preview-library.js — GitHub Contents API + signed-URL layer
// ============================================================
// Depends on: config.js (GITHUB_API, PAGES_BASE, REPORT_FOLDERS,
//             supabaseClient), preview-auth.js (PreviewAuth.isDevMode).
//
// Responsibilities:
//   - List HTML reports inside a folder via GitHub Contents API (no-auth for
//     the public ucwh-morning-briefings repo)
//   - Mint portal_session tokens via the sign_link Edge Function for real-auth
//     sessions; skip in DEV_MODE (falls back to raw PAGES_BASE URL)
//   - Compute visible folders from REPORT_FOLDERS based on user.role + folder_access
//   - Compute folder freshness dot from task_runs latest row + folder.freq
//
// Exports a single global: `window.PreviewLibrary`.
//
// API:
//   PreviewLibrary.getVisibleFolders(user)
//   PreviewLibrary.fetchFolderContents(folderPath) → [{name, displayName, url, date, dateStr, dayOfWeek, monthKey, rawUrl}]
//   PreviewLibrary.getSignedUrl(rawUrl) → rawUrl or rawUrl?v=<token>
//   PreviewLibrary.computeFolderFreshness(folder, latestByTaskId) → {status, label}
// ============================================================

(function () {
  // 5 minute folder-contents cache so clicking back and forth doesn't hammer
  // the GitHub API (rate limit: 60/hr for unauthenticated IPs).
  const FOLDER_CACHE_TTL_MS = 5 * 60 * 1000;
  const _folderCache = Object.create(null); // path -> {ts, items}

  // Per-report token cache. Tokens are JWTs with short expiry minted by
  // the sign_link Edge Function; re-mint on cache miss.
  const _tokenCache = Object.create(null); // rawUrl -> token
  const _tokenInflight = Object.create(null); // rawUrl -> Promise<token|null>
  const TOKEN_MINT_TIMEOUT_MS = 1500;

  // ---- Folder visibility (mirrors prod getVisibleFolders) ----
  function getVisibleFolders(user) {
    if (typeof REPORT_FOLDERS === "undefined") return [];
    if (!user) return [];
    const isAdmin = user.role === "admin";
    const access = Array.isArray(user.folder_access) ? user.folder_access : [];
    return REPORT_FOLDERS.filter(function (f) {
      if (f.adminOnly && !isAdmin) return false;
      if (isAdmin) return true;
      return access.indexOf(f.id) !== -1;
    });
  }

  // ---- Date / type helpers (ported from prod navigation.js) ----
  function parseReportDate(filename) {
    let m = filename.match(/(\d{4})[\-_\s](\d{2})[\-_\s](\d{2})/);
    if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    m = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return new Date(m[1] + "T00:00:00");
    return null;
  }
  function getMonthKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }
  function getMonthLabel(monthKey) {
    const parts = monthKey.split("-");
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[parseInt(parts[1], 10) - 1] + " " + parts[0];
  }
  function prettifyName(filename) {
    return filename.replace(/\.html$/i, "").replace(/[_-]/g, " ");
  }
  function dayOfWeek(date) {
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()];
  }
  function formatDateShort(date) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // ---- GitHub Contents fetch ----
  async function fetchFolderContents(folderPath) {
    // Empty path means a synthetic folder (capital-requests, usage-report) that
    // has no file listing — return empty so the caller renders a placeholder.
    if (!folderPath) return [];

    const now = Date.now();
    const cached = _folderCache[folderPath];
    if (cached && (now - cached.ts) < FOLDER_CACHE_TTL_MS) {
      return cached.items;
    }

    const apiUrl = GITHUB_API + "/" + folderPath;
    let items = [];
    try {
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        console.warn("[PreviewLibrary] fetchFolderContents HTTP " + resp.status + " for " + folderPath);
        _folderCache[folderPath] = { ts: now, items: [] };
        return [];
      }
      const files = await resp.json();
      const htmlFiles = (Array.isArray(files) ? files : [])
        .filter(function (f) { return f.name && f.name.endsWith(".html") && f.name !== "index.html"; })
        .sort(function (a, b) { return b.name.localeCompare(a.name); });

      items = htmlFiles.map(function (f) {
        const rawUrl = PAGES_BASE + "/" + folderPath + "/" + f.name;
        const date = parseReportDate(f.name);
        return {
          name: f.name,
          displayName: prettifyName(f.name),
          rawUrl: rawUrl,
          url: rawUrl, // placeholder — LibraryView mints signed URL on open
          date: date,
          dateStr: date ? formatDateShort(date) : "",
          dayOfWeek: date ? dayOfWeek(date) : "",
          monthKey: date ? getMonthKey(date) : "undated",
          size: f.size,
          sha: f.sha,
        };
      });
      _folderCache[folderPath] = { ts: now, items: items };
    } catch (e) {
      console.warn("[PreviewLibrary] fetchFolderContents exception for " + folderPath + ":", e);
      _folderCache[folderPath] = { ts: now, items: [] };
    }
    return items;
  }

  // ---- Signed-URL mint (sign_link Edge Function) ----
  // In DEV_MODE we skip the mint — there's no real JWT to sign with, and the
  // public PAGES_BASE URLs open fine raw. Prod users get a portal_session
  // token appended as ?v=<jwt> so the report's beacon attributes the view.
  async function _mintToken(rawUrl) {
    if (!rawUrl) return null;
    if (_tokenCache[rawUrl]) return _tokenCache[rawUrl];
    if (_tokenInflight[rawUrl]) return _tokenInflight[rawUrl];
    if (!supabaseClient) return null;

    // DEV_MODE has no real session; short-circuit
    if (window.PreviewAuth && window.PreviewAuth.isDevMode()) return null;

    const p = (async () => {
      try {
        const sessionRes = await supabaseClient.auth.getSession();
        const session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
        if (!session || !session.access_token) return null;
        const res = await supabaseClient.functions.invoke("sign_link", {
          body: { report_url: rawUrl },
          headers: { Authorization: "Bearer " + session.access_token },
        });
        if (res.error) throw res.error;
        const token = res.data && typeof res.data.token === "string" ? res.data.token : null;
        if (token) _tokenCache[rawUrl] = token;
        return token;
      } catch (e) {
        console.warn("[PreviewLibrary] sign_link mint failed:", (e && e.message) || e);
        return null;
      } finally {
        delete _tokenInflight[rawUrl];
      }
    })();
    _tokenInflight[rawUrl] = p;
    return p;
  }

  function _appendToken(url, token) {
    if (!url || !token) return url;
    try {
      const u = new URL(url, window.location.href);
      u.searchParams.set("v", token);
      return u.toString();
    } catch (_) {
      const sep = url.indexOf("?") >= 0 ? "&" : "?";
      return url + sep + "v=" + encodeURIComponent(token);
    }
  }

  async function getSignedUrl(rawUrl) {
    const token = await Promise.race([
      _mintToken(rawUrl),
      new Promise(function (resolve) { setTimeout(function () { resolve(null); }, TOKEN_MINT_TIMEOUT_MS); }),
    ]);
    if (!token) return rawUrl;
    return _appendToken(rawUrl, token);
  }

  // ---- Folder freshness (ported from prod computeFolderFreshness) ----
  // Thresholds: Daily > 36h = amber, Weekly > 192h = amber, Monthly > 768h = amber
  // Red if latest status = failure; gray if no recent run; green if within window.
  const FRESHNESS_THRESHOLDS_HOURS = {
    Daily: 36,
    Weekly: 192,
    Monthly: 768,
    Live: 24,
    "On-Demand": null, // no stale state — always green when present
    Admin: null,
  };

  function relHoursAgo(isoOrDate) {
    if (!isoOrDate) return null;
    const t = typeof isoOrDate === "string" ? Date.parse(isoOrDate) : isoOrDate.getTime();
    if (isNaN(t)) return null;
    return (Date.now() - t) / (1000 * 60 * 60);
  }

  function computeFolderFreshness(folder, latestByTaskId) {
    const taskId = folder.taskId;
    if (!taskId) {
      // Synthetic folders (capital-requests, usage-report, expense-reports
      // when not yet wired) — no freshness signal.
      return { status: "gray", label: "" };
    }
    const latest = latestByTaskId && latestByTaskId[taskId];
    if (!latest) return { status: "gray", label: "no recent run" };

    const ageHours = relHoursAgo(latest.finished_at || latest.run_date);
    if (ageHours == null) return { status: "gray", label: "" };

    // Prod used 'success' | 'failure' | 'partial' statuses
    if (latest.status === "failure") {
      return { status: "neg", label: "failed " + _humanAge(ageHours) };
    }

    const thresh = FRESHNESS_THRESHOLDS_HOURS[folder.freq];
    let status = "ok";
    if (thresh != null && ageHours > thresh) status = "warn";
    if (latest.status === "partial") status = "warn";

    return { status: status, label: _humanAge(ageHours) };
  }

  function _humanAge(hours) {
    if (hours == null) return "";
    if (hours < 1) return "just now";
    if (hours < 24) return Math.round(hours) + "h ago";
    const days = Math.round(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 30) return days + "d ago";
    const months = Math.round(days / 30);
    return months + "mo ago";
  }

  // ---- PREVIEW_READONLY posture ----
  // Preview site must never write to Supabase. Reads are fine (cockpit_metrics,
  // daily_wash_counts, task_runs), and beacon/sign_link edge-function calls are
  // append-only telemetry that live alongside prod beacons — not state changes.
  // Anything using supabaseClient.from(...).update/insert/upsert/delete is a
  // write and MUST route through this guard so we can centrally block/log.
  const PREVIEW_READONLY = true;

  function assertReadonly(op) {
    if (!PREVIEW_READONLY) return true;
    // Never throw into page-load paths — just log and refuse.
    console.warn("[PreviewReadonly] Blocked write op:", op);
    return false;
  }

  window.PreviewLibrary = {
    getVisibleFolders: getVisibleFolders,
    fetchFolderContents: fetchFolderContents,
    getSignedUrl: getSignedUrl,
    computeFolderFreshness: computeFolderFreshness,
    getMonthLabel: getMonthLabel,
    PREVIEW_READONLY: PREVIEW_READONLY,
    assertReadonly: assertReadonly,
  };
})();
