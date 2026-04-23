// Sample data — mirrors the screenshot domain but original content
const LOCATIONS = [
  {
    code: "TX150",
    meta: "Houston, TX · Lead · 14 lanes",
    metrics: {
      worksCount: { value: "16", delta: -54.9, sub: "vs 27 avg" },
      grossRev:   { value: "$1,016", delta: -103.3, sub: "vs $2,072" },
      avgTicket:  { value: "$63.75", delta: -83.2, sub: "vs $78.12" },
      newMembers: { value: "12", delta: 83, sub: "vs 7" },
    },
    reworkRate: "0.0%",
    entries: 103,
    spark: [3,5,4,7,6,4,3,2,3,4,2,1],
  },
  {
    code: "TX100",
    meta: "Dallas, TX · 11 lanes",
    metrics: {
      worksCount: { value: "9", delta: -55.0, sub: "vs 20 avg" },
      grossRev:   { value: "$1,472", delta: -113.1, sub: "vs $3,218" },
      avgTicket:  { value: "$123.75", delta: -104.3, sub: "vs $161.10" },
      newMembers: { value: "15", delta: 50, sub: "vs 10" },
    },
    reworkRate: "0.0%",
    entries: 86,
    spark: [4,6,5,4,3,5,4,3,3,4,3,2],
  },
  {
    code: "UT426",
    meta: "Salt Lake City, UT · 9 lanes",
    metrics: {
      worksCount: { value: "10", delta: -19.4, sub: "vs 13 avg" },
      grossRev:   { value: "$1,665", delta: 58.2, sub: "vs $1,039" },
      avgTicket:  { value: "$92.91", delta: 75.8, sub: "vs $54.26" },
      newMembers: { value: "6", delta: -25, sub: "vs 8" },
    },
    reworkRate: "0.0%",
    entries: 48,
    spark: [2,3,4,5,6,7,6,8,7,9,8,7],
  },
];

const STATUS_GROUPS = [
  { label: "Data Pulls",  count: 2, status: "ok",   meta: "2 healthy" },
  { label: "Daily",       count: 5, status: "ok",   meta: "5 healthy" },
  { label: "Weekly",      count: 4, status: "ok",   meta: "4 healthy" },
  { label: "Monday",      count: 3, status: "warn", meta: "1 queued" },
  { label: "Monthly",     count: 3, status: "ok",   meta: "3 ready" },
  { label: "Utility",     count: 5, status: "warn", meta: "1 stale" },
];

const ATTENTION = [
  {
    tone: "neg",
    title: "TX100 gross revenue tracking −113% to pace",
    desc: "5-day rolling avg down to $1,472. Two lanes reported downtime at 9:42a.",
    time: "21m ago",
  },
  {
    tone: "warn",
    title: "Utility → Saratoga Springs draft stale",
    desc: "Last refreshed 34h ago. Scheduled pull skipped overnight.",
    time: "2h ago",
  },
  {
    tone: "pos",
    title: "UT426 member growth crossed monthly target",
    desc: "112% of April goal reached on day 21. Retention cohort looks healthy.",
    time: "4h ago",
  },
  {
    tone: "info",
    title: "Weekly Ops Review ready for your review",
    desc: "Jamie Reyes added 3 comments on the campaign attribution section.",
    time: "Yesterday",
  },
];

const QUICK_ACCESS = [
  { category: "Pinned",   name: "Morning Briefing — TX150", when: "6:02 AM" },
  { category: "Recent",   name: "Weekly Ops Review",         when: "Yesterday" },
  { category: "Recent",   name: "Incentive Reconciliation",  when: "2d ago"  },
];

