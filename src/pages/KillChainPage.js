import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { killChainService, reportService } from "../api/services";

/* ── static style injection ─────────────────────────────────────────── */
const STYLE = `
@keyframes kc-pulse       { 0%,100%{opacity:1} 50%{opacity:0.55} }
@keyframes kc-glow-ring   { 0%,100%{r:52;opacity:0.18} 50%{r:60;opacity:0.08} }
@keyframes kc-flow        { from{stroke-dashoffset:80} to{stroke-dashoffset:0} }
@keyframes kc-scan-line   { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
@keyframes kc-fade-in     { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes kc-type        { from{width:0} to{width:100%} }
@keyframes kc-bar-fill    { from{width:0%} to{width:var(--bar-w)} }
@keyframes kc-spin        { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes kc-stage-in    { from{opacity:0;transform:scale(0.82)} to{opacity:1;transform:scale(1)} }
@keyframes kc-blast-draw  { from{stroke-dashoffset:var(--circ)} to{stroke-dashoffset:var(--offset)} }

.kc-page { min-height:100vh; background:#07080f; color:#cbd5e1; font-family:'JetBrains Mono',monospace,sans-serif; padding:28px 32px; position:relative; overflow-x:hidden; }
.kc-scan-line { position:fixed; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent); animation:kc-scan-line 6s linear infinite; pointer-events:none; z-index:0; }

.kc-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:32px; animation:kc-fade-in .5s ease both; }
.kc-kicker { font-size:10px; letter-spacing:.18em; color:#6366f1; margin-bottom:6px; }
.kc-title  { font-size:28px; font-weight:800; letter-spacing:.04em; color:#f1f5f9; text-shadow:0 0 30px rgba(99,102,241,.55); margin:0 0 6px; }
.kc-sub    { font-size:12px; color:#64748b; margin:0 0 10px; }
.kc-scan-pill { display:inline-flex; align-items:center; gap:6px; background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.3); border-radius:4px; padding:3px 10px; font-size:10px; letter-spacing:.1em; color:#818cf8; }
.kc-scan-pill span { color:#a5b4fc; }

.kc-stats-row { display:flex; gap:12px; flex-wrap:wrap; }
.kc-stat { background:rgba(15,17,30,.9); border:1px solid rgba(99,102,241,.2); border-radius:8px; padding:10px 18px; text-align:center; min-width:80px; }
.kc-stat-num { font-size:22px; font-weight:800; color:#a5b4fc; }
.kc-stat-lbl { font-size:9px; letter-spacing:.12em; color:#475569; margin-top:2px; }

/* ── blast gauge ── */
.kc-top { display:grid; grid-template-columns:260px 1fr; gap:24px; margin-bottom:32px; animation:kc-fade-in .5s .1s ease both; }
.kc-blast-card { background:rgba(10,12,24,.95); border:1px solid rgba(220,38,38,.35); border-radius:14px; padding:28px 24px; display:flex; flex-direction:column; align-items:center; gap:16px; position:relative; overflow:hidden; }
.kc-blast-card::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 0%,rgba(220,38,38,.08),transparent 65%); pointer-events:none; }
.kc-blast-label { font-size:10px; letter-spacing:.2em; color:#ef4444; }
.kc-blast-score { font-size:42px; font-weight:900; color:#ef4444; text-shadow:0 0 30px rgba(220,38,38,.7); line-height:1; }
.kc-blast-sub   { font-size:9px; letter-spacing:.12em; color:#7f1d1d; }

/* ── narrative card ── */
.kc-narrative-card { background:rgba(10,12,24,.95); border:1px solid rgba(99,102,241,.2); border-radius:14px; padding:24px 28px; display:flex; flex-direction:column; gap:20px; }
.kc-narrative-title { font-size:10px; letter-spacing:.18em; color:#6366f1; }
.kc-narrative-text  { font-size:13px; line-height:1.75; color:#94a3b8; border-left:2px solid rgba(99,102,241,.4); padding-left:14px; }

/* ── kill chains list ── */
.kc-chains-title { font-size:10px; letter-spacing:.18em; color:#6366f1; margin-bottom:10px; }
.kc-chain-row    { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
.kc-chain-name   { font-size:11px; color:#cbd5e1; min-width:240px; }
.kc-chain-bar-bg { flex:1; height:6px; background:rgba(99,102,241,.1); border-radius:3px; overflow:hidden; }
.kc-chain-bar    { height:100%; border-radius:3px; background:linear-gradient(90deg,#6366f1,#a5b4fc); animation:kc-bar-fill .9s .4s ease both; }
.kc-chain-prob   { font-size:10px; color:#6366f1; min-width:36px; text-align:right; }

/* ── MITRE timeline ── */
.kc-timeline-section { margin-bottom:28px; animation:kc-fade-in .5s .2s ease both; }
.kc-timeline-title   { font-size:10px; letter-spacing:.18em; color:#6366f1; margin-bottom:16px; }
.kc-timeline-wrap    { position:relative; }
.kc-timeline-svg     { position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; }
.kc-timeline-stages  { display:flex; gap:0; position:relative; z-index:1; }

.kc-stage-card {
  flex:1; min-width:0; cursor:pointer;
  background:rgba(10,12,24,.92);
  border:1px solid rgba(255,255,255,.06);
  border-radius:10px; margin:0 4px;
  padding:16px 10px 14px;
  display:flex; flex-direction:column; align-items:center; gap:8px;
  transition:transform .18s,border-color .18s,box-shadow .18s;
  animation:kc-stage-in .4s ease both;
  position:relative; overflow:hidden;
}
.kc-stage-card:hover { transform:translateY(-4px); }
.kc-stage-card--active { border-color:var(--sc); box-shadow:0 0 18px -4px var(--sc); }
.kc-stage-card--active::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--sc) 14%,transparent),transparent 70%); pointer-events:none; }
.kc-stage-card--inactive { opacity:.35; }
.kc-stage-card--selected { border-color:var(--sc)!important; box-shadow:0 0 28px -2px var(--sc)!important; transform:translateY(-6px)!important; }
.kc-stage-card--selected::after { content:'▲'; position:absolute; bottom:-14px; left:50%; transform:translateX(-50%); color:var(--sc); font-size:10px; }

.kc-stage-icon    { font-size:22px; line-height:1; filter:drop-shadow(0 0 8px var(--sc)); }
.kc-stage-tid     { font-size:8px; letter-spacing:.1em; color:#334155; }
.kc-stage-name    { font-size:9px; letter-spacing:.08em; color:#94a3b8; text-align:center; line-height:1.3; }
.kc-stage-count   { font-size:20px; font-weight:900; color:var(--sc); text-shadow:0 0 14px var(--sc); line-height:1; }
.kc-stage-risk    { font-size:7px; letter-spacing:.12em; padding:2px 6px; border-radius:2px; font-weight:700; }
.kc-stage-pulse   { animation:kc-pulse 1.8s ease infinite; }

/* ── detail panel ── */
.kc-detail-panel { background:rgba(10,12,24,.97); border:1px solid rgba(99,102,241,.25); border-radius:14px; padding:24px; margin-top:16px; animation:kc-fade-in .3s ease both; }
.kc-dp-header    { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
.kc-dp-tactic    { font-size:10px; letter-spacing:.18em; margin-bottom:4px; }
.kc-dp-name      { font-size:18px; font-weight:800; color:#f1f5f9; }
.kc-dp-desc      { font-size:12px; color:#64748b; margin-top:4px; }
.kc-dp-close     { background:none; border:1px solid rgba(255,255,255,.1); color:#64748b; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:12px; font-family:inherit; }
.kc-dp-close:hover { color:#f1f5f9; border-color:rgba(255,255,255,.3); }
.kc-dp-techniques { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px; }
.kc-dp-tech      { background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.3); border-radius:4px; padding:2px 8px; font-size:9px; letter-spacing:.08em; color:#818cf8; }
.kc-vuln-grid    { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:10px; }
.kc-vuln-card    { background:rgba(15,17,30,.9); border:1px solid rgba(255,255,255,.06); border-radius:8px; padding:12px 14px; }
.kc-vuln-top     { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
.kc-vuln-type    { font-size:11px; color:#e2e8f0; font-weight:600; }
.kc-vuln-sev     { font-size:9px; letter-spacing:.1em; font-weight:700; padding:2px 6px; border-radius:3px; }
.kc-vuln-meta    { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px; }
.kc-vuln-badge   { font-size:8px; padding:1px 5px; border-radius:2px; border:1px solid; letter-spacing:.06em; }
.kc-vuln-explain { font-size:10px; color:#64748b; line-height:1.5; margin-top:6px; }
.kc-cvss         { font-size:13px; font-weight:800; }

/* ── empty / loading ── */
.kc-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; gap:16px; text-align:center; }
.kc-empty-icon  { font-size:52px; opacity:.3; }
.kc-empty-title { font-size:18px; font-weight:800; letter-spacing:.1em; color:#334155; }
.kc-empty-sub   { font-size:12px; color:#1e293b; }
.kc-cta         { background:transparent; border:1px solid #6366f1; color:#818cf8; border-radius:6px; padding:8px 20px; font-size:12px; font-family:inherit; letter-spacing:.1em; cursor:pointer; transition:all .18s; }
.kc-cta:hover   { background:rgba(99,102,241,.15); color:#a5b4fc; }
.kc-spinner     { width:42px; height:42px; border:3px solid rgba(99,102,241,.15); border-top-color:#6366f1; border-radius:50%; animation:kc-spin .75s linear infinite; }
`;

