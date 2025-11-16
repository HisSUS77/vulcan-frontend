// src/pages/GraphsPage.js
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const GRAPH_TYPES = ["AST", "CFG", "DFG"];

// metadata for nodes
const NODE_META = [
  {
    id: "center",
    label: "sensitive_data",
    type: "variable",
    scope: "Global",
    code: "sensitive_data = decrypt(token)",
    severity: "critical",
    isCenter: true,
  },
  {
    id: "auth",
    label: "auth.js",
    type: "file",
    scope: "Module",
    code: "validateUser(input)",
    severity: "high",
  },
  {
    id: "db_query",
    label: "db_query",
    type: "function",
    scope: "Module",
    code: "db.query(sql)",
    severity: "medium",
  },
  {
    id: "session",
    label: "session",
    type: "object",
    scope: "Local",
    code: "req.session.user",
    severity: "medium",
  },
  {
    id: "input",
    label: "input",
    type: "variable",
    scope: "Local",
    code: "const input = req.body",
    severity: "low",
  },
  {
    id: "sanitize",
    label: "sanitize",
    type: "function",
    scope: "Module",
    code: "sanitize(userInput)",
    severity: null,
  },
  {
    id: "config",
    label: "config",
    type: "object",
    scope: "Global",
    code: "const cfg = {...}",
    severity: null,
  },
  {
    id: "crypto",
    label: "crypto",
    type: "module",
    scope: "Global",
    code: "import crypto from 'crypto'",
    severity: null,
  },
  {
    id: "router",
    label: "router",
    type: "module",
    scope: "Module",
    code: "router.post('/login')",
    severity: null,
  },
  {
    id: "middleware",
    label: "middleware",
    type: "function",
    scope: "Module",
    code: "authMiddleware()",
    severity: null,
  },
  {
    id: "logger",
    label: "logger",
    type: "function",
    scope: "Module",
    code: "log.warn(data)",
    severity: null,
  },
  {
    id: "hash",
    label: "hash",
    type: "variable",
    scope: "Local",
    code: "const hash = sha256(data)",
    severity: null,
  },
  {
    id: "response",
    label: "response",
    type: "object",
    scope: "Local",
    code: "res.json(data)",
    severity: null,
  },
  {
    id: "sink",
    label: "exec_sink",
    type: "function",
    scope: "Module",
    code: "exec(userInput)",
    severity: "high",
  },
];

// which nodes form the “taint path”
const PATH_NODE_IDS = ["input", "auth", "db_query", "center", "session"];
const pathSet = new Set(PATH_NODE_IDS);

