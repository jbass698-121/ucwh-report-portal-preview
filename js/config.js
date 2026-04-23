// ============================================================
// config.js — constants + mutable state + Supabase init
// ============================================================
// Load first. Everything else (auth.js, folders.js, navigation.js,
// dashboards.js, app.js) depends on the globals declared here.
//
// All `let` state remains top-level (global scope) so the modules
// that split out of index.html can read/write without a namespace
// rewrite. This mirrors Phase 1 semantics exactly.
// ============================================================

// ─── SUPABASE ─────────────────────────────────────────────────
const SUPABASE_URL = 'https://cvmexkjdadiseccaavzr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2bWV4a2pkYWRpc2VjY2FhdnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjY5MjksImV4cCI6MjA4ODIwMjkyOX0.nPizSXPmXQAXnJP2CfD_20Z2gSc_wR6sFE76GAn1bqM';

let supabaseClient = null;
let cloudEnabled = false;

function initSupabase() {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    cloudEnabled = true;
    console.log('Supabase connected');
  } catch(e) {
    console.error('Supabase init error:', e);
  }
}

// ─── GITHUB / REPORT CONFIG ───────────────────────────────────
const GITHUB_API = 'https://api.github.com/repos/jbass698-121/ucwh-morning-briefings/contents';
const PAGES_BASE = 'https://jbass698-121.github.io/ucwh-morning-briefings';

