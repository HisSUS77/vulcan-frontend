// src/pages/AttackSurfacePage.js
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { attackSurfaceService } from "../api/services";

/* ── constants ─────────────────────────────────────────────────────── */
const RISK_COLOR  = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e", clean: "#22d3ee" };
const RISK_LABEL  = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW", clean: "CLEAN" };
const METHOD_COLOR = { GET: "#3b82f6", POST: "#8b5cf6", PUT: "#f59e0b", DELETE: "#ef4444", PATCH: "#10b981" };
const SEV_RANK    = { critical: 4, high: 3, medium: 2, low: 1 };

const SVG_W = 920;
const SVG_H = 580;

/* ── helpers ────────────────────────────────────────────────────────── */
const nodeRadius = (n) => Math.max(22, Math.min(44, 16 + (n.vuln_count || 0) * 5));

/* ── force simulation ───────────────────────────────────────────────── */
function simulate(nodes, edges) {
  if (!nodes.length) return [];
  const n = nodes.length;

  // Spread nodes in a larger initial circle so repulsion has room to work
  const initR = Math.min(SVG_W, SVG_H) * 0.38;
  const pos = nodes.map((_, i) => ({
    x: SVG_W / 2 + Math.cos((2 * Math.PI * i) / n) * initR,
    y: SVG_H / 2 + Math.sin((2 * Math.PI * i) / n) * initR,
    vx: (Math.random() - 0.5) * 2,  // tiny jitter so symmetric layouts break
    vy: (Math.random() - 0.5) * 2,
  }));

  const edgeIdx = edges
    .map((e) => ({
      s: nodes.findIndex((nd) => nd.id === e.source),
      t: nodes.findIndex((nd) => nd.id === e.target),
    }))
    .filter((e) => e.s >= 0 && e.t >= 0);

  const ITERS  = 320;
  const MARGIN = 85;

  for (let iter = 0; iter < ITERS; iter++) {
    const alpha = Math.pow(0.988, iter);

    // Repulsion — much stronger so nodes can't cluster
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j].x - pos[i].x || 0.01;
        const dy = pos[j].y - pos[i].y || 0.01;
        const d2 = dx * dx + dy * dy || 0.01;
        const d  = Math.sqrt(d2);
        const f  = (28000 * alpha) / d2;
        const fx = (f * dx) / d;
        const fy = (f * dy) / d;
        pos[i].vx -= fx; pos[i].vy -= fy;
        pos[j].vx += fx; pos[j].vy += fy;
      }
    }

    // Spring attraction along edges
    for (const { s, t } of edgeIdx) {
      const dx = pos[t].x - pos[s].x;
      const dy = pos[t].y - pos[s].y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;
      const f  = ((d - 190) * 0.04 * alpha) / d;
      pos[s].vx += f * dx; pos[s].vy += f * dy;
      pos[t].vx -= f * dx; pos[t].vy -= f * dy;
    }

    // Weak center gravity — just enough to keep graph on screen
    for (const p of pos) {
      p.vx += (SVG_W / 2 - p.x) * 0.0018;
      p.vy += (SVG_H / 2 - p.y) * 0.0018;
    }

    // Integrate + damp + clamp
    for (const p of pos) {
      p.vx *= 0.85;
      p.vy *= 0.85;
      p.x = Math.max(MARGIN, Math.min(SVG_W - MARGIN, p.x + p.vx));
      p.y = Math.max(MARGIN, Math.min(SVG_H - MARGIN, p.y + p.vy));
    }

    // Hard collision resolution — push overlapping nodes apart directly
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const minD = nodeRadius(nodes[i]) + nodeRadius(nodes[j]) + 18;
        const dx   = pos[j].x - pos[i].x || 0.01;
        const dy   = pos[j].y - pos[i].y || 0.01;
        const d    = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < minD) {
          const push = (minD - d) / 2;
          pos[i].x -= (push * dx) / d;
          pos[i].y -= (push * dy) / d;
          pos[j].x += (push * dx) / d;
          pos[j].y += (push * dy) / d;
        }
      }
    }
  }

  return pos;
}

