// ============================================================
// preview-data.js — live Supabase reads for TodayView / PacingView
// ============================================================
// Depends on: config.js (supabaseClient, SUPABASE_URL, SUPABASE_ANON_KEY),
// preview-auth.js (PreviewAuth.init() must have been called before fetchLive).
//
// Reads:
//   - cockpit_metrics       (last 2 days × 3 sites × 5 metric_names)
//   - daily_wash_counts     (last 8 days, for sparklines)
//   - task_runs             (last 2 days, for Data Pulls/Daily/Weekly/... pills)
//
// Exports a single global: `window.PreviewData`.
//   PreviewData.fetchLive() → Promise<{locations, attention, statusGroups, asOf}>
//
// Never throws. On error, returns null and logs to console so the AuthGate
// can fall back to the fixture globals in data.jsx. Every downstream consumer
// treats `null` as "use fixtures" — keeps the render safe even if Supabase
// is unreachable, blocked by CORS, or the schema drifts.
// ============================================================

(function () {
  // ---- site metadata: code → human label ----
  // Intentionally conservative — only facts we have verified. Lane count /
  // "lead" tags removed from fixture because they were fabricated in the
  // prototype. Add real ones once the portal exposes a site-meta table.
  const SITE_META = {
    TX160: "Houston, TX",
    TX190: "Spring, TX",
    UT426: "Saratoga Springs, UT",
  };
  const SITE_ORDER = ["TX160", "TX190", "UT426"];

  // ---- task_number → group label (mirrors CLAUDE.md task inventory) ----
  const TASK_GROUPS = {
    "Data Pulls": [1, 2],
    Daily: [4, 5, 6, 21, 22],
    Weekly: [7, 8, 9],
    Monday: [11, 12, 13],
    Monthly: [14, 15, 25],
    Utility: [16, 18, 19, 20, 23, 24],
  };
  const STATUS_GROUP_ORDER = ["Data Pulls", "Daily", "Weekly", "Monday", "Monthly", "Utility"];

  // ---- formatters ----
  function fmtUSDCompact(n) {
    if (n == null || isNaN(n)) return "—";
    if (n >= 1000) return "$" + Math.round(n).toLocaleString();
    return "$" + n.toFixed(2);
  }
  function fmtUSD(n) {
    if (n == null || isNaN(n)) return "—";
    return "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  function fmtInt(n) {
    if (n == null || isNaN(n)) return "—";
    return String(Math.round(Number(n)));
  }
  function fmtPriceUSD(n) {
    if (n == null || isNaN(n)) return "—";
    return "$" + Number(n).toFixed(2);
  }
  function pctDelta(value, expected) {
    if (expected == null || isNaN(expected) || Number(expected) === 0) return 0;
    return ((Number(value) - Number(expected)) / Number(expected)) * 100;
  }
  function relativeTime(isoDate) {
    if (!isoDate) return "";
    const then = new Date(isoDate + "T00:00:00Z").getTime();
    const now = Date.now();
    const diffHours = Math.floor((now - then) / (1000 * 60 * 60));
    if (diffHours < 1) return "just now";
    if (diffHours < 24) return diffHours + "h ago";
    const days = Math.floor(diffHours / 24);
    if (days === 1) return "Yesterday";
    return days + "d ago";
  }

  // ---- Supabase: pivot cockpit_metrics row list into site×metric map ----
  function pivotByDate(rows) {
    // rows: [{metric_date, site_code, metric_name, value, expected_value, variance_pct, status}]
    // Output: { [date]: { [site]: { [metric_name]: row } } }
    const out = {};
    for (const r of rows) {
      const d = r.metric_date;
      const s = r.site_code;
      const m = r.metric_name;
      if (!out[d]) out[d] = {};
      if (!out[d][s]) out[d][s] = {};
      out[d][s][m] = r;
    }
    return out;
  }

  function mostRecentDate(pivotMap) {
    const keys = Object.keys(pivotMap);
    keys.sort(); // YYYY-MM-DD sorts lexically
    return keys.length ? keys[keys.length - 1] : null;
  }

  async function fetchCockpit() {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient
      .from("cockpit_metrics")
      .select("metric_date, site_code, metric_name, value, expected_value, variance_pct, status, computed_at")
      .gte("metric_date", new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10))
      .order("metric_date", { ascending: false });
    if (error) { console.warn("[PreviewData] cockpit_metrics error:", error); return null; }
    return data || [];
  }

  async function fetchWashHistory() {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient
      .from("daily_wash_counts")
      .select("site_id, report_date, total_washes")
      .gte("report_date", new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString().slice(0, 10))
      .order("report_date", { ascending: true });
    if (error) { console.warn("[PreviewData] daily_wash_counts error:", error); return null; }
    return data || [];
  }

  async function fetchTaskRuns() {
    if (!supabaseClient) return null;
    // Widen the window to 35d so monthly tasks show at least one finished run
    // for freshness dots on the Library folder tiles. StatusGroups still
    // aggregate from the subset, but folder freshness needs a longer tail.
    const { data, error } = await supabaseClient
      .from("task_runs")
      .select("task_id, task_number, task_name, status, run_date, finished_at")
      .gte("run_date", new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString().slice(0, 10))
      .order("finished_at", { ascending: false });
    if (error) { console.warn("[PreviewData] task_runs error:", error); return null; }
    return data || [];
  }

  // Build latestByTaskId from task_runs rows (already finished_at DESC).
  // Keyed by string task_id (e.g. 'morning-briefing') for folder freshness
  // dots — matches REPORT_FOLDERS[].taskId on prod.
  function buildLatestByTaskId(taskRunsRows) {
    if (!taskRunsRows) return {};
    const out = {};
    for (const r of taskRunsRows) {
      const id = r.task_id;
      if (!id) continue;
      if (!out[id]) out[id] = r;
    }
    return out;
  }

  // ---- Build LOCATIONS ----
  function buildLocations(cockpitRows, washRows) {
    if (!cockpitRows || cockpitRows.length === 0) return null;
    const pivot = pivotByDate(cockpitRows);
    const latest = mostRecentDate(pivot);
    if (!latest) return null;
    const siteMap = pivot[latest];

    // Build sparkline history per site from daily_wash_counts (last 8 days)
    const sparkBySite = {};
    if (washRows) {
      for (const row of washRows) {
        if (!sparkBySite[row.site_id]) sparkBySite[row.site_id] = [];
        sparkBySite[row.site_id].push(Number(row.total_washes));
      }
    }

    const out = [];
    for (const code of SITE_ORDER) {
      const m = siteMap[code];
      if (!m) continue;

      const wash = m.wash_count || {};
      const gross = m.gross_revenue || {};
      const avgp = m.avg_wash_price || {};
      const newm = m.new_members || {};
      const rework = m.rewash_rate || {};

      // Convert variance_pct from fraction (-0.355) to display percent (-35.5)
      const washDelta = wash.variance_pct != null ? Number(wash.variance_pct) * 100 : 0;
      const grossDelta = gross.variance_pct != null ? Number(gross.variance_pct) * 100 : 0;
      const avgDelta = avgp.variance_pct != null ? Number(avgp.variance_pct) * 100 : 0;
      const newmDelta = newm.variance_pct != null ? Number(newm.variance_pct) * 100 : 0;

      out.push({
        code: code,
        meta: SITE_META[code] || code,
        metrics: {
          worksCount: {
            value: fmtInt(wash.value),
            delta: washDelta,
            sub: "vs " + fmtInt(wash.expected_value) + " avg",
          },
          grossRev: {
            value: fmtUSDCompact(gross.value),
            delta: grossDelta,
            sub: "vs " + fmtUSDCompact(gross.expected_value),
          },
          avgTicket: {
            value: fmtPriceUSD(avgp.value),
            delta: avgDelta,
            sub: "vs " + fmtPriceUSD(avgp.expected_value),
          },
          newMembers: {
            value: fmtInt(newm.value),
            delta: newmDelta,
            sub: "vs " + fmtInt(newm.expected_value),
          },
        },
        reworkRate: rework.value != null ? (Number(rework.value) * 100).toFixed(2) + "%" : "0.00%",
        entries: wash.value != null ? Math.round(Number(wash.value)) : 0,
        spark: sparkBySite[code] && sparkBySite[code].length ? sparkBySite[code] : [1],
        status: wash.status || "neutral",
      });
    }
    return out.length ? out : null;
  }

  // ---- Build ATTENTION from cockpit_metrics where status='red' ----
  // Friendly labels for metric_name
  const METRIC_LABEL = {
    wash_count: "wash volume",
    gross_revenue: "gross revenue",
    avg_wash_price: "avg ticket",
    new_members: "new members",
    rewash_rate: "rewash rate",
  };

  function buildAttention(cockpitRows) {
    if (!cockpitRows || cockpitRows.length === 0) return null;
    const pivot = pivotByDate(cockpitRows);
    const latest = mostRecentDate(pivot);
    if (!latest) return null;
    const siteMap = pivot[latest];

    const reds = [];
    for (const code of SITE_ORDER) {
      const m = siteMap[code] || {};
      for (const [metricName, row] of Object.entries(m)) {
        if (row.status !== "red") continue;
        const deltaPct = row.variance_pct != null ? Number(row.variance_pct) * 100 : 0;
        const label = METRIC_LABEL[metricName] || metricName;
        const direction = deltaPct >= 0 ? "+" : "";
        const title = code + " " + label + " tracking " + direction + deltaPct.toFixed(1) + "% to pace";

        // Format actual vs expected based on metric type
        let actual, expected;
        if (metricName === "gross_revenue" || metricName === "avg_wash_price") {
          actual = fmtUSD(row.value);
          expected = fmtUSD(row.expected_value);
        } else if (metricName === "rewash_rate") {
          actual = (Number(row.value) * 100).toFixed(2) + "%";
          expected = (Number(row.expected_value) * 100).toFixed(2) + "%";
        } else {
          actual = fmtInt(row.value);
          expected = fmtInt(row.expected_value);
        }

        reds.push({
          tone: "neg",
          title: title,
          desc: "Actual " + actual + " vs expected " + expected + ".",
          time: relativeTime(row.metric_date),
          _priority: Math.abs(deltaPct),
        });
      }
    }

    // Sort by largest-magnitude variance first, take top 4
    reds.sort(function (a, b) { return b._priority - a._priority; });
    const top = reds.slice(0, 4).map(function (r) {
      // Strip internal sort field
      return { tone: r.tone, title: r.title, desc: r.desc, time: r.time };
    });

    return top.length ? top : null;
  }

  // ---- Build STATUS_GROUPS from task_runs ----
  function buildStatusGroups(taskRunsRows) {
    if (!taskRunsRows) return null;

    // Latest run per task_number within window
    const byTask = {};
    for (const r of taskRunsRows) {
      const n = r.task_number;
      if (!byTask[n]) byTask[n] = r; // rows are finished_at DESC so first is latest
    }

    const out = [];
    for (const label of STATUS_GROUP_ORDER) {
      const taskNumbers = TASK_GROUPS[label];
      let successCount = 0;
      let failCount = 0;
      let presentCount = 0;
      for (const n of taskNumbers) {
        const r = byTask[n];
        if (!r) continue;
        presentCount += 1;
        if (r.status === "success") successCount += 1;
        else failCount += 1;
      }
      let status = "ok";
      let meta = successCount + " healthy";
      if (failCount > 0) { status = "neg"; meta = failCount + " failed"; }
      else if (presentCount === 0) { status = "warn"; meta = "no recent runs"; }
      else if (presentCount < taskNumbers.length) {
        // Some tasks run weekly/monthly so "less than total" is NOT a fault.
        // Keep green but annotate.
        meta = successCount + " healthy";
      }
      out.push({
        label: label,
        count: successCount || presentCount,
        status: status,
        meta: meta,
      });
    }
    return out.length ? out : null;
  }

  // ---- Public API ----
  async function fetchLive() {
    try {
      if (!supabaseClient) {
        console.warn("[PreviewData] supabaseClient not initialized; using fixtures.");
        return null;
      }
      const [cockpit, wash, runs] = await Promise.all([
        fetchCockpit(),
        fetchWashHistory(),
        fetchTaskRuns(),
      ]);

      const locations = buildLocations(cockpit, wash);
      const attention = buildAttention(cockpit);
      const statusGroups = buildStatusGroups(runs);
      const latestByTaskId = buildLatestByTaskId(runs);

      // If ALL three failed, treat as total failure so caller falls back
      if (!locations && !attention && !statusGroups) return null;

      const asOf = cockpit && cockpit.length
        ? cockpit.reduce(function (max, r) {
            return (!max || r.metric_date > max) ? r.metric_date : max;
          }, null)
        : null;

      return {
        locations: locations,
        attention: attention,
        statusGroups: statusGroups,
        latestByTaskId: latestByTaskId,
        asOf: asOf,
      };
    } catch (e) {
      console.error("[PreviewData] fetchLive exception:", e);
      return null;
    }
  }

  window.PreviewData = {
    fetchLive: fetchLive,
    // Export helpers for future consumers (e.g. a debug panel)
    SITE_META: SITE_META,
    TASK_GROUPS: TASK_GROUPS,
  };
})();