// Each folder has cohort (sidebar/grid grouping), taskId (maps to TASK_REGISTRY
// for freshness dot), and renderer (file-list by default; dashboard/embed/usage
// for specialized views). id + path are STABLE — do not rename; deep links and
// user folder_access arrays both depend on them.
//
// `freq` is the cadence field — values are 'Daily', 'Weekly', 'Monthly',
// 'Live', 'On-Demand', 'Admin'. Consumed by:
//   - the folder tile (rendered as the pill at the bottom of the card)
//   - cadence filter chips on the cockpit grid (folders.js)
// Keep values aligned with the Cadence chip set; adding a new cadence here
// without updating renderCadenceChips() will leave folders uncategorized.
const REPORT_FOLDERS = [
  // ─── Operations ─────────────────────────────────────────────
  {
    id: 'morning-briefings', path: 'morning-briefings', name: 'Morning Briefings',
    desc: 'Daily operational briefings with site performance, revenue, and membership data.',
    freq: 'Daily', icon: '☀️', materialIcon: 'sunny', color: 'rgba(251, 146, 60, 0.15)', iconColor: '#fb923c',
    cohort: 'Operations', renderer: 'file-list', taskId: 'morning-briefing'
  },
  {
    id: 'weekly-reports', path: 'weekly-reports', name: 'Weekly Operations',
    desc: 'Comprehensive weekly operational reports across all sites.',
    freq: 'Weekly', icon: '📋', materialIcon: 'hub', color: 'rgba(34, 197, 94, 0.15)', iconColor: '#22c55e',
    cohort: 'Operations', renderer: 'file-list', taskId: 'weekly-report'
  },
  {
    id: 'hourly-reports', path: 'hourly-reports', name: 'Weekly Hourly Task Audit',
    desc: 'Weekly hourly task inspection audit — completion rates, expiration streaks, and risk analysis.',
    freq: 'Weekly', icon: '⏰', materialIcon: 'timer', color: 'rgba(251, 146, 60, 0.15)', iconColor: '#f97316',
    cohort: 'Operations', renderer: 'file-list', taskId: 'hourly-inspection'
  },
  {
    id: 'coupon-reports', path: 'coupon-reports', name: 'Coupon Reports',
    desc: 'Coupon redemption analysis — usage rates, revenue impact, and campaign effectiveness.',
    freq: 'Daily', icon: '🏷️', materialIcon: 'local_offer', color: 'rgba(245, 158, 11, 0.15)', iconColor: '#f59e0b',
    cohort: 'Operations', renderer: 'file-list', taskId: 'coupon-report'
  },
  {
    id: 'expense-reports', path: 'expense-reports', name: 'Expense Reports',
    desc: 'Daily Ramp expense analysis — violations, suspicious charges, budget utilization, and month-over-month trends.',
    freq: 'Daily', icon: '💳', materialIcon: 'credit_score', color: 'rgba(239, 68, 68, 0.15)', iconColor: '#ef4444',
    cohort: 'Operations', renderer: 'file-list', taskId: null
  },
  {
    id: 'member-health', path: 'member-health', name: 'Member Health',
    desc: 'Daily subscriber health scoring — churn risk, freeze rates, and retention signal trends.',
    freq: 'Daily', icon: '❤️', materialIcon: 'favorite', color: 'rgba(244, 63, 94, 0.15)', iconColor: '#f43f5e',
    cohort: 'Operations', renderer: 'file-list', taskId: 'member-health'
  },

  // ─── Strategy ───────────────────────────────────────────────
  {
    id: 'ceo-insights', path: 'ceo-insights', name: 'CEO Insights',
    desc: 'Executive dashboard with strategic performance analysis, churn, and growth metrics.',
    freq: 'Weekly', icon: '📈', materialIcon: 'auto_graph', color: 'rgba(59, 130, 246, 0.15)', iconColor: '#3b82f6',
    cohort: 'Strategy', renderer: 'file-list', taskId: 'ceo-insights'
  },
  {
    id: 'competitive-briefings', path: 'competitive-briefings', name: 'Competitive Briefings',
    desc: 'Weekly competitive intelligence — Mister Car Wash, Quick Quack, BlueWave, Tommy\'s Corporate, and industry trends.',
    freq: 'Weekly', icon: '🏆', materialIcon: 'radar', color: 'rgba(239, 68, 68, 0.15)', iconColor: '#ef4444',
    cohort: 'Strategy', renderer: 'file-list', taskId: 'competitive-briefing'
  },
  {
    id: 'monthly-reports', path: 'monthly-reports', name: 'Monthly Reports',
    desc: 'Monthly aggregate performance summaries and trend analysis.',
    freq: 'Monthly', icon: '📅', materialIcon: 'calendar_month', color: 'rgba(167, 139, 250, 0.15)', iconColor: '#a78bfa',
    cohort: 'Strategy', renderer: 'file-list', taskId: 'monthly-report'
  },
  {
    id: 'incentive-reconciliation', path: 'incentive-reconciliation', name: 'Incentive Reconciliation',
    desc: 'Monthly reconciliation of planned incentive commitments (Incentive Web System) against actuals paid via iSolved — site + employee-level variance analysis.',
    freq: 'Monthly', icon: '🧾', materialIcon: 'fact_check', color: 'rgba(16, 185, 129, 0.15)', iconColor: '#10b981',
    cohort: 'Strategy', renderer: 'file-list', taskId: 'incentive-reconciliation'
  },
  {
    id: 'marketing-reports', path: 'marketing-reports', name: 'Marketing Reports',
    desc: 'Yext platform performance — reviews, GBP analytics, and competitive positioning.',
    freq: 'Weekly', icon: '📢', materialIcon: 'campaign', color: 'rgba(251, 113, 133, 0.15)', iconColor: '#fb7185',
    cohort: 'Strategy', renderer: 'file-list', taskId: 'marketing-report'
  },
  {
    id: 'saratoga-reports', path: 'saratoga-reports', name: 'Saratoga Springs',
    desc: 'Site-specific reports for UT426 Saratoga Springs — city wash data and local metrics.',
    freq: 'Monthly', icon: '🏔️', materialIcon: 'location_city', color: 'rgba(167, 139, 250, 0.15)', iconColor: '#a78bfa',
    cohort: 'Strategy', renderer: 'file-list', taskId: null
  },

  // ─── Forecasting ────────────────────────────────────────────
  {
    id: 'sales-reports', path: 'sales-reports', name: 'Sales Reports',
    desc: 'Weekly and monthly sales performance reports across all sites.',
    freq: 'Weekly', icon: '💰', materialIcon: 'point_of_sale', color: 'rgba(34, 197, 94, 0.15)', iconColor: '#22c55e',
    cohort: 'Forecasting', renderer: 'file-list', taskId: 'sales-report'
  },
  {
    id: 'sales-forecast', path: 'sales-forecast', name: 'Sales Forecast',
    desc: 'Monthly revenue and wash volume forecast — subscriber-driven model with seasonal and pollen adjustments.',
    freq: 'Monthly', icon: '🔮', materialIcon: 'auto_awesome', color: 'rgba(139, 92, 246, 0.15)', iconColor: '#8b5cf6',
    cohort: 'Forecasting', renderer: 'file-list', taskId: 'wash-forecast'
  },

  // ─── Dashboards ─────────────────────────────────────────────
  {
    id: 'dashboard', path: 'dashboard', name: 'Pipeline Dashboard',
    desc: 'Task status monitor — schedule, run history, health checks, and manual triggers for all automated tasks.',
    freq: 'Live', icon: '🔧', materialIcon: 'monitoring', color: 'rgba(99, 102, 241, 0.15)', iconColor: '#6366f1',
    cohort: 'Dashboards', renderer: 'pipeline-dashboard', taskId: null
  },
  {
    id: 'financial-dashboard', path: 'financial-dashboard', name: 'Financial Dashboard',
    desc: 'Consolidated P&L + Balance Sheet intelligence — revenue, NOI, cash position, FDD-benchmark gaps, per-site trend analysis, and AI-flagged insights across all entities.',
    freq: 'On-Demand', icon: '📊', materialIcon: 'account_balance_wallet', color: 'rgba(16, 185, 129, 0.15)', iconColor: '#10b981',
    cohort: 'Dashboards', renderer: 'file-list', taskId: 'financial-dashboard'
  },
  {
    id: 'utility-dashboard', path: 'utility-dashboard', name: 'Utility Dashboard',
    desc: 'Fleet utility bill analysis — drill from fleet to site to utility type to individual month. Electric, gas, water, trash across all 3 sites.',
    freq: 'On-Demand', icon: '⚡', materialIcon: 'electric_bolt', color: 'rgba(245, 158, 11, 0.15)', iconColor: '#f59e0b',
    cohort: 'Dashboards', renderer: 'file-list', taskId: null
  },

  // ─── Intelligence ───────────────────────────────────────────
  {
    id: 'ai-daily-digest', path: 'ai-daily-digest', name: 'AI Daily Digest',
    desc: 'Curated AI news — model releases, agent updates, funding, and industry signals.',
    freq: 'Daily', icon: '🤖', materialIcon: 'psychology', color: 'rgba(34, 211, 238, 0.15)', iconColor: '#22d3ee',
    cohort: 'Intelligence', renderer: 'file-list', taskId: 'ai-digest'
  },
  {
    id: 'industry-briefing', path: 'industry-briefing', name: 'Industry Briefing',
    desc: 'Daily car wash industry trends — technology, equipment, regulation, consolidation, and market intelligence.',
    freq: 'Daily', icon: '🏭', materialIcon: 'factory', color: 'rgba(6, 182, 212, 0.15)', iconColor: '#06b6d4',
    cohort: 'Intelligence', renderer: 'file-list', taskId: 'industry-briefing'
  },
  {
    id: 'world-news', path: 'world-news', name: 'World News Briefing',
    desc: 'Daily executive world news summary — markets, geopolitics, business, and technology.',
    freq: 'Daily', icon: '🌍', materialIcon: 'public', color: 'rgba(14, 165, 233, 0.15)', iconColor: '#0ea5e9',
    cohort: 'Intelligence', renderer: 'file-list', taskId: null
  },

  // ─── Admin (adminOnly:true — never surfaced to viewers) ─────
  {
    id: 'capital-requests', path: '', name: 'Capital Draw Requests',
    desc: 'Submit and track Class B capital draw requests. Notifications sent to partners automatically.',
    freq: 'Admin', icon: '🏦', materialIcon: 'account_balance', color: 'rgba(128, 90, 213, 0.15)', iconColor: '#805ad5',
    cohort: 'Admin', renderer: 'jotform', taskId: null, adminOnly: true
  },
  {
    id: 'usage-report', path: '', name: 'Usage Report',
    desc: 'Portal usage analytics — who is using which reports, how often, and where the adoption gaps are.',
    freq: 'Admin', icon: '📡', materialIcon: 'analytics', color: 'rgba(128, 90, 213, 0.15)', iconColor: '#805ad5',
    cohort: 'Admin', renderer: 'usage', taskId: null, adminOnly: true
  }
];

