// ======== Today view ========
const TodayView = ({onOpenReport, setRoute, locations, statusGroups, attention, asOf, liveStatus}) => {
  const layout = window.TWEAKS.landingLayout;

  // Fall back to fixtures if props not provided (shouldn't happen — App always
  // passes something — but keeps the view robust if someone renders it alone).
  const LOCS = locations || window.LOCATIONS;
  const GROUPS = statusGroups || window.STATUS_GROUPS;
  const ATTN = attention || window.ATTENTION;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  const timeStr = now.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});

  // Pretty "As of" from the latest metric_date in the live payload
  const asOfLabel = asOf
    ? new Date(asOf + 'T00:00:00').toLocaleDateString('en-US', {weekday:'long', month:'short', day:'numeric'})
    : dateStr;

  // Dynamic subhead: count red-status attention items
  const attnNegCount = ATTN.filter(a => a.tone === 'neg').length;

  return (
    <div className="content">
      <div className="page-head">
        <div className="page-title-group">
          <h1>Good morning, Jason.</h1>
          <div className="sub">{attnNegCount} things need your attention across {LOCS.length} locations.</div>
        </div>
        <div className="page-meta">
          <span className="live-dot"/>
          <span>{liveStatus === 'fallback' ? 'CACHED' : 'LIVE'} · {asOfLabel.toUpperCase()} · {timeStr}</span>
        </div>
      </div>

      {/* Status strip */}
      <div className="status-strip" style={{marginBottom: 24}}>
        {GROUPS.map(g => (
          <div key={g.label} className="status-cell" onClick={() => setRoute('library')}>
            <div className="status-cell-head">
              <StatusDot status={g.status}/>
              <span>{g.label}</span>
            </div>
            <div className="status-num">{g.count}</div>
            <div className="status-meta">{g.meta}</div>
          </div>
        ))}
      </div>

      <div className={layout === "stacked" ? "stack" : "grid-split"}>
        {/* LEFT: Live pacing */}
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h3>
                <span className="live-dot"/>
                Live pacing · {asOfLabel}
              </h3>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <span className="hint">As of {timeStr}</span>
                <button className="btn btn-sm" onClick={() => setRoute('pacing')}>
                  Compare <Icon name="chevR" size={12}/>
                </button>
              </div>
            </div>

            <div className="pace-rail">
              {LOCS.map(loc => (
                <div key={loc.code} className="pace-location">
                  <div className="pace-loc-name">
                    <span className="pace-loc-code">{loc.code}</span>
                    <span className="pace-loc-meta">{loc.meta}</span>
                  </div>

                  <div className="pace-metrics">
                    {[
                      ["Washes", loc.metrics.worksCount],
                      ["Gross revenue", loc.metrics.grossRev],
                      ["Avg ticket", loc.metrics.avgTicket],
                      ["New members", loc.metrics.newMembers],
                    ].map(([label, m]) => (
                      <div className="metric" key={label}>
                        <div className="metric-label">{label}</div>
                        <div className="metric-value">{m.value}</div>
                        <div style={{display:'flex', gap:6, alignItems:'center'}}>
                          <Delta value={m.delta}/>
                          <span style={{fontSize:11, color:'var(--ink-4)'}}>{m.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <SparkBar data={loc.spark}/>
                </div>
              ))}
            </div>
          </div>

          {/* Quick access */}
          <div className="card">
            <div className="card-head">
              <h3>Quick access</h3>
              <span className="hint">Your pinned & recent</span>
            </div>
            <div className="quick-grid" style={{margin: '0 18px 18px', borderRadius: 'var(--radius-sm)'}}>
              {QUICK_ACCESS.map((q, i) => (
                <div key={i} className="quick-item" onClick={() => onOpenReport(q.name)}>
                  <span className="quick-item-label">{q.category}</span>
                  <span className="quick-item-name">{q.name}</span>
                  <span className="quick-item-time">{q.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Needs attention */}
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h3>Needs attention</h3>
              <span className="hint">Since yesterday · {ATTN.length}</span>
            </div>
            <div className="attention">
              {ATTN.map((a, i) => (
                <div key={i} className="attn-item" onClick={() => onOpenReport(a.title)}>
                  <span className={`attn-dot ${a.tone}`}/>
                  <div className="attn-main">
                    <div className="attn-title">{a.title}</div>
                    <div className="attn-desc">{a.desc}</div>
                  </div>
                  <span className="attn-time">{a.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Today's schedule</h3>
              <span className="hint">Scheduled refreshes</span>
            </div>
            <div style={{padding: '0 18px 18px'}}>
              {[
                {time: "9:00 AM",  name: "Daily expense pull",       status: "ok"},
                {time: "12:00 PM", name: "Hourly audit snapshot",    status: "ok"},
                {time: "4:30 PM",  name: "Coupon redemption sync",   status: "ok"},
                {time: "6:00 PM",  name: "End-of-day briefing gen.", status: "warn"},
              ].map((s, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 0',
                  borderTop: i === 0 ? 0 : '1px solid var(--line)'
                }}>
                  <span className="mono" style={{fontSize:11, color:'var(--ink-3)', minWidth:70, textTransform:'uppercase', letterSpacing:'0.05em'}}>{s.time}</span>
                  <span style={{flex:1, fontSize:13.5}}>{s.name}</span>
                  <StatusDot status={s.status}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ======== Pacing deep-dive ========
const PacingView = ({locations, asOf}) => {
  const LOCS = locations || window.LOCATIONS;
  const [activeLoc, setActiveLoc] = React.useState(LOCS[0].code);
  const loc = LOCS.find(l => l.code === activeLoc) || LOCS[0];
  const asOfLabel = asOf
    ? new Date(asOf + 'T00:00:00').toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})
    : 'today';

  return (
    <div className="content">
      <div className="page-head">
        <div className="page-title-group">
          <h1>Pacing</h1>
          <div className="sub">Compare live operating performance across locations.</div>
        </div>
        <div className="page-meta">
          <span className="live-dot"/>
          <span>LIVE · {asOfLabel.toUpperCase()}</span>
        </div>
      </div>

      <div className="pd-head">
        <div className="loc-pills">
          {LOCS.map(l => (
            <button
              key={l.code}
              className="loc-pill"
              data-active={l.code === activeLoc}
              onClick={() => setActiveLoc(l.code)}
            >{l.code}</button>
          ))}
        </div>
        <div style={{flex: 1}}/>
        <button className="btn btn-sm"><Icon name="sliders" size={12}/> Filters</button>
        <button className="btn btn-sm"><Icon name="open" size={12}/> Export</button>
      </div>

      {/* Big metric grid */}
      <div className="pd-grid">
        {[
          ["Washes", loc.metrics.worksCount],
          ["Gross revenue", loc.metrics.grossRev],
          ["Avg ticket", loc.metrics.avgTicket],
          ["New members", loc.metrics.newMembers],
        ].map(([label, m]) => (
          <div key={label} className="pd-metric">
            <div className="pd-metric-label">{label}</div>
            <div className="pd-metric-value">{m.value}</div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <DeltaChip value={m.delta}/>
              <span style={{fontSize:12, color:'var(--ink-3)'}} className="mono">{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cross-location comparison */}
      <div className="card">
        <div className="card-head">
          <h3>Cross-location comparison</h3>
          <span className="hint">Today vs 28-day avg</span>
        </div>
        <table className="pd-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Washes</th>
              <th>Gross rev.</th>
              <th>Avg ticket</th>
              <th>New mbrs</th>
              <th>Rework</th>
              <th>Pacing</th>
            </tr>
          </thead>
          <tbody>
            {LOCS.map(l => {
              const overall = (l.metrics.worksCount.delta + l.metrics.grossRev.delta) / 2;
              return (
                <tr key={l.code}>
                  <td>
                    <div style={{display:'flex', flexDirection:'column'}}>
                      <span className="mono" style={{fontWeight:500}}>{l.code}</span>
                      <span style={{fontSize:11, color:'var(--ink-3)'}}>{l.meta}</span>
                    </div>
                  </td>
                  <td className="num">{l.metrics.worksCount.value}</td>
                  <td className="num">{l.metrics.grossRev.value}</td>
                  <td className="num">{l.metrics.avgTicket.value}</td>
                  <td className="num">{l.metrics.newMembers.value}</td>
                  <td className="num">{l.reworkRate}</td>
                  <td><DeltaChip value={overall}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Chart placeholder */}
      <div style={{marginTop: 24}}>
        <div className="card">
          <div className="card-head">
            <h3>Revenue trend · {loc.code}</h3>
            <div className="filter-chips">
              {["1D","7D","28D","90D"].map((r, i) => (
                <button key={r} className="chip" data-active={i === 1}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{
            margin: '0 18px 18px',
            height: 220,
            borderRadius: 'var(--radius-sm)',
            background: 'repeating-linear-gradient(45deg, var(--bg-sunken) 0 8px, var(--bg) 8px 16px)',
            border: '1px dashed var(--line-2)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-4)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            revenue sparkline · placeholder
          </div>
        </div>
      </div>
    </div>
  );
};

// ======== Library view ========
// Two-level flow: folder grid (cohort-grouped) → folder drill-down (file list).
// Folder taxonomy comes from REPORT_FOLDERS in config.js (shared with prod).
// File listings come from the GitHub Contents API via PreviewLibrary.
// Freshness dots come from task_runs latest rows (passed in via props).
const LibraryView = ({user, latestByTaskId, onOpenReport}) => {
  const [view, setView] = React.useState("folders"); // folders | files
  const [activeFolder, setActiveFolder] = React.useState(null);
  const [files, setFiles] = React.useState([]);
  const [filesLoading, setFilesLoading] = React.useState(false);
  const [filesError, setFilesError] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [openingUrl, setOpeningUrl] = React.useState(null);

  // Safety: REPORT_FOLDERS is a plain global from config.js
  const visibleFolders = React.useMemo(() => {
    if (!window.PreviewLibrary) return [];
    return window.PreviewLibrary.getVisibleFolders(user);
  }, [user]);

  // Group folders by cohort, in FOLDER_COHORTS order
  const groupedFolders = React.useMemo(() => {
    const groups = {};
    visibleFolders.forEach(f => {
      groups[f.cohort] = groups[f.cohort] || [];
      groups[f.cohort].push(f);
    });
    const cohortOrder = (typeof FOLDER_COHORTS !== "undefined") ? FOLDER_COHORTS : Object.keys(groups);
    return cohortOrder
      .filter(c => groups[c] && groups[c].length)
      .map(c => ({cohort: c, folders: groups[c]}));
  }, [visibleFolders]);

  // Cadence filter — only applies to folder grid
  const cadences = ["all", "Daily", "Weekly", "Monthly", "On-Demand"];
  const folderMatchesFilter = (f) => {
    if (filter === "all") return true;
    return f.freq === filter;
  };
  const folderMatchesQuery = (f) => {
    if (!query) return true;
    const hay = (f.name + " " + (f.desc || "") + " " + (f.cohort || "")).toLowerCase();
    return hay.includes(query.toLowerCase());
  };

  // Enter folder → fetch contents
  const enterFolder = async (folder) => {
    setActiveFolder(folder);
    setView("files");
    setFilesError("");

    if (folder.renderer !== "file-list" || !folder.path) {
      setFiles([]);
      return;
    }

    setFilesLoading(true);
    try {
      const items = await window.PreviewLibrary.fetchFolderContents(folder.path);
      setFiles(items);
      if (!items.length) setFilesError("No reports in this folder yet.");
    } catch (e) {
      setFilesError("Could not load folder contents. GitHub may be rate-limited.");
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const backToFolders = () => {
    setView("folders");
    setActiveFolder(null);
    setFiles([]);
    setFilesError("");
  };

  // Open a report — mint signed URL, then open in a new tab
  const openFile = async (file) => {
    setOpeningUrl(file.rawUrl);
    try {
      const signedUrl = await window.PreviewLibrary.getSignedUrl(file.rawUrl);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
      onOpenReport && onOpenReport(file.displayName);
    } catch (e) {
      // Fall back to raw URL if mint fails
      window.open(file.rawUrl, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningUrl(null);
    }
  };

  // Group files by month for drilldown
  const filteredFiles = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return files;
    return files.filter(f => (f.displayName + " " + f.dateStr).toLowerCase().includes(q));
  }, [files, query]);

  const filesByMonth = React.useMemo(() => {
    const out = {};
    filteredFiles.forEach(f => {
      const key = f.monthKey || "undated";
      if (!out[key]) out[key] = [];
      out[key].push(f);
    });
    return out;
  }, [filteredFiles]);

  const sortedMonthKeys = React.useMemo(() => {
    const keys = Object.keys(filesByMonth);
    // undated last; rest newest-first
    keys.sort((a, b) => {
      if (a === "undated") return 1;
      if (b === "undated") return -1;
      return b.localeCompare(a);
    });
    return keys;
  }, [filesByMonth]);

  // ----- FILES VIEW -----
  if (view === "files" && activeFolder) {
    return (
      <div className="content">
        <div className="page-head">
          <div className="page-title-group">
            <h1>
              <span style={{marginRight:10}}>{activeFolder.icon}</span>
              {activeFolder.name}
            </h1>
            <div className="sub">{activeFolder.desc}</div>
          </div>
          <div className="page-meta">
            <button className="btn btn-sm" onClick={backToFolders}>
              <Icon name="chevR" size={12} style={{transform:"rotate(180deg)"}}/> Back to folders
            </button>
          </div>
        </div>

        <div className="lib-toolbar">
          <div className="search" style={{marginLeft: 0, minWidth: 320}}>
            <Icon name="search" size={14}/>
            <input
              placeholder="Search in folder…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div style={{flex: 1}}/>
          <span className="hint">
            {filesLoading ? "Loading…" : `${filteredFiles.length} report${filteredFiles.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {activeFolder.renderer !== "file-list" && (
          <div className="empty-state">
            This folder uses a special renderer ({activeFolder.renderer}) that isn't wired in the preview yet.
            Open it on the <a href="https://ucwh-report-portal.netlify.app" target="_blank" rel="noopener noreferrer" style={{color:"var(--accent)"}}>production portal</a>.
          </div>
        )}

        {filesError && activeFolder.renderer === "file-list" && (
          <div className="empty-state">{filesError}</div>
        )}

        {activeFolder.renderer === "file-list" && !filesError && (
          sortedMonthKeys.map(monthKey => (
            <div key={monthKey} className="lib-section">
              <div className="lib-section-head">
                <div className="lib-section-title">
                  {monthKey === "undated" ? "Undated" : window.PreviewLibrary.getMonthLabel(monthKey)} · {filesByMonth[monthKey].length}
                </div>
              </div>
              <div className="file-list" style={{border:"1px solid var(--line)", borderRadius:"var(--radius-sm)", background:"var(--bg)"}}>
                {filesByMonth[monthKey].map((f, i) => (
                  <div
                    key={f.name}
                    onClick={() => openFile(f)}
                    style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"12px 16px",
                      borderTop: i === 0 ? 0 : "1px solid var(--line)",
                      cursor: openingUrl === f.rawUrl ? "wait" : "pointer",
                      opacity: openingUrl === f.rawUrl ? 0.6 : 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-sunken)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <span className="report-type-dot" style={{
                      width:8, height:8, borderRadius:"50%",
                      background: activeFolder.iconColor,
                      flexShrink:0,
                    }}/>
                    <span style={{flex:1, fontSize:13.5}}>{f.displayName}</span>
                    <span className="mono" style={{fontSize:11, color:"var(--ink-3)", minWidth:130, textAlign:"right"}}>
                      {f.dayOfWeek ? f.dayOfWeek + ", " : ""}{f.dateStr}
                    </span>
                    <Icon name="chevR" size={12}/>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // ----- FOLDER GRID VIEW -----
  const allFiltered = visibleFolders.filter(f => folderMatchesFilter(f) && folderMatchesQuery(f));
  const totalVisible = visibleFolders.length;

  return (
    <div className="content">
      <div className="page-head">
        <div className="page-title-group">
          <h1>Report library</h1>
          <div className="sub">
            {totalVisible} folder{totalVisible !== 1 ? "s" : ""} across {groupedFolders.length} cohort{groupedFolders.length !== 1 ? "s" : ""}.
          </div>
        </div>
      </div>

      <div className="lib-toolbar">
        <div className="search" style={{marginLeft: 0, minWidth: 320}}>
          <Icon name="search" size={14}/>
          <input
            placeholder="Search folders…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          {cadences.map(c => (
            <button
              key={c}
              className="chip"
              data-active={filter === c}
              onClick={() => setFilter(c)}
            >{c === "all" ? "All" : c}</button>
          ))}
        </div>
        <div style={{flex: 1}}/>
      </div>

      {allFiltered.length === 0 && (
        <div className="empty-state">No folders match your search. Try clearing filters.</div>
      )}

      {groupedFolders.map(({cohort, folders}) => {
        const cohortFiltered = folders.filter(f => folderMatchesFilter(f) && folderMatchesQuery(f));
        if (!cohortFiltered.length) return null;
        return (
          <div key={cohort} className="lib-section">
            <div className="lib-section-head">
              <div className="lib-section-title">{cohort} · {cohortFiltered.length}</div>
            </div>
            <div className="report-grid">
              {cohortFiltered.map(f => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  latestByTaskId={latestByTaskId}
                  onOpen={() => enterFolder(f)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const FolderCard = ({folder, latestByTaskId, onOpen}) => {
  const fresh = window.PreviewLibrary
    ? window.PreviewLibrary.computeFolderFreshness(folder, latestByTaskId || {})
    : {status: "gray", label: ""};

  // Map our 4-state status to StatusDot's expected tokens
  const dotStatus = fresh.status === "neg" ? "neg"
    : fresh.status === "warn" ? "warn"
    : fresh.status === "ok" ? "ok"
    : "gray";

  return (
    <div className="report-card" onClick={onOpen}>
      <div className="report-head">
        <span className="report-cadence">{folder.freq}</span>
        <span style={{
          width:28, height:28, borderRadius:8,
          display:"inline-flex", alignItems:"center", justifyContent:"center",
          background: folder.color, color: folder.iconColor, fontSize:14,
        }}>{folder.icon}</span>
      </div>
      <div className="report-name">{folder.name}</div>
      <div className="report-desc">{folder.desc}</div>
      <div className="report-foot">
        <span className="report-fresh">
          <StatusDot status={dotStatus}/>
          {fresh.label || (dotStatus === "gray" ? "—" : "Fresh")}
        </span>
        <span><Icon name="chevR" size={10}/></span>
      </div>
    </div>
  );
};

Object.assign(window, { TodayView, PacingView, LibraryView, FolderCard });