/* ── constants ──────────────────────────────────────────────────────── */
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e", none: "#334155" };
const SEV_BG    = { critical: "rgba(239,68,68,.12)", high: "rgba(249,115,22,.12)", medium: "rgba(234,179,8,.1)", low: "rgba(34,197,94,.1)", none: "rgba(51,65,85,.1)" };
const STAGE_ICONS = {
  reconnaissance:       "◉",
  initial_access:       "⬡",
  execution:            "⚡",
  persistence:          "⚓",
  privilege_escalation: "▲",
  credential_access:    "◈",
  exfiltration:         "↗",
  impact:               "☢",
};

/* ── BlastGauge ─────────────────────────────────────────────────────── */
function BlastGauge({ score }) {
  const R    = 68;
  const circ = 2 * Math.PI * R;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#dc2626" : score >= 60 ? "#f97316" : score >= 40 ? "#eab308" : "#22c55e";

  return (
    <div className="kc-blast-card">
      <div className="kc-blast-label">BLAST RADIUS</div>
      <svg width="170" height="170" viewBox="0 0 170 170">
        <defs>
          <filter id="kc-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Grid rings */}
        {[44, 56, 68].map((r) => (
          <circle key={r} cx={85} cy={85} r={r} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
        ))}
        {/* Track */}
        <circle cx={85} cy={85} r={R} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="10" />
        {/* Progress */}
        <circle
          cx={85} cy={85} r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          transform="rotate(-90 85 85)"
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
            transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke .5s",
          }}
        />
        {/* Score */}
        <text x={85} y={80} textAnchor="middle" fontSize="32" fontWeight="900" fill={color} fontFamily="monospace" filter="url(#kc-glow)">{score}</text>
        <text x={85} y={100} textAnchor="middle" fontSize="10" fill="#475569" fontFamily="monospace">/ 100</text>
      </svg>
      <div className="kc-blast-sub">
        {score >= 80 ? "CRITICAL EXPOSURE" : score >= 60 ? "HIGH RISK" : score >= 40 ? "MODERATE RISK" : "LOW RISK"}
      </div>
    </div>
  );
}

