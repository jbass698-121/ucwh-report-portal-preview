const {useState, useEffect, useCallback} = React;

// ======== Tweaks panel ========
const TweaksPanel = ({open, onClose, values, onChange}) => {
  if (!open) return null;

  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <strong>Tweaks</strong>
        <button className="icon-btn" style={{width:28, height:28}} onClick={onClose}>
          <Icon name="close" size={14}/>
        </button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <span className="tweak-label">Accent</span>
          <div className="accent-swatches">
            {[
              ["evergreen", "oklch(52% 0.12 155)"],
              ["cobalt",    "oklch(52% 0.14 255)"],
              ["terracotta","oklch(58% 0.14 40)"],
              ["plum",      "oklch(48% 0.14 330)"],
            ].map(([id, col]) => (
              <button key={id}
                className="accent-swatch"
                style={{background: col}}
                data-active={values.accent === id}
                onClick={() => onChange({accent: id})}
              />
            ))}
          </div>
        </div>

        <div className="tweak-row">
          <span className="tweak-label">Density</span>
          <div className="tweak-options">
            {["comfortable","compact"].map(v => (
              <button key={v} className="tweak-opt" data-active={values.density === v}
                onClick={() => onChange({density: v})}>{v}</button>
            ))}
          </div>
        </div>

        <div className="tweak-row">
          <span className="tweak-label">Landing layout</span>
          <div className="tweak-options">
            {["split","stacked"].map(v => (
              <button key={v} className="tweak-opt" data-active={values.landingLayout === v}
                onClick={() => onChange({landingLayout: v})}>{v}</button>
            ))}
          </div>
        </div>

        <div className="tweak-row">
          <span className="tweak-label">Sidebar</span>
          <div className="tweak-options">
            {["full","rail"].map(v => (
              <button key={v} className="tweak-opt" data-active={values.sidebarStyle === v}
                onClick={() => onChange({sidebarStyle: v})}>{v}</button>
            ))}
          </div>
        </div>

        <div className="tweak-row">
          <span className="tweak-label">Search in topbar</span>
          <div className="tweak-options">
            {[["Show", true],["Hide", false]].map(([lbl, v]) => (
              <button key={lbl} className="tweak-opt" data-active={values.showSearch === v}
                onClick={() => onChange({showSearch: v})}>{lbl}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ======== App ========
const App = ({user, onSignOut, liveData, liveStatus}) => {
  const [route, setRoute] = useState(() => localStorage.getItem('rp_route') || 'today');
  const [tweaks, setTweaks] = useState(window.TWEAKS);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaksEnabled, setTweaksEnabled] = useState(false);

  // Prefer live Supabase reads when present; fall back to fixtures in data.jsx.
  const locations = (liveData && liveData.locations) || window.LOCATIONS;
  const statusGroups = (liveData && liveData.statusGroups) || window.STATUS_GROUPS;
  const attention = (liveData && liveData.attention) || window.ATTENTION;
  const asOf = (liveData && liveData.asOf) || null;
  const latestByTaskId = (liveData && liveData.latestByTaskId) || {};

  useEffect(() => {
    localStorage.setItem('rp_route', route);
  }, [route]);

  // Apply tweaks to body attrs
  useEffect(() => {
    document.body.setAttribute('data-accent', tweaks.accent);
    document.body.setAttribute('data-density', tweaks.density);
    document.body.setAttribute('data-layout', tweaks.landingLayout);
    document.body.setAttribute('data-sidebar', tweaks.sidebarStyle);
  }, [tweaks]);

  // Edit mode handshake — register listener FIRST, then announce
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksEnabled(true);
      if (e.data?.type === '__deactivate_edit_mode') { setTweaksEnabled(false); setTweaksOpen(false); }
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({type: '__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const updateTweak = (partial) => {
    setTweaks(t => {
      const next = {...t, ...partial};
      window.parent.postMessage({type: '__edit_mode_set_keys', edits: partial}, '*');
      return next;
    });
  };

  const onOpenReport = (name) => {
    // toast feel — just flash a tiny alert-style note
    const el = document.createElement('div');
    el.textContent = `→ Opening: ${name}`;
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: 'var(--bg)', padding: '10px 16px',
      borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-sans)',
      zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      transition: 'opacity 0.3s', letterSpacing: '-0.005em',
    });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = 0; }, 1600);
    setTimeout(() => el.remove(), 2000);
  };

  const crumbs = {
    today:   ["Report Portal", "Today"],
    pacing:  ["Report Portal", "Pacing"],
    library: ["Report Portal", "Library"],
  }[route];

  // Library tab count = visible folders for this user (cohort-filtered by role)
  const libraryCount = (window.PreviewLibrary
    ? window.PreviewLibrary.getVisibleFolders(user).length
    : 0);

  const tabs = [
    {id: "today",   label: "Today"},
    {id: "pacing",  label: "Pacing"},
    {id: "library", label: "Library", count: libraryCount},
  ];

  return (
    <div className="shell" data-screen-label={`01 ${route}`}>
      <Sidebar active={route} onNav={setRoute} user={user} onSignOut={onSignOut}/>
      <div className="main">
        <TopBar crumbs={crumbs}/>
        <Tabs active={route} onChange={setRoute} tabs={tabs}/>

        {route === 'today'   && <TodayView onOpenReport={onOpenReport} setRoute={setRoute} user={user}
                                           locations={locations} statusGroups={statusGroups}
                                           attention={attention} asOf={asOf} liveStatus={liveStatus}/>}
        {route === 'pacing'  && <PacingView user={user} locations={locations} asOf={asOf}/>}
        {route === 'library' && <LibraryView onOpenReport={onOpenReport} user={user} latestByTaskId={latestByTaskId}/>}
      </div>

      {tweaksEnabled && !tweaksOpen && (
        <button className="tweaks-fab" onClick={() => setTweaksOpen(true)}>
          <Icon name="sliders" size={18}/>
        </button>
      )}
      {tweaksEnabled && (
        <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)}
                     values={tweaks} onChange={updateTweak}/>
      )}
    </div>
  );
};