function GraphsPage() {
  const navigate = useNavigate();

  const [graphType, setGraphType] = useState("AST");
  const [search, setSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("center");
  const [showPath, setShowPath] = useState(false);
  const [toast, setToast] = useState("");

  // compute nice radial layout for nodes
  const { nodes, links, nodeMap } = useMemo(() => {
    // center node at middle of viewBox
    const centerNode = NODE_META.find((n) => n.isCenter);
    const others = NODE_META.filter((n) => !n.isCenter);

    const radius = 30; // circle radius in viewBox units
    const centerX = 50;
    const centerY = 50;

    const placedNodes = [];

    // push center
    placedNodes.push({
      ...centerNode,
      x: centerX,
      y: centerY,
    });

    // place others evenly around a circle
    const count = others.length;
    others.forEach((meta, index) => {
      const angle = (2 * Math.PI * index) / count - Math.PI / 2; // start at top
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      placedNodes.push({
        ...meta,
        x,
        y,
      });
    });

    // simple links: center to all + a few cross-links
    const linkList = [];

    placedNodes.forEach((n) => {
      if (!n.isCenter) {
        linkList.push({ source: "center", target: n.id });
      }
    });

    // cross links to make it look more real
    const extraPairs = [
      ["input", "auth"],
      ["auth", "router"],
      ["router", "middleware"],
      ["input", "sanitize"],
      ["sanitize", "db_query"],
      ["db_query", "sink"],
      ["hash", "db_query"],
      ["config", "db_query"],
      ["logger", "sink"],
    ];
    extraPairs.forEach(([a, b]) => linkList.push({ source: a, target: b }));

    const map = {};
    placedNodes.forEach((n) => (map[n.id] = n));

    return { nodes: placedNodes, links: linkList, nodeMap: map };
  }, []);

  const selectedNode =
    NODE_META.find((n) => n.id === selectedNodeId) || NODE_META[0];

  const filteredNodeIds = search
    ? NODE_META.filter((n) =>
        n.label.toLowerCase().includes(search.toLowerCase())
      ).map((n) => n.id)
    : [];

  const handleExport = (format) => {
    console.log("Export graph as:", format, "for type", graphType);
    setToast(`Graph exported as ${format.toUpperCase()}.`);
    setTimeout(() => setToast(""), 2600);
  };

  const handleShowPath = () => {
    setShowPath((p) => !p);
    setToast(
      !showPath ? "Data flow path highlighted." : "Data flow path cleared."
    );
    setTimeout(() => setToast(""), 2200);
  };

  const handleBackToScan = () => {
    navigate("/scan");
  };

  return (
    <div className="gv-page">
      {toast && <div className="gv-toast">{toast}</div>}

      <div className="gv-top-row">
        <div className="gv-title-wrap">
          <h1 className="gv-title">Graph Visualization</h1>
          <button
            type="button"
            className="gv-back-btn"
            onClick={handleBackToScan}
          >
            ← Back to scan results
          </button>
        </div>

        <div className="gv-top-actions">
          <div className="gv-graph-type-tabs">
            {GRAPH_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={
                  "gv-graph-type-tab" +
                  (graphType === type ? " active" : "")
                }
                onClick={() => setGraphType(type)}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="gv-search-wrap">
            <span className="gv-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search nodes, variables, vulnerabilities"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="gv-main">
        {/* GRAPH CARD */}
        <div className="gv-graph-card">
          <div className="gv-graph-inner">
            <div className="gv-graph-header-row">
              <div className="gv-graph-header-label">
                {graphType} View
              </div>

              <div className="gv-graph-actions-right">
                <button
                  type="button"
                  className={
                    "gv-path-btn" + (showPath ? " active" : "")
                  }
                  onClick={handleShowPath}
                >
                  Show data flow path
                </button>
                <div className="gv-export-group">
                  <button
                    type="button"
                    onClick={() => handleExport("png")}
                  >
                    Export PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("json")}
                  >
                    Export JSON
                  </button>
                </div>
              </div>
            </div>

            <div className="gv-canvas">
              <div className="gv-grid-overlay" />

              <svg
                className="gv-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* edges */}
                {links.map((link, idx) => {
                  const a = nodeMap[link.source];
                  const b = nodeMap[link.target];
                  if (!a || !b) return null;

                  const edgeInPath =
                    showPath &&
                    pathSet.has(link.source) &&
                    pathSet.has(link.target);

                  return (
                    <line
                      key={idx}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      className={
                        "gv-svg-edge" + (edgeInPath ? " path" : "")
                      }
                    />
                  );
                })}

                {/* nodes */}
                {nodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const isMatch = filteredNodeIds.includes(node.id);
                  const isPath = showPath && pathSet.has(node.id);

                  let severityClass = "";
                  if (node.severity === "critical")
                    severityClass = " critical";
                  else if (node.severity === "high")
                    severityClass = " high";
                  else if (node.severity === "medium")
                    severityClass = " medium";
                  else if (node.severity === "low")
                    severityClass = " low";

                  const baseRadius = node.isCenter ? 4.5 : 3;

                  return (
                    <g
                      key={node.id}
                      className="gv-svg-node"
                      onClick={() => setSelectedNodeId(node.id)}
                    >
                      {/* selection ring */}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={baseRadius + 1.5}
                          className="gv-svg-node-ring"
                        />
                      )}

                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={baseRadius}
                        className={
                          "gv-svg-node-circle" +
                          severityClass +
                          (isMatch ? " match" : "") +
                          (isPath ? " path" : "")
                        }
                      />

                      {/* small label under node, like mockup */}
                      <text
                        x={node.x}
                        y={node.y + baseRadius + 2}
                        className="gv-svg-node-label"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Legend bottom-right */}
              <div className="gv-legend">
                <div className="gv-legend-item">
                  <span className="gv-legend-dot ast" /> AST
                </div>
                <div className="gv-legend-item">
                  <span className="gv-legend-dot cfg" /> CFG
                </div>
                <div className="gv-legend-item">
                  <span className="gv-legend-dot dfg" /> DFG
                </div>
                <div className="gv-legend-item">
                  <span className="gv-legend-dot crit" /> Critical
                </div>
                <div className="gv-legend-item">
                  <span className="gv-legend-dot high" /> High
                </div>
                <div className="gv-legend-item">
                  <span className="gv-legend-dot med" /> Medium
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INSPECTOR CARD */}
        <div className="gv-inspector-card">
          <div className="gv-inspector-inner">
            <div className="gv-inspector-title">Element Details</div>

            <div className="gv-inspector-section">
              <div className="gv-inspector-label">Type</div>
              <div className="gv-inspector-value">
                Node ({selectedNode.type})
              </div>
            </div>

            <div className="gv-inspector-section">
              <div className="gv-inspector-label">Properties</div>
              <div className="gv-inspector-props">
                <div>
                  <span className="gv-inspector-prop-label">Name</span>
                  <span className="gv-inspector-prop-value">
                    {selectedNode.label}
                  </span>
                </div>
                <div>
                  <span className="gv-inspector-prop-label">Scope</span>
                  <span className="gv-inspector-prop-value">
                    {selectedNode.scope}
                  </span>
                </div>
              </div>
            </div>

            <div className="gv-inspector-section">
              <div className="gv-inspector-label">Code</div>
              <div className="gv-code-block">
                <code>{selectedNode.code}</code>
              </div>
            </div>

            <div className="gv-inspector-section">
              <div className="gv-inspector-label">
                AI Insight (why vulnerable)
              </div>
              <div className="gv-ai-insight">
                {selectedNode.severity ? (
                  <>
                    The variable{" "}
                    <span className="gv-highlight">
                      {selectedNode.label}
                    </span>{" "}
                    is marked <b>{selectedNode.severity}</b> because it
                    propagates untrusted data into security-sensitive
                    sinks without proper sanitization.
                  </>
                ) : (
                  <>This node is not currently flagged as vulnerable.</>
                )}
              </div>
            </div>

            <div className="gv-inspector-footer">
              <span className="gv-inspector-hint">
                Tip: select a node in the graph to update details.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraphsPage;