/* ── VulnRow ────────────────────────────────────────────────────────── */
function VulnRow({ v }) {
  const color = RISK_COLOR[(v.severity || "").toLowerCase()] || "#888";
  return (
    <div className="asm-vuln-row">
      <div className="asm-vuln-row-top">
        <span className="asm-vuln-type">{v.type || "Unknown"}</span>
        <span className="asm-vuln-sev" style={{ color }}>{(v.severity || "").toUpperCase()}</span>
        {v.cvss_score != null && (
          <span className="asm-vuln-cvss" style={{ color }}>{v.cvss_score}</span>
        )}
      </div>
      <div className="asm-vuln-badges">
        {v.cwe   && <span className="asm-badge asm-badge--cwe">CWE-{v.cwe}</span>}
        {v.owasp && <span className="asm-badge asm-badge--owasp">OWASP {v.owasp}</span>}
        {v.location?.file && (
          <span className="asm-badge asm-badge--file">
            {v.location.file.split("/").pop()}:{v.location.start_line}
          </span>
        )}
      </div>
      {v.explanation && (
        <div className="asm-vuln-explain">{v.explanation}</div>
      )}
    </div>
  );
}

/* ── DetailPanel ────────────────────────────────────────────────────── */
function DetailPanel({ node, onClose }) {
  if (!node) return null;
  const riskColor = RISK_COLOR[node.risk] || "#888";
  const sortedVulns = [...(node.vulnerabilities || [])].sort(
    (a, b) => (SEV_RANK[(b.severity || "").toLowerCase()] || 0) - (SEV_RANK[(a.severity || "").toLowerCase()] || 0)
  );

  return (
    <div className="asm-panel">
      <div className="asm-panel-header">
        <div>
          <div className="asm-panel-kicker">
            {node.method && (
              <span className="asm-method-badge" style={{ background: METHOD_COLOR[node.method] || "#555" }}>
                {node.method}
              </span>
            )}
            <span className="asm-node-type-label">{node.node_type?.toUpperCase() || "FILE"}</span>
          </div>
          <div className="asm-panel-title">{node.label}</div>
          <div className="asm-panel-file">{node.file}</div>
        </div>
        <button className="asm-panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="asm-panel-risk-bar" style={{ borderColor: riskColor }}>
        <span className="asm-panel-risk-dot" style={{ background: riskColor }} />
        <span className="asm-panel-risk-label" style={{ color: riskColor }}>
          {RISK_LABEL[node.risk] || "UNKNOWN"} RISK
        </span>
        <span className="asm-panel-vuln-count">{node.vuln_count} vuln{node.vuln_count !== 1 ? "s" : ""}</span>
      </div>

      <div className="asm-panel-vuln-list">
        {sortedVulns.length === 0 && (
          <div className="asm-panel-empty">No vulnerabilities in this file</div>
        )}
        {sortedVulns.map((v, i) => <VulnRow key={v.id || i} v={v} />)}
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────────── */
export default function AttackSurfacePage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const urlScanId       = searchParams.get("scanId");

  const [scanId,       setScanId]       = useState(urlScanId || null);
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode,  setHoveredNode]  = useState(null);

  /* resolve scan: URL param → lastScanId (set when user opens/initiates a scan) */
  useEffect(() => {
    if (urlScanId) { setScanId(urlScanId); return; }
    const stored = localStorage.getItem("lastScanId");
    if (stored) setScanId(stored);
  }, [urlScanId]);

  /* fetch */
  useEffect(() => {
    if (!scanId) return;
    setLoading(true);
    setError("");
    attackSurfaceService
      .get(scanId)
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load attack surface data."))
      .finally(() => setLoading(false));
  }, [scanId]);

  /* force layout — recompute only when node/edge list changes */
  const positions = useMemo(
    () => simulate(data?.nodes || [], data?.edges || []),
    [data]
  );

  const handleNodeClick = useCallback(
    (node) => setSelectedNode((prev) => (prev?.id === node.id ? null : node)),
    []
  );

  /* highlight set — hovered node + its direct neighbors */
  const highlightSet = useMemo(() => {
    if (!hoveredNode || !data) return null;
    const ids = new Set([hoveredNode.id]);
    for (const e of data.edges) {
      if (e.source === hoveredNode.id) ids.add(e.target);
      if (e.target === hoveredNode.id) ids.add(e.source);
    }
    return ids;
  }, [hoveredNode, data]);

  /* ── empty / loading / error states ── */
  if (!scanId) {
    return (
      <div className="asm-empty-page">
        <div className="asm-empty-icon">⬡</div>
        <div className="asm-empty-title">NO SCAN LOADED</div>
        <div className="asm-empty-sub">Run a scan to generate the attack surface map.</div>
        <button className="asm-cta" onClick={() => navigate("/scan")}>GO TO SCAN</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="asm-empty-page">
        <div className="asm-loading-ring" />
        <div className="asm-empty-title">MAPPING ATTACK SURFACE…</div>
        <div className="asm-empty-sub">Analyzing vulnerabilities and data-flow edges</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="asm-empty-page">
        <div className="asm-empty-icon text-[#ef4444]">⚠</div>
        <div className="asm-empty-title">{error}</div>
        <div className="asm-empty-sub">Scan ID: {scanId}</div>
        <button className="asm-cta" onClick={() => navigate("/scan")}>RUN NEW SCAN</button>
      </div>
    );
  }

  if (!data || !data.nodes?.length) {
    return (
      <div className="asm-empty-page">
        <div className="asm-empty-icon">○</div>
        <div className="asm-empty-title">NO SURFACE DATA</div>
        <div className="asm-empty-sub">
          No vulnerabilities found in scan <code>{scanId}</code> — nothing to map.
        </div>
      </div>
    );
  }

  const { nodes, edges, stats } = data;
  const totalFiles = stats?.total_nodes ?? stats?.total ?? nodes.length;
  const totalVulnerabilities = stats?.total_vulnerabilities ?? nodes.reduce((sum, node) => sum + (node.vuln_count || 0), 0);

  /* ── main render ── */
  return (
    <div className="asm-page">

      {/* Header */}
      <div className="asm-header">
        <div className="asm-header-left">
          <div className="asm-kicker">ATTACK SURFACE ANALYZER // ASM-01</div>
          <h1 className="asm-title" data-text="Attack Surface Map">Attack Surface Map</h1>
          <p className="asm-sub">
            HTTP routes &amp; file nodes · color-coded risk · click to inspect vulnerabilities
          </p>
          <div className="asm-scan-pill">SCAN <span>{scanId}</span></div>
        </div>

        <div className="asm-stats-bar">
          <div className="asm-stat">
            <div className="asm-stat-num">{totalFiles}</div>
            <div className="asm-stat-label">Files</div>
          </div>
          <div className="asm-stat">
            <div className="asm-stat-num">{totalVulnerabilities}</div>
            <div className="asm-stat-label">Vulns</div>
          </div>
          {["critical", "high", "medium", "low"].map((r) =>
            stats[r] > 0 ? (
              <div key={r} className="asm-stat" style={{ borderColor: RISK_COLOR[r] }}>
                <div className="asm-stat-num" style={{ color: RISK_COLOR[r] }}>{stats[r]}</div>
                <div className="asm-stat-label">{r.toUpperCase()}</div>
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="asm-wrap">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="asm-svg"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedNode(null); }}
        >
          <defs>
            {/* Grid pattern */}
            <pattern id="asm-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(34,211,238,0.05)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width={SVG_W} height={SVG_H} fill="url(#asm-grid)" />

          {/* Edges */}
          {edges.map((e, i) => {
            const si = nodes.findIndex((n) => n.id === e.source);
            const ti = nodes.findIndex((n) => n.id === e.target);
            if (si < 0 || ti < 0 || !positions[si] || !positions[ti]) return null;
            const active = highlightSet
              ? highlightSet.has(e.source) && highlightSet.has(e.target)
              : false;
            return (
              <line
                key={e.id || i}
                x1={positions[si].x} y1={positions[si].y}
                x2={positions[ti].x} y2={positions[ti].y}
                className={`asm-edge${active ? " asm-edge--active" : ""}`}
                strokeDasharray={e.type === "uses" ? "5 4" : "none"}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            if (!positions[i]) return null;
            const { x, y } = positions[i];
            const r        = nodeRadius(node);
            const color    = RISK_COLOR[node.risk] || "#22d3ee";
            const isSelected = selectedNode?.id === node.id;
            const isDimmed   = highlightSet && !highlightSet.has(node.id);

            return (
              <g
                key={node.id}
                className={`asm-node asm-node--${node.risk}${isDimmed ? " asm-node--dimmed" : ""} cursor-pointer`}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={x} cy={y} r={r + 8} fill="none" stroke={color} strokeWidth="1.5"
                    strokeDasharray="4 3" opacity="0.7" className="asm-select-ring" />
                )}

                {/* Node body */}
                <circle
                  cx={x} cy={y} r={r}
                  fill={color}
                  fillOpacity={isSelected ? 0.28 : 0.14}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.8}
                />

                {/* Vuln count in center */}
                <text
                  x={x} y={y + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={node.vuln_count >= 10 ? "13" : "15"}
                  fontWeight="700"
                  fill={color}
                  fontFamily="monospace"
                >
                  {node.vuln_count}
                </text>

                {/* Method badge */}
                {node.method && (
                  <g>
                    <rect
                      x={x - 16} y={y - r - 16}
                      width="32" height="14" rx="3"
                      fill={METHOD_COLOR[node.method] || "#555"}
                      fillOpacity="0.9"
                    />
                    <text
                      x={x} y={y - r - 9}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="8" fontWeight="700" fill="#fff" fontFamily="monospace"
                    >
                      {node.method}
                    </text>
                  </g>
                )}

                {/* Node label */}
                <text
                  x={x} y={y + r + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="monospace"
                  fill="rgba(203,213,245,0.85)"
                  className="asm-node-label"
                >
                  {node.label.length > 20 ? node.label.slice(0, 18) + "…" : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Detail panel */}
        <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      </div>

      {/* Legend */}
      <div className="asm-legend">
        <div className="asm-legend-title">RISK LEVEL</div>
        {Object.entries(RISK_COLOR).map(([risk, color]) => (
          <div key={risk} className="asm-legend-item">
            <span className="asm-legend-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span>{RISK_LABEL[risk]}</span>
          </div>
        ))}
        <div className="asm-legend-divider" />
        <div className="asm-legend-title">EDGES</div>
        <div className="asm-legend-item">
          <svg width="24" height="12">
            <line x1="0" y1="6" x2="24" y2="6" stroke="rgba(34,211,238,0.45)" strokeWidth="1.5" />
          </svg>
          <span>Data flow</span>
        </div>
        <div className="asm-legend-item">
          <svg width="24" height="12">
            <line x1="0" y1="6" x2="24" y2="6" stroke="rgba(34,211,238,0.35)" strokeWidth="1.5" strokeDasharray="5 4" />
          </svg>
          <span>Uses</span>
        </div>
        <div className="asm-legend-divider" />
        <div className="asm-legend-item">
          <span className="asm-legend-num-hint">12</span>
          <span>Vuln count (node size)</span>
        </div>
      </div>
    </div>
  );
}