// ======== Auth gate ========
// Wraps App in a login flow. In DEV_MODE (?dev=1 OR localStorage flag) skips
// Supabase entirely and injects a fake admin user — this keeps the preview
// renderable without depending on the Supabase redirect-URL allowlist (which
// must be updated manually — see STATUS.md deferral #3).
const LoginScreen = ({onSignIn, error, loading}) => (
  <div style={{
    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    minHeight:"100vh", background:"var(--bg)", color:"var(--ink)",
    fontFamily:"var(--font-sans)", gap:"20px", padding:"24px"
  }}>
    <div style={{
      width:56, height:56, borderRadius:"12px",
      background:"oklch(52% 0.12 155)", color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"var(--font-serif)", fontSize:"28px", fontWeight:500
    }}>R</div>
    <h1 style={{fontSize:"22px", fontWeight:500, margin:0, fontFamily:"var(--font-serif)"}}>
      Report Portal — Preview
    </h1>
    <p style={{color:"var(--muted)", fontSize:"13px", margin:0, textAlign:"center", maxWidth:"380px"}}>
      Parallel staging build of the redesigned portal. Production portal is
      unchanged at <code>ucwh-report-portal.netlify.app</code>.
    </p>
    <button
      onClick={onSignIn}
      disabled={loading}
      style={{
        background:"#fff", border:"1px solid var(--line)",
        padding:"10px 18px", borderRadius:"8px", cursor:"pointer",
        fontSize:"14px", fontWeight:500, color:"var(--ink)",
        display:"flex", alignItems:"center", gap:"10px",
        boxShadow:"0 1px 2px rgba(0,0,0,0.04)",
        opacity: loading ? 0.6 : 1
      }}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
        <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.6 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#FBBC05" d="M24 44c5.1 0 9.8-2 13.3-5.1l-6.2-5.1C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3-11.3-7.9l-6.6 5C9.6 39.7 16.2 44 24 44z"/>
        <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.2 5.1C42.6 36.1 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"/>
      </svg>
      {loading ? "Signing in…" : "Sign in with Google"}
    </button>
    {error && <p style={{color:"oklch(52% 0.17 25)", fontSize:"13px", margin:0}}>{error}</p>}
    <p style={{color:"var(--muted)", fontSize:"11px", margin:0, marginTop:"12px"}}>
      No access yet? Sign in and we'll queue an access request for admin review.
      <br/>
      Or append <code>?dev=1</code> to the URL to preview without signing in.
    </p>
  </div>
);

const LoadingScreen = () => (
  <div style={{
    display:"flex", alignItems:"center", justifyContent:"center",
    minHeight:"100vh", background:"var(--bg)", color:"var(--muted)",
    fontFamily:"var(--font-sans)", fontSize:"13px"
  }}>Loading…</div>
);