// Cohort display order — used for sidebar + cockpit grid grouping.
const FOLDER_COHORTS = ['Operations', 'Strategy', 'Forecasting', 'Dashboards', 'Intelligence', 'Admin'];

// ─── AUTH STATE ───────────────────────────────────────────────
let currentUser = null;
let userAuth = null;
let isAdmin = false;
let editingUserEmail = null;

// ─── REPORT NAVIGATION STATE ──────────────────────────────────
let currentView = 'folders';
let currentFolderId = null;

// ─── REPORT DATA STORE ────────────────────────────────────────
let allReports = [];
let activeFilter = 'all';
let heroReportData = null;

const REPORT_TYPES = {
  'morning briefing': { label: 'Briefing', color: '#fb923c', dotColor: '#fb923c' },
  'forecast accuracy': { label: 'Forecast', color: '#a78bfa', dotColor: '#a78bfa' },
  'ceo insight': { label: 'CEO', color: '#3b82f6', dotColor: '#3b82f6' },
  'weekly': { label: 'Weekly', color: '#22c55e', dotColor: '#22c55e' },
  'marketing': { label: 'Marketing', color: '#fb7185', dotColor: '#fb7185' },
  'hourly': { label: 'Hourly', color: '#f97316', dotColor: '#f97316' },
  'competitive': { label: 'Competitive', color: '#ef4444', dotColor: '#ef4444' },
  'ai daily': { label: 'AI Digest', color: '#22d3ee', dotColor: '#22d3ee' },
  'monthly': { label: 'Monthly', color: '#a78bfa', dotColor: '#a78bfa' },
};