const REPORTS = [
  // Operations
  { id: "morn-brief", category: "Operations", name: "Morning Briefings",
    desc: "Daily operational briefing with prior-day performance, revenue, and member data.",
    cadence: "Daily", fresh: "ok", age: "6h ago", pinned: true },
  { id: "weekly-ops", category: "Operations", name: "Weekly Operations",
    desc: "Comprehensive weekly operational performance across all sites.",
    cadence: "Weekly", fresh: "ok", age: "2d ago", pinned: false },
  { id: "hourly-audit", category: "Operations", name: "Weekly Hourly Task Audit",
    desc: "Hourly task inspection and completion rates; exceptions and risk analysis.",
    cadence: "Weekly", fresh: "ok", age: "2d ago", pinned: false },
  { id: "coupon", category: "Operations", name: "Coupon Reports",
    desc: "Coupon redemption analysis — usage rates, revenue impact, campaign effectiveness.",
    cadence: "Daily", fresh: "ok", age: "2h ago", pinned: false },
  { id: "expense", category: "Operations", name: "Expense Reports",
    desc: "Daily line-item expense analysis — variances, suspicious charges, budget utilization.",
    cadence: "Daily", fresh: "ok", age: "4h ago", pinned: false },
  { id: "member-health", category: "Operations", name: "Member Health",
    desc: "Daily subscriber health scoring — churn risk, freeze rates, retention signal trends.",
    cadence: "Daily", fresh: "ok", age: "1h ago", pinned: true },

  // Strategy
  { id: "ceo", category: "Strategy", name: "CEO Insights",
    desc: "Executive dashboard with strategic performance analysis, churn, and growth metrics.",
    cadence: "Weekly", fresh: "ok", age: "1d ago", pinned: false },
  { id: "competitive", category: "Strategy", name: "Competitive Briefings",
    desc: "Weekly competitive intelligence — Mister Car Wash, Quick Quack, ClubWave, Tommy's Corporate, and industry trends.",
    cadence: "Weekly", fresh: "ok", age: "3d ago", pinned: false },
  { id: "monthly", category: "Strategy", name: "Monthly Reports",
    desc: "Monthly aggregate performance summaries and trend analysis.",
    cadence: "Monthly", fresh: "ok", age: "10d ago", pinned: false },
  { id: "incentive", category: "Strategy", name: "Incentive Reconciliation",
    desc: "Monthly reconciliation of planned incentive commitments, actuals paid, and true-up vs forecasted value.",
    cadence: "Monthly", fresh: "ok", age: "12d ago", pinned: false },
  { id: "marketing", category: "Strategy", name: "Marketing Reports",
    desc: "Test platform performance — reviews, GBP insights, and competitive positioning.",
    cadence: "Weekly", fresh: "ok", age: "3d ago", pinned: false },
  { id: "saratoga", category: "Strategy", name: "Saratoga Springs",
    desc: "Site-specific reports for UT426 — weather, wash data, local metrics.",
    cadence: "Utility", fresh: "warn", age: "34h ago", pinned: false },

  // Forecasting
  { id: "sales-rpt", category: "Forecasting", name: "Sales Reports",
    desc: "Monthly sales composition by channel, site, and product mix.",
    cadence: "Monthly", fresh: "ok", age: "8d ago", pinned: false },
  { id: "sales-fc", category: "Forecasting", name: "Sales Forecast",
    desc: "Rolling 13-week forward sales projection with confidence bands.",
    cadence: "Weekly", fresh: "ok", age: "2d ago", pinned: false },

  // Dashboards
  { id: "pipeline", category: "Dashboards", name: "Pipeline Dashboard",
    desc: "Live pipeline of open initiatives, status, and blocking issues.",
    cadence: "Live", fresh: "ok", age: "live", pinned: false },
  { id: "financial", category: "Dashboards", name: "Financial Dashboard",
    desc: "Consolidated P&L, margin, and cash position across all sites.",
    cadence: "Live", fresh: "ok", age: "live", pinned: false },
  { id: "utility", category: "Dashboards", name: "Utility Dashboard",
    desc: "Water, electricity, and chemical usage per location with variance alerts.",
    cadence: "Live", fresh: "ok", age: "live", pinned: false },

  // AI & Science
  { id: "ai-digest", category: "AI & Science", name: "AI Daily Digest",
    desc: "Auto-summarized anomalies and opportunities across all live feeds.",
    cadence: "Daily", fresh: "ok", age: "30m ago", pinned: true },
  { id: "industry", category: "AI & Science", name: "Industry Briefings",
    desc: "Weekly scan of industry research, regulatory notes, and technology shifts.",
    cadence: "Weekly", fresh: "ok", age: "4d ago", pinned: false },
];

const SIDEBAR_SECTIONS = [
  {
    label: "Navigate",
    items: [
      { id: "today",   label: "Today",    icon: "home" },
      { id: "pacing",  label: "Pacing",   icon: "pulse" },
      { id: "library", label: "Library",  icon: "grid" },
    ],
  },
  {
    label: "Pinned",
    items: [
      { id: "morn-brief",  label: "Morning Briefings", icon: "dot" },
      { id: "member-health", label: "Member Health",  icon: "dot" },
      { id: "ai-digest",   label: "AI Daily Digest",  icon: "dot" },
    ],
  },
];

Object.assign(window, {
  LOCATIONS, STATUS_GROUPS, ATTENTION, QUICK_ACCESS, REPORTS, SIDEBAR_SECTIONS,
});