const AuthGate = () => {
  const [status, setStatus] = useState("loading"); // loading | signed_out | signed_in | no_access
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [liveStatus, setLiveStatus] = useState("idle"); // idle | loading | ok | fallback

  const loadSessionUser = useCallback(async () => {
    // DEV_MODE short-circuit — no Supabase call, no network
    if (window.PreviewAuth && window.PreviewAuth.isDevMode()) {
      const du = window.PreviewAuth.devUser();
      setUser(du);
      setStatus("signed_in");
      return;
    }
    if (!window.PreviewAuth) {
      setError("Auth module failed to load. Check console for errors.");
      setStatus("signed_out");
      return;
    }
    try {
      const session = await window.PreviewAuth.getSession();
      if (!session) {
        setUser(null);
        setStatus("signed_out");
        return;
      }
      const email = session.user && session.user.email;
      if (!email) {
        setError("Sign-in succeeded but no email on the user record.");
        setStatus("signed_out");
        return;
      }
      const userAuth = await window.PreviewAuth.getUserAuth(email);
      if (!userAuth) {
        // Not on the allowlist. In prod this opens the access-request form.
        // In preview we show a simpler message since access gating lives at
        // Supabase (RLS) and at the app. For now, surface and allow a sign-out.
        setUser({
          email: email,
          display_name: session.user.user_metadata?.full_name || email.split("@")[0],
          role: "viewer",
          avatar_url: session.user.user_metadata?.avatar_url || null,
          folder_access: [],
        });
        setStatus("no_access");
        return;
      }
      const meta = session.user.user_metadata || {};
      setUser({
        email: email,
        display_name: userAuth.display_name || meta.full_name || email.split("@")[0],
        role: userAuth.role,
        avatar_url: meta.avatar_url || null,
        folder_access: userAuth.folder_access || [],
      });
      setStatus("signed_in");
    } catch (e) {
      console.error("[AuthGate] loadSessionUser error:", e);
      setError(e.message || String(e));
      setStatus("signed_out");
    }
  }, []);

  useEffect(() => {
    loadSessionUser();
    if (!window.PreviewAuth || window.PreviewAuth.isDevMode()) return;
    const unsubscribe = window.PreviewAuth.onAuthStateChange(() => {
      loadSessionUser();
    });
    return unsubscribe;
  }, [loadSessionUser]);

  // Fetch live Supabase data once we know who's signed in (including dev).
  // Never blocks the shell — AuthGate renders App before this resolves.
  // Fire preview-tagged pageview once per session, after sign-in/DEV-session
  // resolves so we can include identity.
  useEffect(() => {
    if (status !== "signed_in") return;
    try { window.PreviewTelemetry && window.PreviewTelemetry.firePortalPageview(user); } catch (_) {}
  }, [status]);

  useEffect(() => {
    if (status !== "signed_in") return;
    if (!window.PreviewData) return;
    let cancelled = false;
    setLiveStatus("loading");
    window.PreviewData.fetchLive()
      .then((d) => {
        if (cancelled) return;
        if (d) {
          setLiveData(d);
          setLiveStatus("ok");
        } else {
          setLiveStatus("fallback");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[AuthGate] fetchLive failed:", e);
        setLiveStatus("fallback");
      });
    return () => { cancelled = true; };
  }, [status]);

  const onSignIn = async () => {
    setError("");
    setLoggingIn(true);
    try {
      await window.PreviewAuth.signInWithGoogle();
      // Browser navigates to Google, then back. State recomputes via
      // onAuthStateChange after redirect.
    } catch (e) {
      console.error("[AuthGate] signIn error:", e);
      setError(e.message || String(e));
      setLoggingIn(false);
    }
  };

  const onSignOut = async () => {
    try { await window.PreviewAuth.signOut(); } catch (_) {}
    setUser(null);
    setStatus("signed_out");
  };

  if (status === "loading") return <LoadingScreen/>;

  if (status === "signed_in") {
    return <App user={user} onSignOut={onSignOut} liveData={liveData} liveStatus={liveStatus}/>;
  }

  if (status === "no_access") {
    return (
      <div style={{
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        minHeight:"100vh", background:"var(--bg)", color:"var(--ink)",
        fontFamily:"var(--font-sans)", gap:"16px", padding:"24px", textAlign:"center"
      }}>
        <h1 style={{fontSize:"18px", fontWeight:500, margin:0, fontFamily:"var(--font-serif)"}}>
          Access pending
        </h1>
        <p style={{color:"var(--muted)", fontSize:"13px", maxWidth:"420px"}}>
          Signed in as <strong>{user.email}</strong>, but this email is not on the report-portal allowlist yet.
          Contact the UCWH admin to be added, then reload.
        </p>
        <button onClick={onSignOut} style={{
          background:"transparent", border:"1px solid var(--line)",
          padding:"8px 16px", borderRadius:"6px", cursor:"pointer",
          fontSize:"13px", color:"var(--ink)"
        }}>Sign out</button>
      </div>
    );
  }

  return <LoginScreen onSignIn={onSignIn} error={error} loading={loggingIn}/>;
};

ReactDOM.createRoot(document.getElementById('root')).render(<AuthGate/>);