// ─── TASK REGISTRY ────────────────────────────────────────────
// Sync target: CLAUDE.md "TASK INVENTORY — 23 ACTIVE TASKS".
// When adding or removing a task, update both here and in CLAUDE.md.
// `id` values are the canonical task IDs written by orchestrators to the
// Supabase `task_runs` table; renaming one desynchronizes the dashboard.
const TASK_REGISTRY = [
  // Tier 1 — Data Acquisition
  { id: 'daily-data-pull',      num: 1,  name: 'Daily Data Pull',            tier: 'Data',    freq: 'Daily',   cron: '6:00 AM' },
  { id: 'weekly-data-pull',     num: 2,  name: 'Weekly Data Collector',      tier: 'Data',    freq: 'Sundays', cron: '12:00 AM' },

  // Tier 2 — Daily Reports
  { id: 'morning-briefing',     num: 4,  name: 'Morning Briefing',           tier: 'Daily',   freq: 'Daily',   cron: '7:00 AM' },
  { id: 'coupon-report',        num: 5,  name: 'Daily Coupon Report',        tier: 'Daily',   freq: 'Daily',   cron: '7:15 AM' },
  { id: 'ai-digest',            num: 6,  name: 'Daily AI Digest',            tier: 'Daily',   freq: 'Daily',   cron: '4:30 AM' },
  { id: 'industry-briefing',    num: 21, name: 'Car Wash Industry Briefing', tier: 'Daily',   freq: 'Daily',   cron: '5:30 AM' },
  { id: 'member-health',        num: 22, name: 'Member Health Report',       tier: 'Daily',   freq: 'Daily',   cron: '7:30 AM' },

  // Tier 3 — Weekly (Sunday)
  { id: 'weekly-report',        num: 7,  name: 'Weekly Operations Report',   tier: 'Weekly',  freq: 'Sundays', cron: '8:00 AM' },
  { id: 'hourly-inspection',    num: 8,  name: 'Hourly Task Audit',          tier: 'Weekly',  freq: 'Sundays', cron: '5:30 AM' },
  { id: 'sales-report',         num: 9,  name: 'Weekly Sales Report',        tier: 'Weekly',  freq: 'Sundays', cron: '8:00 PM' },
  { id: 'wash-forecast',        num: 10, name: 'Wash Forecast',              tier: 'Weekly',  freq: 'On-demand', cron: 'Manual' },

  // Tier 4 — Weekly (Monday)
  { id: 'marketing-report',     num: 11, name: 'Marketing Report',           tier: 'Monday',  freq: 'Mondays', cron: '7:11 AM' },
  { id: 'ceo-insights',         num: 12, name: 'CEO Insights',               tier: 'Monday',  freq: 'Mondays', cron: '7:01 AM' },
  { id: 'competitive-briefing', num: 13, name: 'Competitive Briefing',       tier: 'Monday',  freq: 'Mondays', cron: '4:00 AM' },

  // Tier 5 — Monthly
  { id: 'monthly-report',       num: 14, name: 'Monthly Operations Report',  tier: 'Monthly', freq: '1st',     cron: '8:00 AM' },
  { id: 'incentive-data-push',  num: 15, name: 'Incentive Data Push',        tier: 'Monthly', freq: '2nd',     cron: '9:00 AM' },
  { id: 'incentive-reconciliation', num: 25, name: 'Incentive Reconciliation', tier: 'Monthly', freq: '1st pay period', cron: 'Manual' },

  // Tier 6 — Utility
  { id: 'nightly-optimizer',    num: 16, name: 'Nightly Index Optimizer',    tier: 'Utility', freq: 'Daily',   cron: '12:00 AM' },
  { id: 'weekly-backup',        num: 19, name: 'Weekly System Backup',       tier: 'Utility', freq: 'Sundays', cron: '11:00 PM' },
  { id: 'daily-backup',         num: 20, name: 'Daily Incremental Backup',   tier: 'Utility', freq: 'Daily',   cron: '12:15 AM' },
  { id: 'visual-qa',            num: 23, name: 'Visual QA Auto-Correct',     tier: 'Utility', freq: 'Daily',   cron: '8:00 AM' },
  { id: 'financial-dashboard',  num: 24, name: 'Financial Dashboard',        tier: 'Utility', freq: 'On-demand', cron: 'Manual' },
];

// ─── GLOBAL SEARCH CACHE ──────────────────────────────────────
const GS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const GS_CACHE_KEY = 'ucwh_portal_gs_listings_v1';
let _gsDebounceTimer = null;

// ─── COCKPIT CACHE ────────────────────────────────────────────
// task_runs for the session so the cockpit + Pipeline Dashboard
// share a single round-trip per page load.
let _taskRunsCache = null;

// ─── IN-FOLDER SEARCH DEBOUNCE ────────────────────────────────
let _filterSearchLogTimer = null;
