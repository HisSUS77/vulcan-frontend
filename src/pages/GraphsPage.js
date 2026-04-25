// src/pages/GraphsPage.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../App.css";
import { graphService, scanService } from "../api/services";

const GRAPH_TYPES = ["AST", "CPG"];

function GraphsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get("scanId");
  const fileId = searchParams.get("fileId") || "main";
  const [activeScanId, setActiveScanId] = useState(
    scanId || localStorage.getItem("lastScanId") || null
  );

  const [graphType, setGraphType] = useState("AST");
  const [graphData, setGraphData] = useState(null);
  const [lastGraphData, setLastGraphData] = useState(null);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(fileId || "main");
  const [activeFilePath, setActiveFilePath] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [selectedVuln, setSelectedVuln] = useState(null);
  const [scanSummary, setScanSummary] = useState(null);
  const [lastScanSummary, setLastScanSummary] = useState(null);
  const [lastScanId, setLastScanId] = useState(scanId || null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [showDataFlow, setShowDataFlow] = useState(false);
  const [showOnlyPath, setShowOnlyPath] = useState(false);
  const [lastGraphType, setLastGraphType] = useState("AST");
  const pendingGraphKeyRef = useRef("");
  const lastAutoFileForVulnRef = useRef(null);
  const [vulnView, setVulnView] = useState("all"); // all | ai

  // Resolve scan id without forcing a redirect to /scan
  useEffect(() => {
    if (scanId) {
      setActiveScanId(scanId);
      return;
    }
    const stored = localStorage.getItem("lastScanId");
    if (stored) {
      setActiveScanId(stored);
      navigate(`/graphs?scanId=${stored}&fileId=${activeFileId}`, { replace: true });
      return;
    }
    setActiveScanId(null);
  }, [scanId, navigate, activeFileId]);

  useEffect(() => {
    if (fileId && fileId !== activeFileId) {
      setActiveFileId(fileId);
    }
  }, [fileId, activeFileId]);

  useEffect(() => {
    setInitialLoad(true);
    setLoading(true);
  }, [activeScanId, activeFileId]);

  useEffect(() => {
    if (activeScanId) {
      setLastScanId(activeScanId);
      localStorage.setItem("lastScanId", activeScanId);
    }
  }, [activeScanId]);

  useEffect(() => {
    if (graphData) {
      setLastGraphData(graphData);
    }
  }, [graphData]);

  useEffect(() => {
    if (scanSummary) {
      setLastScanSummary(scanSummary);
    }
  }, [scanSummary]);

  useEffect(() => {
    setSelectedNode(null);
    setShowDataFlow(false);
    setShowOnlyPath(false);
  }, [activeFileId]);

  // Fetch scan summary to get vulnerabilities
  useEffect(() => {
    if (!activeScanId) return;

    const fetchVulnerabilities = async () => {
      try {
        const response = await scanService.getSummary(activeScanId);
        const scanData = response.data || response;
        const normalizedSummary = {
          ...(scanData.summary || scanData),
          scan_id: scanData.scan_id || scanData.id || scanData.summary?.scan_id,
          status: scanData.status || scanData.summary?.status,
          input_type: scanData.input_type || scanData.summary?.input_type,
          files_scanned: scanData.files_scanned || scanData.summary?.files_scanned,
          total_files: scanData.total_files || scanData.summary?.total_files,
          duration_seconds: scanData.duration_seconds || scanData.summary?.duration_seconds,
          completed_at: scanData.completed_at || scanData.summary?.completed_at,
          by_severity: scanData.by_severity || scanData.summary?.by_severity,
          vulnerabilities_found: scanData.vulnerabilities_found || scanData.summary?.vulnerabilities_found,
          total_vulns: scanData.total_vulns || scanData.summary?.total_vulns
        };
        setScanSummary(normalizedSummary);
        setVulnerabilities(scanData.vulnerabilities || []);
        if (scanData.vulnerabilities?.length > 0) {
          setSelectedVuln(scanData.vulnerabilities[0]);
          setShowDataFlow(false);
          setShowOnlyPath(false);
        }
      } catch (err) {
        console.error("Failed to fetch vulnerabilities:", err);
        // Try sessionStorage fallback
        const cached = localStorage.getItem(`scan_${activeScanId}`);
        if (cached) {
          const scanData = JSON.parse(cached);
          const normalizedSummary = {
            ...(scanData.summary || scanData),
            scan_id: scanData.scan_id || scanData.id || scanData.summary?.scan_id,
            status: scanData.status || scanData.summary?.status,
            input_type: scanData.input_type || scanData.summary?.input_type,
            files_scanned: scanData.files_scanned || scanData.summary?.files_scanned,
            total_files: scanData.total_files || scanData.summary?.total_files,
            duration_seconds: scanData.duration_seconds || scanData.summary?.duration_seconds,
            completed_at: scanData.completed_at || scanData.summary?.completed_at,
            by_severity: scanData.by_severity || scanData.summary?.by_severity,
            vulnerabilities_found: scanData.vulnerabilities_found || scanData.summary?.vulnerabilities_found,
            total_vulns: scanData.total_vulns || scanData.summary?.total_vulns
          };
          setScanSummary(normalizedSummary);
          setVulnerabilities(scanData.vulnerabilities || []);
          if (scanData.vulnerabilities?.length > 0) {
            setSelectedVuln(scanData.vulnerabilities[0]);
            setShowDataFlow(false);
            setShowOnlyPath(false);
          }
        }
      }
    };

    fetchVulnerabilities();
  }, [activeScanId]);

  // Fetch graph data
  useEffect(() => {
    if (!activeScanId) return;

    const fetchGraph = async () => {
      try {
        const requestKey = `${activeScanId}:${activeFileId}:${graphType}`;
        pendingGraphKeyRef.current = requestKey;
        setLoading(true);
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (pendingGraphKeyRef.current !== requestKey) {
          return;
        }
        const response = await graphService.getGraph(activeScanId, activeFileId, graphType);
        const data = response.data || response;
        if (pendingGraphKeyRef.current !== requestKey) {
          return;
        }
        setGraphData(data);
        const files = Array.isArray(data?.file?.available_files)
          ? data.file.available_files
          : [];
        setAvailableFiles(files);
        // Avoid auto-switching file here; it can cause flicker loops.
        setActiveFilePath(data?.file?.file_path || null);
        setInitialLoad(false);
      } catch (err) {
        console.error("Failed to fetch graph:", err);
        setError("Graph generation not yet implemented in backend. Coming soon!");
        setGraphData(null);
        setInitialLoad(false);
      } finally {
        if (pendingGraphKeyRef.current === `${activeScanId}:${activeFileId}:${graphType}`) {
          setLoading(false);
        }
      }
    };

    fetchGraph();
  }, [activeScanId, activeFileId, graphType]);

  const vulnerabilitiesForSelector = useMemo(() => {
    if (vulnView === "ai") {
      return vulnerabilities.filter(
        (v) => (v.analysis?.llm_classification?.classification) === "VULNERABLE"
      );
    }
    return vulnerabilities;
  }, [vulnerabilities, vulnView]);

  useEffect(() => {
    if (vulnerabilitiesForSelector.length === 0) {
      setSelectedVuln(null);
      return;
    }
    if (!selectedVuln || !vulnerabilitiesForSelector.find((v) => v.id === selectedVuln.id)) {
      setSelectedVuln(vulnerabilitiesForSelector[0]);
    }
  }, [vulnerabilitiesForSelector, selectedVuln]);

  useEffect(() => {
    if (selectedVuln && !vulnerabilitiesForSelector.find((v) => v.id === selectedVuln.id)) {
      setSelectedVuln(null);
    }
  }, [vulnerabilitiesForSelector, selectedVuln]);

  useEffect(() => {
    if (!selectedVuln?.evidence?.data_flow_path?.length) return;
    if (graphType === "CPG") return;
    setLastGraphType(graphType);
    setGraphType("CPG");
  }, [selectedVuln, graphType]);

  useEffect(() => {
    if (!selectedVuln || !availableFiles.length || !activeScanId) return;
    const vulnFile = selectedVuln.location?.file;
    if (!vulnFile) return;
    const normalizedVuln = vulnFile.replace("\\", "/");
    const match = availableFiles.find((file) => {
      const filePath = (file.path || "").replace("\\", "/");
      if (!filePath) return false;
      return (
        filePath === normalizedVuln
        || filePath.endsWith(`/${normalizedVuln}`)
        || normalizedVuln.endsWith(`/${filePath}`)
      );
    });
    if (!match || !match.id) return;
    const lastAuto = lastAutoFileForVulnRef.current;
    if (lastAuto?.vulnId === selectedVuln.id && lastAuto?.fileId === match.id) {
      return;
    }
    // Only auto-switch if we don't already have a valid file selected.
    const activeIsValid = availableFiles.some((f) => f.id === activeFileId);
    if (!activeIsValid || activeFileId === "main") {
      setActiveFileId(match.id);
      navigate(`/graphs?scanId=${activeScanId}&fileId=${match.id}`, { replace: true });
      lastAutoFileForVulnRef.current = { vulnId: selectedVuln.id, fileId: match.id };
    }
  }, [selectedVuln, availableFiles, activeFileId, activeScanId, navigate]);

  const enablePathView = () => {
    if (graphType !== "CPG") {
      setLastGraphType(graphType);
      setGraphType("CPG");
    }
  };

  const disablePathViewIfNeeded = (nextShowDataFlow, nextShowOnlyPath) => {
    if (!nextShowDataFlow && !nextShowOnlyPath && graphType === "CPG") {
      setGraphType(lastGraphType || "AST");
    }
  };

  const resetView = () => {
    setSelectedNode(null);
    setShowDataFlow(false);
    setShowOnlyPath(false);
    if (graphType === "CPG") {
      setGraphType(lastGraphType || "AST");
    }
  };

  const clearView = () => {
    setGraphData(null);
    setLastGraphData(null);
    setAvailableFiles([]);
    setActiveFilePath(null);
    setVulnerabilities([]);
    setSelectedVuln(null);
    setSelectedNode(null);
    setScanSummary(null);
    setLastScanSummary(null);
    setLastScanId(null);
    setShowDataFlow(false);
    setShowOnlyPath(false);
    setError(null);
    setLoading(false);
    setInitialLoad(false);
  };

  const hasScan = Boolean(activeScanId);
  const displayGraphData = graphData || lastGraphData;
  const displayScanId = activeScanId || lastScanId || "none";
  const displaySummary = scanSummary || lastScanSummary;

  const severityCountsFromVulns = vulnerabilities.reduce(
    (acc, vuln) => {
      const key = (vuln.severity || "").toLowerCase();
      if (acc[key] !== undefined) {
        acc[key] += 1;
      }
      acc.total += 1;
      return acc;
    },
    { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
  );

  const summaryBySeverity = displaySummary?.by_severity || {};
  const summaryCounts = {
    total: Number(
      displaySummary?.vulnerabilities_found ??
        displaySummary?.total_vulns ??
        severityCountsFromVulns.total
    ),
    critical: summaryBySeverity.critical ?? severityCountsFromVulns.critical,
    high: summaryBySeverity.high ?? severityCountsFromVulns.high,
    medium: summaryBySeverity.medium ?? severityCountsFromVulns.medium,
    low: summaryBySeverity.low ?? severityCountsFromVulns.low
  };
  const showSidePanel = Boolean(selectedNode || selectedVuln || displaySummary);
  const durationSeconds = Number(displaySummary?.duration_seconds);
  const durationLabel = Number.isFinite(durationSeconds)
    ? `${durationSeconds.toFixed(2)}s`
    : "N/A";

  // Calculate SVG positions for nodes in a circular layout
  const getNodePosition = (index, total, radius = 280) => {
    const angle = (2 * Math.PI * index) / total;
    const centerX = 400;
    const centerY = 300;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  // Render the graph visualization
  const renderGraph = () => {
    if (!hasScan && !displayGraphData) {
      return (
        <div className="gp-state">
          <div className="gp-state-icon">// NO SCAN //</div>
          <div className="gp-state-text">Select a scan to view graphs.</div>
          <button className="v-secondary-btn" onClick={() => navigate("/scan")}>
            Start a scan
          </button>
        </div>
      );
    }

    if ((loading || initialLoad) && (!displayGraphData || !displayGraphData.nodes || displayGraphData.nodes.length === 0)) {
      return (
        <div className="gp-state">
          <div className="gp-state-icon">LOADING {graphType}</div>
          <div className="gp-loading-bar-wrap">
            <div className="gp-loading-bar" />
          </div>
          <div className="gp-state-text">Fetching {graphType} graph data...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="gp-state">
          <div className="gp-state-icon">// ERROR //</div>
          <div className="gp-state-text">{error}</div>
          <div className="gp-state-sub">Try switching to CPG or choose another file.</div>
        </div>
      );
    }

    if (!displayGraphData || !displayGraphData.nodes || displayGraphData.nodes.length === 0) {
      return (
        <div className="gp-state">
          <div className="gp-state-icon">// NO DATA //</div>
          <div className="gp-state-text">No graph data available</div>
          <div className="gp-state-sub">
            Run a scan on this file or select another file from the list.
          </div>
        </div>
      );
    }

    const pathNodes = selectedVuln?.evidence?.data_flow_path || [];
    const vulnerablePath = new Set(pathNodes);

    const isPathMode = showDataFlow || showOnlyPath;

    // Filter nodes: only show nodes in the vulnerable path when requested
    let nodesToShow = displayGraphData.nodes || [];
    let edgesToShow = displayGraphData.edges || [];
    if (showOnlyPath && vulnerablePath.size > 0) {
      nodesToShow = nodesToShow.filter((node) => vulnerablePath.has(node.id));
      edgesToShow = edgesToShow.filter(
        (edge) => vulnerablePath.has(edge.from) && vulnerablePath.has(edge.to)
      );
    }

    const nodeIndexById = new Map(nodesToShow.map((node, idx) => [node.id, idx]));
    const pathEdges = [];
    if (pathNodes.length > 1) {
      for (let i = 0; i < pathNodes.length - 1; i += 1) {
        const fromId = pathNodes[i];
        const toId = pathNodes[i + 1];
        if (nodeIndexById.has(fromId) && nodeIndexById.has(toId)) {
          pathEdges.push({ from: fromId, to: toId });
        }
      }
    }

    return (
      <svg
        width="100%"
        height="600"
        viewBox="0 0 800 600"
        style={{ background: '#080d1a', borderRadius: '8px', border: '1px solid rgba(34,211,238,0.08)' }}
      >
        {/* Arrow markers — userSpaceOnUse so size is absolute px, not stroke-relative */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7"
            refX="9" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L0,7 L10,3.5 z" fill="#2a4a6b" />
          </marker>
          <marker id="arrowhead-red" markerWidth="10" markerHeight="7"
            refX="9" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L0,7 L10,3.5 z" fill="#ef4444" />
          </marker>
        </defs>

        {/* Draw edges */}
        <g className="edges">
          {edgesToShow.map((edge, idx) => {
            const fromNode = nodesToShow.find(n => n.id === edge.from);
            const toNode   = nodesToShow.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const fromPos = getNodePosition(nodesToShow.indexOf(fromNode), nodesToShow.length);
            const toPos   = getNodePosition(nodesToShow.indexOf(toNode),   nodesToShow.length);

            // Direction vector
            const dx  = toPos.x - fromPos.x;
            const dy  = toPos.y - fromPos.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;

            // Radii — path nodes are larger
            const fromR = vulnerablePath.has(fromNode.id) ? 32 : 24;
            const toR   = vulnerablePath.has(toNode.id)   ? 32 : 24;

            // Start at from-circle edge, end just before to-circle edge (arrowhead fills the gap)
            const x1 = fromPos.x + (dx / len) * fromR;
            const y1 = fromPos.y + (dy / len) * fromR;
            const x2 = toPos.x   - (dx / len) * (toR + 11); // 11 = arrowhead length
            const y2 = toPos.y   - (dy / len) * (toR + 11);

            // Skip zero-length lines (self-loops or coincident nodes)
            if (Math.sqrt((x2-x1)**2 + (y2-y1)**2) < 5) return null;

            const isInPath   = vulnerablePath.has(edge.from) && vulnerablePath.has(edge.to);
            const edgeOpacity = isPathMode ? (isInPath ? 1 : 0.1) : (isInPath ? 0.85 : 0.35);
            const edgeStroke  = isInPath ? "#ef4444" : "#1e3a5f";
            const edgeWidth   = isInPath ? 2.5 : 1;
            const marker      = isInPath ? "url(#arrowhead-red)" : "url(#arrowhead)";

            return (
              <line
                key={`edge-${idx}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={edgeStroke}
                strokeWidth={edgeWidth}
                markerEnd={marker}
                opacity={edgeOpacity}
              />
            );
          })}
        </g>

        {/* Draw nodes */}
        <g className="nodes">
          {nodesToShow.map((node, idx) => {
            const pos = getNodePosition(idx, nodesToShow.length);
            const isInPath = vulnerablePath.has(node.id);
            const pathArray = Array.from(vulnerablePath);
            const isSource = node.id === pathArray[0];
            const isSink = node.id === pathArray[pathArray.length - 1];
            const isSelected = selectedNode?.id === node.id;

            let fillColor = '#0d1424';
            if (isSource) fillColor = '#7f1d1d';
            else if (isSink) fillColor = '#450a0a';
            else if (isInPath) fillColor = '#78350f';
            else if (node.tainted) fillColor = '#3d2e0a';

            const strokeColor = isSelected ? "#22d3ee" : (isInPath ? "#ef4444" : "#1e3a5f");
            const strokeWidth = isSelected ? 3 : (isInPath ? 2.5 : 1.5);

            return (
              <g
                key={node.id}
                className="node"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedNode(node)}
              >
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isInPath ? 30 : 22}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={0.92}
                >
                  {isInPath && (
                    <animate
                      attributeName="r"
                      values="30;34;30"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>

                {/* Node label */}
                <text
                  x={pos.x}
                  y={pos.y - 35}
                  fill={isInPath ? "#fca5a5" : "#94a3b8"}
                  fontSize="11"
                  fontWeight={isInPath ? "bold" : "normal"}
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
                </text>

                {/* Node type */}
                <text
                  x={pos.x}
                  y={pos.y + 42}
                  fill="#334155"
                  fontSize="9"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {node.type}
                </text>

                {/* Line number */}
                {node.properties?.line && (
                  <text
                    x={pos.x}
                    y={pos.y + 54}
                    fill="#1e3a5f"
                    fontSize="8"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    L{node.properties.line}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Legend */}
        <g className="legend" transform="translate(15, 15)">
          <rect width="150" height="125" fill="rgba(8,13,26,0.92)" rx="5" stroke="rgba(34,211,238,0.12)" strokeWidth="1" />
          <circle cx="15" cy="18" r="6" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
          <text x="27" y="22" fill="#94a3b8" fontSize="10" fontFamily="monospace">Taint Source</text>
          <circle cx="15" cy="38" r="6" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="27" y="42" fill="#94a3b8" fontSize="10" fontFamily="monospace">Flow Path</text>
          <circle cx="15" cy="58" r="6" fill="#450a0a" stroke="#dc2626" strokeWidth="1.5" />
          <text x="27" y="62" fill="#94a3b8" fontSize="10" fontFamily="monospace">Taint Sink</text>
          <circle cx="15" cy="78" r="6" fill="#3d2e0a" stroke="#b45309" strokeWidth="1.5" />
          <text x="27" y="82" fill="#94a3b8" fontSize="10" fontFamily="monospace">Tainted Node</text>
          <circle cx="15" cy="98" r="6" fill="#0d1424" stroke="#1e3a5f" strokeWidth="1.5" />
          <text x="27" y="102" fill="#94a3b8" fontSize="10" fontFamily="monospace">Normal Node</text>
          <circle cx="15" cy="118" r="6" fill="#0d1424" stroke="#22d3ee" strokeWidth="2.5" />
          <text x="27" y="122" fill="#22d3ee" fontSize="10" fontFamily="monospace">Selected</text>
        </g>

        {/* Stats */}
        {displayGraphData.meta && (
          <g className="stats" transform="translate(620, 15)">
            <rect width="165" height="78" fill="rgba(8,13,26,0.92)" rx="5" stroke="rgba(34,211,238,0.12)" strokeWidth="1" />
            <text x="10" y="20" fill="rgba(34,211,238,0.7)" fontSize="9" fontFamily="monospace" letterSpacing="2">GRAPH STATS</text>
            <text x="10" y="38" fill="#475569" fontSize="10" fontFamily="monospace">Nodes: {nodesToShow.length}/{displayGraphData.meta.total_nodes}</text>
            <text x="10" y="53" fill="#475569" fontSize="10" fontFamily="monospace">Edges: {edgesToShow.length}/{displayGraphData.meta.total_edges}</text>
            <text x="10" y="68" fill="#475569" fontSize="10" fontFamily="monospace">Tainted: {displayGraphData.meta.tainted_nodes}</text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="gp-page">
      {/* Header */}
      <div className="gp-header">
        <h1 className="gp-title" data-text="GRAPH VISUALIZATION">
          Graph Visualization
        </h1>
        <p className="gp-scan-id">
          SCAN_ID: <code>{displayScanId || "-"}</code>
        </p>
      </div>

      {/* Controls */}
      <div className="gp-controls">
        {!hasScan && displayGraphData && (
          <div className="gp-stale-banner">
            <span>Showing last loaded graph. Select a scan to update it.</span>
            <button className="gp-clear-btn" onClick={clearView}>
              Clear view
            </button>
          </div>
        )}

        {/* Graph Type Selector */}
        <div className="gp-type-group">
          <span className="gp-type-label">Type:</span>
          {GRAPH_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setGraphType(type)}
              disabled={!hasScan || showDataFlow || showOnlyPath}
              className={`gp-type-btn${graphType === type ? " gp-type-btn--active" : ""}`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* File Selector */}
        {hasScan && availableFiles.length > 0 && (
          <div className="gp-file-group">
            <span className="gp-type-label">File:</span>
            <select
              value={activeFileId}
              onChange={(e) => {
                const nextId = e.target.value;
                setActiveFileId(nextId);
                navigate(`/graphs?scanId=${activeScanId}&fileId=${nextId}`, { replace: true });
              }}
              disabled={!hasScan}
              className="gp-select gp-select--wide"
            >
              {availableFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.path || file.id}
                </option>
              ))}
            </select>
            {activeFilePath && (
              <span className="gp-file-path" title={activeFilePath}>
                {activeFilePath}
              </span>
            )}
          </div>
        )}

        {/* Vulnerability Selector */}
        {hasScan && vulnerabilitiesForSelector.length > 0 && (
          <div className="gp-vuln-group">
            <span className="gp-type-label">Vuln:</span>
            <div className="rp6-toggle">
              <button
                type="button"
                className={`rp6-toggle-btn ${vulnView === "all" ? "active" : ""}`}
                onClick={() => setVulnView("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`rp6-toggle-btn ${vulnView === "ai" ? "active" : ""}`}
                onClick={() => setVulnView("ai")}
              >
                AI-validated
              </button>
            </div>
            <select
              value={selectedVuln?.id || ''}
              onChange={(e) => {
                const vuln = vulnerabilitiesForSelector.find(v => v.id === e.target.value);
                setSelectedVuln(vuln);
                setShowDataFlow(false);
                setShowOnlyPath(false);
              }}
              disabled={!hasScan}
              className="gp-select gp-select--flex"
            >
              {vulnerabilitiesForSelector.map(vuln => (
                <option key={vuln.id} value={vuln.id}>
                  {vuln.type} - {vuln.severity} (Line {vuln.location?.start_line}) {vuln.location?.file ? `- ${vuln.location.file}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Show Data Flow Toggle */}
        {selectedVuln && selectedVuln.evidence?.data_flow_path && (
          <>
            <button
              onClick={() => {
                const next = !showDataFlow;
                setShowDataFlow(next);
                if (next) {
                  enablePathView();
                } else {
                  disablePathViewIfNeeded(false, showOnlyPath);
                }
              }}
              className={`gp-flow-btn${showDataFlow ? " gp-flow-btn--red" : ""}`}
            >
              {showDataFlow ? 'Hide Data Flow' : 'Show Data Flow'}
            </button>
            <button
              onClick={() => {
                const next = !showOnlyPath;
                setShowOnlyPath(next);
                if (next) {
                  enablePathView();
                } else {
                  disablePathViewIfNeeded(showDataFlow, false);
                }
              }}
              className={`gp-flow-btn${showOnlyPath ? " gp-flow-btn--amber" : ""}`}
            >
              {showOnlyPath ? 'Full Graph' : 'Only Path'}
            </button>
            <button onClick={resetView} className="gp-flow-btn">
              Reset
            </button>
          </>
        )}
      </div>

      {/* Vulnerability Info Banner */}
      {selectedVuln && (
        <div className="gp-vuln-banner">
          <div className="gp-vuln-banner-row">
            <div><strong>Type:</strong> {selectedVuln.type}</div>
            <div>
              <strong>Severity:</strong>{" "}
              <span className="gp-vuln-severity-tag">{selectedVuln.severity}</span>
            </div>
            <div><strong>Source:</strong> <code>{selectedVuln.evidence?.source}</code></div>
            <div><strong>Sink:</strong> <code>{selectedVuln.evidence?.sink}</code></div>
            <div><strong>Path Nodes:</strong> {selectedVuln.evidence?.data_flow_path?.length || 0}</div>
          </div>
        </div>
      )}

      {/* Graph Canvas with Node Info Panel */}
      <div className="gp-canvas-area">
        {/* Main Graph */}
        <div className={showSidePanel ? "gp-canvas-wrap gp-canvas-wrap--narrow" : "gp-canvas-wrap"}>
          {renderGraph()}
        </div>

        {/* Side Panel */}
        {showSidePanel && (
          <div className="gp-side">

            {vulnerabilitiesForSelector.length > 0 && (
              <div className="gp-side-vuln-section">
                <div className="gp-side-vuln-title">Vulnerabilities in file</div>
                <div className="gp-vuln-list">
                  {vulnerabilitiesForSelector.map((vuln) => (
                    <button
                      key={vuln.id}
                      onClick={() => {
                        setSelectedVuln(vuln);
                        setShowDataFlow(false);
                        setShowOnlyPath(false);
                      }}
                      className={`gp-vuln-item${selectedVuln?.id === vuln.id ? " gp-vuln-item--active" : ""}`}
                    >
                      <div className="gp-vuln-item-name">{vuln.type}</div>
                      <div className="gp-vuln-item-meta">
                        {vuln.severity} &bull; Line {vuln.location?.start_line || '-'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedNode ? (
              <div>
                <div className="gp-node-header">
                  <h3 className="gp-node-title">Node Information</h3>
                  <button className="gp-close-btn" onClick={() => setSelectedNode(null)}>
                    ✕
                  </button>
                </div>

                <div className="gp-node-fields">
                  <div>
                    <div className="gp-field-label">ID</div>
                    <div className="gp-field-value">{selectedNode.id}</div>
                  </div>

                  <div>
                    <div className="gp-field-label">Label</div>
                    <div className="gp-field-value" style={{ fontWeight: 600 }}>{selectedNode.label}</div>
                  </div>

                  <div>
                    <div className="gp-field-label">Type</div>
                    <div className="gp-field-value gp-field-value--blue">{selectedNode.type}</div>
                  </div>

                  {selectedNode.node_type && (
                    <div>
                      <div className="gp-field-label">Node Type</div>
                      <div className="gp-field-value gp-field-value--purple">{selectedNode.node_type}</div>
                    </div>
                  )}

                  <div>
                    <div className="gp-field-label">Tainted</div>
                    <div className={`gp-field-value ${selectedNode.tainted ? "gp-field-value--tainted" : "gp-field-value--safe"}`}>
                      {selectedNode.tainted ? 'YES' : 'NO'}
                    </div>
                  </div>

                  {selectedNode.properties && (
                    <div>
                      <div className="gp-field-label">Properties</div>
                      <div className="gp-field-value">
                        {selectedNode.properties.file && (
                          <div style={{ marginBottom: '0.3rem' }}>
                            <strong style={{ color: 'rgba(148,163,184,0.6)' }}>File:</strong> {selectedNode.properties.file}
                          </div>
                        )}
                        {selectedNode.properties.line && (
                          <div style={{ marginBottom: '0.3rem' }}>
                            <strong style={{ color: 'rgba(148,163,184,0.6)' }}>Line:</strong> {selectedNode.properties.line}
                          </div>
                        )}
                        {selectedNode.properties.column && (
                          <div style={{ marginBottom: '0.3rem' }}>
                            <strong style={{ color: 'rgba(148,163,184,0.6)' }}>Column:</strong> {selectedNode.properties.column}
                          </div>
                        )}
                        {(selectedNode.properties.value !== null && selectedNode.properties.value !== undefined) && (
                          <div>
                            <strong style={{ color: 'rgba(148,163,184,0.6)' }}>Value:</strong> {String(selectedNode.properties.value)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedVuln && selectedVuln.evidence?.data_flow_path && (
                    <div>
                      <div className="gp-field-label">In Vuln Path</div>
                      <div className={`gp-field-value ${
                        selectedVuln.evidence.data_flow_path.includes(selectedNode.id)
                          ? "gp-field-value--path"
                          : "gp-field-value--nopath"
                      }`}>
                        {selectedVuln.evidence.data_flow_path.includes(selectedNode.id)
                          ? 'Part of vulnerable path'
                          : 'Not in path'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="gp-node-empty">Select a node to see details.</div>
            )}

            <div className="gp-path-section">
              <h4 className="gp-path-title">Vulnerable Path</h4>
              {selectedVuln?.evidence?.data_flow_path?.length ? (
                <>
                  <div className="gp-path-box">
                    {selectedVuln.evidence.data_flow_path.map((nodeId, idx) => (
                      <div key={nodeId} className="gp-path-item">
                        {idx + 1}. {nodeId}
                      </div>
                    ))}
                  </div>
                  <div className="gp-path-flow">
                    {selectedVuln.evidence.data_flow_path.join(" → ")}
                  </div>
                </>
              ) : (
                <div className="gp-path-empty">No data flow path available.</div>
              )}
            </div>

            <div className="gp-summary-section">
              <h4 className="gp-summary-title">Report Summary</h4>
              {displaySummary ? (
                <div className="gp-summary-text">
                  <div><strong>Input type:</strong> {displaySummary.input_type || "N/A"}</div>
                  <div><strong>Files scanned:</strong> {displaySummary.files_scanned || 0}/{displaySummary.total_files || 0}</div>
                  <div><strong>Duration:</strong> {durationLabel}</div>
                  <div><strong>Completed:</strong> {displaySummary.completed_at ? new Date(displaySummary.completed_at).toLocaleString() : "N/A"}</div>
                  <div className="gp-summary-counts">
                    <strong>Total:</strong> {summaryCounts.total} &nbsp;|&nbsp;
                    <span style={{ color: '#f87171' }}>C: {summaryCounts.critical}</span> &nbsp;|&nbsp;
                    <span style={{ color: '#fb923c' }}>H: {summaryCounts.high}</span> &nbsp;|&nbsp;
                    <span style={{ color: '#facc15' }}>M: {summaryCounts.medium}</span> &nbsp;|&nbsp;
                    <span style={{ color: '#4ade80' }}>L: {summaryCounts.low}</span>
                  </div>
                </div>
              ) : (
                <div className="gp-summary-empty">Run or select a scan to see the summary.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GraphsPage;
