// Icon set — simple stroked icons
const Icon = ({name, size = 16, style}) => {
  const s = size;
  const p = {width: s, height: s, viewBox: "0 0 20 20", fill: "none",
    stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round",
    style: style};
  switch (name) {
    case "home":   return <svg {...p}><path d="M3 10l7-6 7 6v7a1 1 0 01-1 1h-3v-5H7v5H4a1 1 0 01-1-1z"/></svg>;
    case "pulse":  return <svg {...p}><path d="M2 10h4l2-6 3 12 2-8 2 4h3"/></svg>;
    case "grid":   return <svg {...p}><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></svg>;
    case "search": return <svg {...p}><circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/></svg>;
    case "bell":   return <svg {...p}><path d="M5 8a5 5 0 0110 0v4l1.5 2h-13L5 12V8z"/><path d="M8 17a2 2 0 004 0"/></svg>;
    case "settings": return <svg {...p}><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"/></svg>;
    case "chevR":  return <svg {...p}><path d="M8 5l5 5-5 5"/></svg>;
    case "star":   return <svg {...p} fill="currentColor" stroke="none"><path d="M10 2l2.4 5 5.6.6-4.2 3.8 1.2 5.6L10 14.2 5 17l1.2-5.6L2 7.6l5.6-.6z" opacity="0.25"/></svg>;
    case "starF":  return <svg {...p} fill="currentColor" stroke="none"><path d="M10 2l2.4 5 5.6.6-4.2 3.8 1.2 5.6L10 14.2 5 17l1.2-5.6L2 7.6l5.6-.6z"/></svg>;
    case "more":   return <svg {...p}><circle cx="5" cy="10" r="1" fill="currentColor"/><circle cx="10" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>;
    case "open":   return <svg {...p}><path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-3M12 3h5v5M8 12L17 3"/></svg>;
    case "arrowUp":   return <svg {...p}><path d="M10 16V4M5 9l5-5 5 5"/></svg>;
    case "arrowDown": return <svg {...p}><path d="M10 4v12M5 11l5 5 5-5"/></svg>;
    case "dash":   return <svg {...p}><path d="M5 10h10"/></svg>;
    case "dot":    return <svg {...p}><circle cx="10" cy="10" r="2" fill="currentColor"/></svg>;
    case "close":  return <svg {...p}><path d="M5 5l10 10M15 5l-10 10"/></svg>;
    case "filter": return <svg {...p}><path d="M3 5h14M6 10h8M9 15h2"/></svg>;
    case "sliders": return <svg {...p}><path d="M4 6h12M4 10h12M4 14h12"/><circle cx="8" cy="6" r="1.5" fill="var(--bg)"/><circle cx="12" cy="10" r="1.5" fill="var(--bg)"/><circle cx="6" cy="14" r="1.5" fill="var(--bg)"/></svg>;
    case "check":  return <svg {...p}><path d="M4 10l4 4 8-8"/></svg>;
    case "plus":   return <svg {...p}><path d="M10 4v12M4 10h12"/></svg>;
    default:       return <svg {...p}><circle cx="10" cy="10" r="1.5" fill="currentColor"/></svg>;
  }
};

// Delta chip
const Delta = ({value, size = "md"}) => {
  const pos = value > 0;
  const neg = value < 0;
  const zero = value === 0;
  const cls = zero ? "neu" : pos ? "pos" : "neg";
  const icon = zero ? "dash" : pos ? "arrowUp" : "arrowDown";
  const abs = Math.abs(value);
  const txt = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return (
    <span className={`metric-delta ${cls}`}>
      <Icon name={icon} size={10}/> {txt}%
    </span>
  );
};

const DeltaChip = ({value}) => {
  const pos = value > 0;
  const neg = value < 0;
  const cls = value === 0 ? "neu" : pos ? "pos" : "neg";
  const icon = value === 0 ? "dash" : pos ? "arrowUp" : "arrowDown";
  const abs = Math.abs(value);
  const txt = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return (
    <span className={`delta ${cls}`}>
      <Icon name={icon} size={10}/> {txt}%
    </span>
  );
};

// Sparkbar
const SparkBar = ({data}) => {
  const max = Math.max(...data);
  return (
    <div className="pace-sparkbar">
      {data.map((v, i) => (
        <div key={i}
             className={`bar ${v/max > 0.65 ? "hi" : ""}`}
             style={{height: `${(v/max) * 100}%`}} />
      ))}
    </div>
  );
};

// Status dot
const StatusDot = ({status}) => {
  const cls = status === "warn" ? "warn"
    : status === "neg" ? "neg"
    : status === "gray" ? "gray"
    : "";
  return <span className={`status-dot ${cls}`} />;
};

// Sidebar
const Sidebar = ({active, onNav, user, onSignOut}) => {
  // user shape: { email, display_name, role, avatar_url?, __is_dev? }
  const name = (user && user.display_name) || "Signed out";
  const role = (user && user.role) ? (user.role === "admin" ? "Admin" : "Viewer") : "—";
  const initials = (function() {
    if (!name || name === "Signed out") return "?";
    const parts = String(name).split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  })();

  return (
    <aside className="side">
      <div className="side-logo">
        <div className="side-logo-mark">R</div>
        <span className="side-logo-label">Report Portal</span>
      </div>

      {SIDEBAR_SECTIONS.map((sec, si) => (
        <div key={si} className="side-section">
          <div className="side-label">{sec.label}</div>
          {sec.items.map(item => (
            <div
              key={item.id}
              className="side-item"
              data-active={active === item.id}
              onClick={() => onNav(item.id)}
            >
              <span className="side-item-icon"><Icon name={item.icon} size={16}/></span>
              <span className="side-item-label">{item.label}</span>
            </div>
          ))}
        </div>
      ))}

      <div className="side-foot" title={user && user.email ? user.email : ""}>
        {user && user.avatar_url
          ? <img className="avatar" src={user.avatar_url} alt="" style={{borderRadius:"50%",objectFit:"cover"}}/>
          : <div className="avatar">{initials}</div>
        }
        <div className="side-foot-meta">
          <span className="side-foot-name">{name}{user && user.__is_dev ? " (dev)" : ""}</span>
          <span className="side-foot-role">{role}</span>
        </div>
        {user && onSignOut && !user.__is_dev && (
          <button
            className="icon-btn"
            title="Sign out"
            onClick={onSignOut}
            style={{marginLeft:"auto", width:28, height:28}}
          >
            <Icon name="close" size={14}/>
          </button>
        )}
      </div>
    </aside>
  );
};

// Topbar
const TopBar = ({crumbs, onSearchFocus}) => {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            {i === crumbs.length - 1 ? <strong>{c}</strong> : <span>{c}</span>}
          </React.Fragment>
        ))}
      </div>

      {window.TWEAKS.showSearch && (
        <div className="search" onClick={e => e.currentTarget.querySelector('input').focus()}>
          <Icon name="search" size={14}/>
          <input placeholder="Search reports, locations, people…" />
          <kbd>⌘K</kbd>
        </div>
      )}

      <div className="top-actions">
        <button className="icon-btn" title="Notifications">
          <Icon name="bell" size={16}/>
          <span className="dot"/>
        </button>
        <button className="icon-btn" title="Settings">
          <Icon name="settings" size={16}/>
        </button>
      </div>
    </div>
  );
};

// Tabs
const Tabs = ({active, onChange, tabs}) => {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className="tab"
          data-active={active === t.id}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
};

Object.assign(window, { Icon, Delta, DeltaChip, SparkBar, StatusDot, Sidebar, TopBar, Tabs });
