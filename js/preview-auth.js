// ============================================================
// preview-auth.js — React-friendly auth wrapper for preview portal
// ============================================================
// Depends on: config.js (SUPABASE_URL, SUPABASE_ANON_KEY, supabaseClient,
//             initSupabase, cloudEnabled, REPORT_FOLDERS) loaded by script
//             tag BEFORE this file.
//
// This file DOES NOT replicate prod `js/auth.js` — that file is DOM-heavy
// (document.getElementById calls for loginScreen / mainApp / etc.) and
// incompatible with React's reconciliation. Preview builds its own minimal
// auth surface and lets React own the DOM.
//
// Exports a single global: `window.PreviewAuth`.
//
// API:
//   PreviewAuth.init()                       → initializes Supabase client
//   PreviewAuth.isDevMode()                  → bool; true if ?dev=1 OR
//                                              localStorage.__preview_dev__
//   PreviewAuth.devUser()                    → fake user for DEV_MODE
//   PreviewAuth.getSession()                 → Promise<Session | null>
//   PreviewAuth.signInWithGoogle()           → Promise<void>
//   PreviewAuth.signOut()                    → Promise<void>
//   PreviewAuth.getUserAuth(email)           → Promise<UserAuth | null>
//   PreviewAuth.onAuthStateChange(callback)  → unsubscribe fn
//   PreviewAuth.isAdmin(userAuth)            → bool
//   PreviewAuth.allFolderIds()               → string[] (from REPORT_FOLDERS)
// ============================================================

(function () {
  const LS_DEV_KEY = "__preview_dev__";
  const LS_DEV_ROLE = "__preview_dev_role__"; // 'admin' (default) | 'viewer'

  function isDevMode() {
    // Default polarity: DEV_MODE ON. Rationale — until the Supabase redirect
    // URL allowlist is updated (STATUS.md Deferral #3), Google sign-in from
    // the preview origin falls back to the project's site_url (the UCWH
    // Incentive Calculator) and never returns to the portal. Dev-mode-default
    // keeps the naked preview URL usable. Pass ?dev=0 to force the real
    // sign-in flow once Deferral #3 is resolved.
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "0") return false;
      if (params.get("dev") === "1") return true;
      if (localStorage.getItem(LS_DEV_KEY) === "0") return false;
      return true; // default ON for preview
    } catch (_) {
      return true;
    }
  }

  function devRole() {
    try {
      const params = new URLSearchParams(window.location.search);
      const qp = params.get("role");
      if (qp === "admin" || qp === "viewer") return qp;
      const ls = localStorage.getItem(LS_DEV_ROLE);
      if (ls === "admin" || ls === "viewer") return ls;
    } catch (_) {}
    return "admin";
  }

  function allFolderIds() {
    if (typeof REPORT_FOLDERS === "undefined") return [];
    return REPORT_FOLDERS.map(function (f) {
      return f.id;
    });
  }

  function devUser() {
    const role = devRole();
    return {
      email: "dev@preview.local",
      display_name: "Preview Dev (" + role + ")",
      avatar_url: null,
      role: role,
      // Admins see everything; viewers get the non-admin cohorts only
      folder_access:
        role === "admin"
          ? allFolderIds()
          : allFolderIds().filter(function (id) {
              // Exclude admin-only folders. Admin-only marker lives in
              // REPORT_FOLDERS entries (adminOnly:true). Skip those for viewer.
              const f = REPORT_FOLDERS.find(function (x) {
                return x.id === id;
              });
              return !(f && f.adminOnly);
            }),
      __is_dev: true,
    };
  }

  function init() {
    if (typeof initSupabase !== "function") {
      console.warn("[PreviewAuth] initSupabase not found — config.js not loaded?");
      return;
    }
    // Guard: only init once
    if (!supabaseClient) {
      initSupabase();
    }
  }

  async function getSession() {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.error("[PreviewAuth] getSession error:", error);
        return null;
      }
      return data.session || null;
    } catch (e) {
      console.error("[PreviewAuth] getSession exception:", e);
      return null;
    }
  }

  async function signInWithGoogle() {
    if (!supabaseClient) {
      throw new Error("Supabase client not initialized");
    }
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo },
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!supabaseClient) return;
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.warn("[PreviewAuth] signOut exception:", e);
    }
  }

  async function getUserAuth(email) {
    if (!supabaseClient || !email) return null;
    try {
      const { data, error } = await supabaseClient
        .from("report_portal_users")
        .select("email, role, display_name, folder_access")
        .eq("email", String(email).toLowerCase())
        .single();
      if (error) {
        // "PGRST116" = no rows; treat as "not on allowlist", not as an error
        if (error.code !== "PGRST116") console.warn("[PreviewAuth] getUserAuth error:", error);
        return null;
      }
      return data || null;
    } catch (e) {
      console.warn("[PreviewAuth] getUserAuth exception:", e);
      return null;
    }
  }

  function onAuthStateChange(cb) {
    if (!supabaseClient) return function noop() {};
    const { data } = supabaseClient.auth.onAuthStateChange(function (_event, session) {
      try {
        cb(session);
      } catch (e) {
        console.error("[PreviewAuth] onAuthStateChange callback threw:", e);
      }
    });
    return function unsubscribe() {
      try {
        data.subscription.unsubscribe();
      } catch (_) {}
    };
  }

  function isAdmin(userAuth) {
    return !!(userAuth && userAuth.role === "admin");
  }

  window.PreviewAuth = {
    init: init,
    isDevMode: isDevMode,
    devUser: devUser,
    getSession: getSession,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    getUserAuth: getUserAuth,
    onAuthStateChange: onAuthStateChange,
    isAdmin: isAdmin,
    allFolderIds: allFolderIds,
  };
})();