/* ── StageTimeline ──────────────────────────────────────────────────── */
function StageTimeline({ stages, selectedId, onSelect }) {
  const stagesRef = useRef(null);
  const [connectors, setConnectors] = useState([]);

  useEffect(() => {
    if (!stagesRef.current) return;
    const cards = stagesRef.current.querySelectorAll("[data-stage-id]");
    const wrap  = stagesRef.current.getBoundingClientRect();
    const pts   = [];
    cards.forEach((el) => {
      const rect = el.getBoundingClientRect();
      pts.push({ id: el.dataset.stageId, cx: rect.left + rect.width / 2 - wrap.left, cy: rect.height / 2 });
    });

    const lines = [];
    const activeStages = stages.filter((s) => s.active);
    for (let i = 0; i < activeStages.length - 1; i++) {
      const a = pts.find((p) => p.id === activeStages[i].id);
      const b = pts.find((p) => p.id === activeStages[i + 1].id);
      if (a && b) lines.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, color: activeStages[i].color });
    }
    setConnectors(lines);
  }, [stages]);

  return (
    <div className="kc-timeline-wrap" ref={stagesRef} style={{ height: 170 }}>
      <svg className="kc-timeline-svg" style={{ zIndex: 0 }}>
        <defs>
          {stages.map((s) => (
            <marker key={s.id} id={`arrow-${s.id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill={s.color} fillOpacity="0.7" />
            </marker>
          ))}
        </defs>
        {connectors.map((c, i) => {
          return (
            <g key={i}>
              {/* Static dim line */}
              <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={c.color} strokeWidth="1.5" strokeOpacity="0.2" />
              {/* Animated flow */}
              <line
                x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
                stroke={c.color} strokeWidth="2" strokeOpacity="0.8"
                strokeDasharray="14 10"
                style={{
                  strokeDashoffset: 0,
                  animation: `kc-flow ${1.2 + i * 0.15}s linear infinite`,
                  filter: `drop-shadow(0 0 4px ${c.color})`,
                }}
                markerEnd={`url(#arrow-${stages.find((s) => s.color === c.color)?.id || ""})`}
              />
            </g>
          );
        })}
      </svg>

      <div className="kc-timeline-stages" style={{ height: "100%", alignItems: "stretch" }}>
        {stages.map((stage, idx) => {
          const isActive   = stage.active;
          const isSelected = stage.id === selectedId;
          const color      = stage.color;
          const riskColor  = SEV_COLOR[stage.risk_level] || "#334155";
          const riskBg     = SEV_BG[stage.risk_level]   || "rgba(51,65,85,.1)";

          return (
            <div
              key={stage.id}
              data-stage-id={stage.id}
              className={[
                "kc-stage-card",
                isActive   ? "kc-stage-card--active"   : "kc-stage-card--inactive",
                isSelected ? "kc-stage-card--selected" : "",
                isActive && (stage.risk_level === "critical" || stage.risk_level === "high") ? "kc-stage-pulse" : "",
              ].join(" ")}
              style={{ "--sc": color, animationDelay: `${idx * 0.06}s` }}
              onClick={() => isActive && onSelect(stage.id === selectedId ? null : stage.id)}
              title={stage.tactic}
            >
              <div className="kc-stage-tid">{stage.tactic_id}</div>
              <div className="kc-stage-icon" style={{ "--sc": color }}>{STAGE_ICONS[stage.id] || "◆"}</div>
              <div className="kc-stage-name">{stage.tactic.toUpperCase()}</div>
              {isActive ? (
                <>
                  <div className="kc-stage-count" style={{ "--sc": color }}>{stage.vuln_count}</div>
                  <div className="kc-stage-risk" style={{ color: riskColor, background: riskBg, border: `1px solid ${riskColor}40` }}>
                    {stage.risk_level.toUpperCase()}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 9, color: "#1e293b", letterSpacing: ".08em" }}>CLEAN</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── DetailPanel ────────────────────────────────────────────────────── */
function DetailPanel({ stage, onClose }) {
  if (!stage) return null;
  const sorted = [...(stage.vulnerabilities || [])].sort((a, b) => {
    const order = { critical: 4, high: 3, medium: 2, low: 1 };
    return (order[(b.severity || "").toLowerCase()] || 0) - (order[(a.severity || "").toLowerCase()] || 0);
  });

  return (
    <div className="kc-detail-panel">
      <div className="kc-dp-header">
        <div>
          <div className="kc-dp-tactic" style={{ color: stage.color }}>{stage.tactic_id} · {stage.tactic.toUpperCase()}</div>
          <div className="kc-dp-name">{stage.tactic}</div>
          <div className="kc-dp-desc">{stage.description}</div>
        </div>
        <button className="kc-dp-close" onClick={onClose}>✕ CLOSE</button>
      </div>

      <div className="kc-dp-techniques">
        {(stage.techniques || []).map((t) => (
          <span key={t} className="kc-dp-tech">{t}</span>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div style={{ color: "#334155", fontSize: 12 }}>No vulnerabilities mapped to this stage.</div>
      ) : (
        <div className="kc-vuln-grid">
          {sorted.map((v, i) => {
            const sev   = (v.severity || "none").toLowerCase();
            const color = SEV_COLOR[sev] || "#334155";
            const bg    = SEV_BG[sev]   || "rgba(51,65,85,.1)";
            return (
              <div key={v.id || i} className="kc-vuln-card" style={{ borderColor: `${color}25` }}>
                <div className="kc-vuln-top">
                  <div className="kc-vuln-type">{v.type || "Unknown"}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {v.cvss_score != null && (
                      <span className="kc-cvss" style={{ color }}>{v.cvss_score}</span>
                    )}
                    <span className="kc-vuln-sev" style={{ color, background: bg }}>{sev.toUpperCase()}</span>
                  </div>
                </div>
                <div className="kc-vuln-meta">
                  {v.cwe   && <span className="kc-vuln-badge" style={{ color: "#818cf8", borderColor: "#6366f140" }}>CWE-{v.cwe}</span>}
                  {v.owasp && <span className="kc-vuln-badge" style={{ color: "#f59e0b", borderColor: "#f59e0b40" }}>OWASP {v.owasp}</span>}
                  {v.file  && (
                    <span className="kc-vuln-badge" style={{ color: "#64748b", borderColor: "#33415540" }}>
                      {v.file.split("/").pop()}{v.line ? `:${v.line}` : ""}
                    </span>
                  )}
                </div>
                {v.explanation && (
                  <div className="kc-vuln-explain">{v.explanation.slice(0, 200)}{v.explanation.length > 200 ? "…" : ""}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── KillChains ─────────────────────────────────────────────────────── */
function KillChains({ chains, stages }) {
  if (!chains?.length) return null;
  const stageMap = Object.fromEntries((stages || []).map((s) => [s.id, s]));

  return (
    <div style={{ marginBottom: 28, animation: "kc-fade-in .5s .35s ease both", animationFillMode: "both" }}>
      <div className="kc-chains-title">MOST PROBABLE ATTACK PATHS</div>
      {chains.map((chain) => (
        <div key={chain.id} className="kc-chain-row">
          <div className="kc-chain-name">{chain.name}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginRight: 8 }}>
            {chain.stages.map((sid, i) => {
              const s = stageMap[sid];
              if (!s) return null;
              return (
                <React.Fragment key={sid}>
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40`, letterSpacing: ".06em" }}>
                    {s.tactic_id}
                  </span>
                  {i < chain.stages.length - 1 && <span style={{ fontSize: 9, color: "#334155", alignSelf: "center" }}>→</span>}
                </React.Fragment>
              );
            })}
          </div>
          <div className="kc-chain-bar-bg">
            <div className="kc-chain-bar" style={{ "--bar-w": `${chain.probability * 100}%`, width: `${chain.probability * 100}%` }} />
          </div>
          <div className="kc-chain-prob">{Math.round(chain.probability * 100)}%</div>
        </div>
      ))}
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────────── */
export default function KillChainPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const urlScanId      = searchParams.get("scanId");

  const [scanId,     setScanId]     = useState(urlScanId || null);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [styleReady, setStyleReady] = useState(false);

  /* inject styles once */
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = STYLE;
    document.head.appendChild(el);
    setStyleReady(true);
    return () => document.head.removeChild(el);
  }, []);

  /* resolve scan: URL param → lastScanId → user's own latest scan */
  useEffect(() => {
    if (urlScanId) { setScanId(urlScanId); return; }
    const stored = localStorage.getItem("lastScanId");
    if (stored) { setScanId(stored); return; }
    reportService.list()
      .then((res) => {
        const reports = Array.isArray(res.data) ? res.data : [];
        const latest  = reports[0];
        if (latest?.scan_id) setScanId(latest.scan_id);
      })
      .catch(() => {});
  }, [urlScanId]);

  useEffect(() => {
    if (!scanId) return;
    setLoading(true);
    setError("");
    setSelectedId(null);
    killChainService
      .get(scanId)
      .then((res) => setData(res.data))
      .catch((err) => {
        // lastScanId belongs to another user — fall back to own latest scan
        if (err?.response?.status === 403 || err?.response?.status === 404) {
          reportService.list()
            .then((res) => {
              const latest = (Array.isArray(res.data) ? res.data : [])[0];
              if (latest?.scan_id) setScanId(latest.scan_id);
              else setError("No scans found.");
            })
            .catch(() => setError("Failed to load kill chain data."));
        } else {
          setError("Failed to load kill chain data.");
        }
      })
      .finally(() => setLoading(false));
  }, [scanId]);

  if (!styleReady) return null;

  /* ── empty states ── */
  if (!scanId) {
    return (
      <div className="kc-page">
        <div className="kc-scan-line" />
        <div className="kc-empty">
          <div className="kc-empty-icon">⬡</div>
          <div className="kc-empty-title">NO SCAN LOADED</div>
          <div className="kc-empty-sub">Run a scan first to generate the attack kill chain.</div>
          <button className="kc-cta" onClick={() => navigate("/scan")}>GO TO SCAN</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="kc-page">
        <div className="kc-scan-line" />
        <div className="kc-empty">
          <div className="kc-spinner" />
          <div className="kc-empty-title">MAPPING KILL CHAIN…</div>
          <div className="kc-empty-sub">Correlating vulnerabilities to MITRE ATT&CK tactics</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kc-page">
        <div className="kc-scan-line" />
        <div className="kc-empty">
          <div className="kc-empty-icon" style={{ color: "#ef4444" }}>⚠</div>
          <div className="kc-empty-title">{error}</div>
          <div className="kc-empty-sub">Scan ID: {scanId}</div>
          <button className="kc-cta" onClick={() => navigate("/scan")}>RUN NEW SCAN</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stages, kill_chains, blast_radius, narrative, stats } = data;
  const selectedStage = selectedId ? stages.find((s) => s.id === selectedId) : null;

  return (
    <div className="kc-page">
      <div className="kc-scan-line" />

      {/* Header */}
      <div className="kc-header">
        <div>
          <div className="kc-kicker">MITRE ATT&amp;CK KILL CHAIN // KCA-01</div>
          <h1 className="kc-title">Attack Kill Chain</h1>
          <p className="kc-sub">Vulnerability chaining mapped to MITRE ATT&amp;CK enterprise tactics · click a stage to inspect</p>
          <div className="kc-scan-pill">SCAN <span>{scanId}</span></div>
        </div>
        <div className="kc-stats-row">
          <div className="kc-stat">
            <div className="kc-stat-num">{stats.total_vulns}</div>
            <div className="kc-stat-lbl">VULNS</div>
          </div>
          <div className="kc-stat">
            <div className="kc-stat-num">{stats.stages_hit}</div>
            <div className="kc-stat-lbl">STAGES HIT</div>
          </div>
          <div className="kc-stat">
            <div className="kc-stat-num">{stats.chains_found}</div>
            <div className="kc-stat-lbl">CHAINS</div>
          </div>
        </div>
      </div>

      {/* Top: blast gauge + narrative */}
      <div className="kc-top">
        <BlastGauge score={blast_radius} />
        <div className="kc-narrative-card">
          <div>
            <div className="kc-narrative-title">ATTACK NARRATIVE</div>
            <div className="kc-narrative-text">{narrative}</div>
          </div>
          <KillChains chains={kill_chains} stages={stages} />
        </div>
      </div>

      {/* MITRE Timeline */}
      <div className="kc-timeline-section">
        <div className="kc-timeline-title">ATTACK PROGRESSION // MITRE ATT&amp;CK TACTICS</div>
        <StageTimeline stages={stages} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Detail panel */}
      {selectedStage && (
        <DetailPanel stage={selectedStage} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
