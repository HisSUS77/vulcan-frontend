// src/pages/GraphsPage.js
import React, { useState, useEffect, useRef } from "react";
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
        if (data?.file?.file_id) {
          setActiveFileId(data.file.file_id);
        }
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

  const vulnerabilitiesForSelector = vulnerabilities;

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
    if (match && match.id && match.id !== activeFileId) {
      setActiveFileId(match.id);
      navigate(`/graphs?scanId=${activeScanId}&fileId=${match.id}`, { replace: true });
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '500px',
          gap: '1rem',
          color: '#94a3b8'
        }}>
          <div style={{ fontSize: '1.2rem' }}>Select a scan to view graphs.</div>
          <button className="v-secondary-btn" onClick={() => navigate("/scan")}>
            Start a scan
          </button>
        </div>
      );
    }

    if ((loading || initialLoad) && (!displayGraphData || !displayGraphData.nodes || displayGraphData.nodes.length === 0)) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '500px',
          fontSize: '1.2rem',
          color: '#666'
        }}>
          Loading {graphType} graph...
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '500px',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '3rem' }}>Graph error</div>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>{error}</div>
          <div style={{ fontSize: '0.9rem', color: '#999' }}>
            Try switching to CPG or choose another file.
          </div>
        </div>
      );
    }

    if (!displayGraphData || !displayGraphData.nodes || displayGraphData.nodes.length === 0) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '500px',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '3rem' }}>No data</div>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>No graph data available</div>
          <div style={{ fontSize: '0.9rem', color: '#999' }}>
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
        style={{ background: '#0a0e1a', borderRadius: '8px' }}
      >
        {/* Define arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="25"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#666" />
          </marker>
          <marker
            id="arrowhead-red"
            markerWidth="10"
            markerHeight="10"
            refX="25"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#ff0000" />
          </marker>
        </defs>

        {/* Draw edges */}
        <g className="edges">
          {edgesToShow.map((edge, idx) => {
            const fromNode = nodesToShow.find(n => n.id === edge.from);
            const toNode = nodesToShow.find(n => n.id === edge.to);
            
            if (!fromNode || !toNode) return null;

            const fromPos = getNodePosition(nodesToShow.indexOf(fromNode), nodesToShow.length);
            const toPos = getNodePosition(nodesToShow.indexOf(toNode), nodesToShow.length);

            const isInPath = vulnerablePath.has(edge.from) && vulnerablePath.has(edge.to);
            const edgeOpacity = isPathMode ? (isInPath ? 1 : 0.2) : (isInPath ? 0.95 : 0.6);
            const edgeStroke = isInPath ? "#ff0000" : "#334155";
            const edgeWidth = isInPath ? 3 : 1.4;
            const edgeMarker = isInPath && isPathMode ? "url(#arrowhead-red)" : "none";

            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={edgeStroke}
                  strokeWidth={edgeWidth}
                  markerEnd={edgeMarker}
                  opacity={edgeOpacity}
                >
                  {isInPath && (
                    <animate
                      attributeName="stroke-opacity"
                      values="1;0.5;1"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  )}
                </line>
                {/* Edge label */}
                <text
                  x={(fromPos.x + toPos.x) / 2}
                  y={(fromPos.y + toPos.y) / 2}
                  fill={isInPath ? "#ff6b6b" : "#94a3b8"}
                  fontSize="9"
                  textAnchor="middle"
                >
                  {edge.label || edge.type}
                </text>
              </g>
            );
          })}
        </g>

        {/* Draw explicit vulnerable path arrows */}
        {pathEdges.length > 0 && (
          <g className="path-edges">
            {pathEdges.map((edge, idx) => {
              const fromIdx = nodeIndexById.get(edge.from);
              const toIdx = nodeIndexById.get(edge.to);
              const fromPos = getNodePosition(fromIdx, nodesToShow.length);
              const toPos = getNodePosition(toIdx, nodesToShow.length);
              return (
                <line
                  key={`path-edge-${idx}`}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke="#ef4444"
                  strokeWidth={isPathMode ? 3.5 : 2}
                  markerEnd="url(#arrowhead-red)"
                  opacity={isPathMode ? 0.95 : 0.7}
                />
              );
            })}
          </g>
        )}

        {/* Draw nodes */}
        <g className="nodes">
          {nodesToShow.map((node, idx) => {
            const pos = getNodePosition(idx, nodesToShow.length);
            const isInPath = vulnerablePath.has(node.id);
            const pathArray = Array.from(vulnerablePath);
            const isSource = node.id === pathArray[0];
            const isSink = node.id === pathArray[pathArray.length - 1];
            const isSelected = selectedNode?.id === node.id;

            let fillColor = '#1a1f35';
            if (isSource) fillColor = '#ff6b6b';
            else if (isSink) fillColor = '#cc0000';
            else if (isInPath) fillColor = '#ffd93d';
            else if (node.tainted) fillColor = '#ffec99';

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
                  stroke={isSelected ? "#00ff00" : (isInPath ? "#ff0000" : "#4a5568")}
                  strokeWidth={isSelected ? 4 : (isInPath ? 3 : 2)}
                  opacity={0.9}
                >
                  {isInPath && (
                    <animate
                      attributeName="r"
                      values={isInPath ? "30;35;30" : "22;25;22"}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
                
                {/* Node label */}
                <text
                  x={pos.x}
                  y={pos.y - 35}
                  fill="#e5e7eb"
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
                  y={pos.y + 40}
                  fill="#9ca3af"
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
                    y={pos.y + 52}
                    fill="#6b7280"
                    fontSize="8"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    Line {node.properties.line}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Legend */}
        <g className="legend" transform="translate(15, 15)">
          <rect width="180" height="130" fill="#1a1f35" opacity="0.9" rx="5" />
          
          <circle cx="15" cy="18" r="7" fill="#ff6b6b" />
          <text x="28" y="22" fill="#e5e7eb" fontSize="11">Taint Source</text>
          
          <circle cx="15" cy="38" r="7" fill="#ffd93d" />
          <text x="28" y="42" fill="#e5e7eb" fontSize="11">Flow Path</text>
          
          <circle cx="15" cy="58" r="7" fill="#cc0000" />
          <text x="28" y="62" fill="#e5e7eb" fontSize="11">Taint Sink</text>
          
          <circle cx="15" cy="78" r="7" fill="#ffec99" />
          <text x="28" y="82" fill="#e5e7eb" fontSize="11">Tainted Node</text>
          
          <circle cx="15" cy="98" r="7" fill="#1a1f35" stroke="#4a5568" strokeWidth="2" />
          <text x="28" y="102" fill="#e5e7eb" fontSize="11">Normal Node</text>
          
          <circle cx="15" cy="118" r="7" fill="#1a1f35" stroke="#00ff00" strokeWidth="3" />
          <text x="28" y="122" fill="#e5e7eb" fontSize="11">Selected</text>
        </g>

        {/* Stats */}
        {displayGraphData.meta && (
          <g className="stats" transform="translate(605, 15)">
            <rect width="180" height="75" fill="#1a1f35" opacity="0.9" rx="5" />
            <text x="10" y="22" fill="#e5e7eb" fontSize="11" fontWeight="bold">Graph Stats</text>
            <text x="10" y="40" fill="#9ca3af" fontSize="10">Nodes: {nodesToShow.length}/{displayGraphData.meta.total_nodes}</text>
            <text x="10" y="55" fill="#9ca3af" fontSize="10">Edges: {edgesToShow.length}/{displayGraphData.meta.total_edges}</text>
            <text x="10" y="70" fill="#9ca3af" fontSize="10">Tainted: {displayGraphData.meta.tainted_nodes}</text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="rv-page" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        padding: '1.5rem', 
        background: '#020617',
        borderBottom: '1px solid #1f2937'
      }}>
        <h1 style={{ 
          margin: '0 0 0.5rem 0', 
          fontSize: '1.8rem',
          color: '#e5e7eb'
        }}>
          Graph Visualization
        </h1>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>
          Scan ID: <code style={{ 
            background: '#1f2937', 
            padding: '2px 8px', 
            borderRadius: '4px',
            color: '#60a5fa'
          }}>{displayScanId || "-"}</code>
        </p>
      </div>

      {/* Controls */}
      <div style={{ 
        padding: '1rem 1.5rem',
        background: '#0a0e1a',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {!hasScan && displayGraphData && (
          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.5rem 0.75rem',
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '8px',
            color: '#cbd5f5',
            fontSize: '0.85rem'
          }}>
            <span>Showing the last loaded graph. Select a scan to update it.</span>
            <button
              onClick={clearView}
              style={{
                padding: '0.35rem 0.75rem',
                background: '#1f2937',
                color: '#e5e7eb',
                border: '1px solid #374151',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Clear view
            </button>
          </div>
        )}
        {/* Graph Type Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Graph Type:</label>
          {GRAPH_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setGraphType(type)}
              disabled={!hasScan || showDataFlow || showOnlyPath}
              style={{
                padding: '0.5rem 1rem',
                background: graphType === type ? '#3b82f6' : '#1f2937',
                color: graphType === type ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                cursor: !hasScan || showDataFlow || showOnlyPath ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: graphType === type ? 'bold' : 'normal',
                opacity: !hasScan || showDataFlow || showOnlyPath ? 0.6 : 1
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* File Selector */}
        {hasScan && availableFiles.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ color: '#9ca3af', fontSize: '0.9rem' }}>File:</label>
            <select
              value={activeFileId}
              onChange={(e) => {
                const nextId = e.target.value;
                setActiveFileId(nextId);
                navigate(`/graphs?scanId=${activeScanId}&fileId=${nextId}`, { replace: true });
              }}
              disabled={!hasScan}
              style={{
                padding: '0.5rem',
                background: '#1f2937',
                color: '#e5e7eb',
                border: '1px solid #374151',
                borderRadius: '6px',
                fontSize: '0.9rem',
                minWidth: '220px'
              }}
            >
              {availableFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.path || file.id}
                </option>
              ))}
            </select>
            {activeFilePath && (
              <span style={{ color: "#94a3b8", fontSize: "0.8rem" }} title={activeFilePath}>
                {activeFilePath}
              </span>
            )}
          </div>
        )}

        {/* Vulnerability Selector */}
        {hasScan && vulnerabilitiesForSelector.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
            <label style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Vulnerability:</label>
            <select
              value={selectedVuln?.id || ''}
              onChange={(e) => {
                const vuln = vulnerabilitiesForSelector.find(v => v.id === e.target.value);
                setSelectedVuln(vuln);
                setShowDataFlow(false);
                setShowOnlyPath(false);
              }}
              disabled={!hasScan}
              style={{
                padding: '0.5rem',
                background: '#1f2937',
                color: '#e5e7eb',
                border: '1px solid #374151',
                borderRadius: '6px',
                fontSize: '0.9rem',
                flex: 1,
                maxWidth: '400px'
              }}
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
              style={{
                padding: '0.5rem 1rem',
                background: showDataFlow ? '#ef4444' : '#1f2937',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: showDataFlow ? 'bold' : 'normal'
              }}
            >
              {showDataFlow ? 'Hide Data Flow' : 'Show Data Flow Path'}
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
              style={{
                padding: '0.5rem 1rem',
                background: showOnlyPath ? '#f59e0b' : '#1f2937',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: showOnlyPath ? 'bold' : 'normal'
              }}
            >
              {showOnlyPath ? 'Show Full Graph' : 'Only Path Nodes'}
            </button>
            <button
              onClick={resetView}
              style={{
                padding: '0.5rem 1rem',
                background: '#1f2937',
                color: '#e5e7eb',
                border: '1px solid #374151',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Reset view
            </button>
          </>
        )}
      </div>

      {/* Vulnerability Info Banner */}
      {selectedVuln && (
        <div style={{
          padding: '1rem 1.5rem',
          background: '#7f1d1d',
          borderBottom: '2px solid #991b1b',
          color: '#fecaca'
        }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <strong>Type:</strong> {selectedVuln.type}
            </div>
            <div>
              <strong>Severity:</strong> <span style={{ 
                padding: '2px 8px', 
                background: '#991b1b',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>{selectedVuln.severity}</span>
            </div>
            <div>
              <strong>Source:</strong> <code>{selectedVuln.evidence?.source}</code>
            </div>
            <div>
              <strong>Sink:</strong> <code>{selectedVuln.evidence?.sink}</code>
            </div>
            <div>
              <strong>Path Nodes:</strong> {selectedVuln.evidence?.data_flow_path?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Graph Canvas with Node Info Panel */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        gap: '1rem',
        background: '#0a0e1a',
        padding: '1rem'
      }}>
        {/* Main Graph */}
        <div style={{ flex: selectedNode ? 2 : 1, overflow: 'auto' }}>
          {renderGraph()}
        </div>

        {/* Side Panel */}
        {showSidePanel && (
          <div style={{
            flex: 1,
            background: '#020617',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #1f2937',
            maxHeight: '600px',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>

            {vulnerabilitiesForSelector.length > 0 && (
              <div style={{
                background: '#111827',
                borderRadius: '8px',
                padding: '1rem',
                border: '1px solid #1f2937'
              }}>
                <div style={{ color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Vulnerabilities in file
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {vulnerabilitiesForSelector.map((vuln) => (
                    <button
                      key={vuln.id}
                      onClick={() => {
                        setSelectedVuln(vuln);
                        setShowDataFlow(false);
                        setShowOnlyPath(false);
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '6px',
                        border: selectedVuln?.id === vuln.id ? '1px solid #ef4444' : '1px solid #1f2937',
                        background: selectedVuln?.id === vuln.id ? '#3f1d1d' : '#0f172a',
                        color: '#e5e7eb',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{vuln.type}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                        {vuln.severity} • Line {vuln.location?.start_line || '-'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedNode ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#e5e7eb', fontSize: '1.2rem' }}>Node Information</h3>
                  <button
                    onClick={() => setSelectedNode(null)}
                    style={{
                      background: '#374151',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      padding: '0.25rem 0.75rem',
                      fontSize: '1rem'
                    }}
                  >
                    X
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.25rem' }}>ID</div>
                    <div style={{
                      color: '#e5e7eb',
                      fontSize: '0.9rem',
                      background: '#1f2937',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      wordBreak: 'break-all'
                    }}>
                      {selectedNode.id}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Label</div>
                    <div style={{
                      color: '#e5e7eb',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      background: '#1f2937',
                      padding: '0.5rem',
                      borderRadius: '4px'
                    }}>
                      {selectedNode.label}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Type</div>
                    <div style={{
                      color: '#60a5fa',
                      fontSize: '0.9rem',
                      background: '#1f2937',
                      padding: '0.5rem',
                      borderRadius: '4px'
                    }}>
                      {selectedNode.type}
                    </div>
                  </div>

                  {selectedNode.node_type && (
                    <div>
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Node Type</div>
                      <div style={{
                        color: '#a78bfa',
                        fontSize: '0.9rem',
                        background: '#1f2937',
                        padding: '0.5rem',
                        borderRadius: '4px'
                      }}>
                        {selectedNode.node_type}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Tainted</div>
                    <div style={{
                      color: selectedNode.tainted ? '#fbbf24' : '#10b981',
                      fontSize: '0.9rem',
                      background: '#1f2937',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      {selectedNode.tainted ? 'YES' : 'NO'}
                    </div>
                  </div>

                  {selectedNode.properties && (
                    <div>
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Properties</div>
                      <div style={{
                        color: '#e5e7eb',
                        fontSize: '0.85rem',
                        background: '#1f2937',
                        padding: '0.75rem',
                        borderRadius: '4px'
                      }}>
                        {selectedNode.properties.file && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#9ca3af' }}>File:</strong> {selectedNode.properties.file}
                          </div>
                        )}
                        {selectedNode.properties.line && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#9ca3af' }}>Line:</strong> {selectedNode.properties.line}
                          </div>
                        )}
                        {selectedNode.properties.column && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#9ca3af' }}>Column:</strong> {selectedNode.properties.column}
                          </div>
                        )}
                        {(selectedNode.properties.value !== null && selectedNode.properties.value !== undefined) && (
                          <div>
                            <strong style={{ color: '#9ca3af' }}>Value:</strong> {String(selectedNode.properties.value)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedVuln && selectedVuln.evidence?.data_flow_path && (
                    <div>
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.25rem' }}>In Vulnerability Path</div>
                      <div style={{
                        color: selectedVuln.evidence.data_flow_path.includes(selectedNode.id) ? '#ef4444' : '#6b7280',
                        fontSize: '0.9rem',
                        background: '#1f2937',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}>
                        {selectedVuln.evidence.data_flow_path.includes(selectedNode.id) ? 'Part of vulnerable path' : 'Not in path'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                Select a node to see details.
              </div>
            )}

            <div style={{ borderTop: '1px solid #1f2937', paddingTop: '1rem' }}>
              <h4 style={{ margin: 0, color: '#e5e7eb', fontSize: '1rem' }}>Vulnerable Path</h4>
              {selectedVuln?.evidence?.data_flow_path?.length ? (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Nodes in order:</div>
                  <div style={{ background: '#111827', borderRadius: '6px', padding: '0.75rem' }}>
                    {selectedVuln.evidence.data_flow_path.map((nodeId, idx) => (
                      <div key={nodeId} style={{ color: '#e5e7eb', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                        {idx + 1}. {nodeId}
                      </div>
                    ))}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    Flow: {selectedVuln.evidence.data_flow_path.join(" -> ")}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
                  No data flow path available for this vulnerability.
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #1f2937', paddingTop: '1rem' }}>
              <h4 style={{ margin: 0, color: '#e5e7eb', fontSize: '1rem' }}>Report Summary</h4>
              {displaySummary ? (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#cbd5f5', lineHeight: '1.6' }}>
                  <div><strong>Input type:</strong> {displaySummary.input_type || "N/A"}</div>
                  <div><strong>Files scanned:</strong> {displaySummary.files_scanned || 0}/{displaySummary.total_files || 0}</div>
                  <div><strong>Duration:</strong> {durationLabel}</div>
                  <div><strong>Completed:</strong> {displaySummary.completed_at ? new Date(displaySummary.completed_at).toLocaleString() : "N/A"}</div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <strong>Total:</strong> {summaryCounts.total} | <strong>Critical:</strong> {summaryCounts.critical} | <strong>High:</strong> {summaryCounts.high} | <strong>Medium:</strong> {summaryCounts.medium} | <strong>Low:</strong> {summaryCounts.low}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
                  Run or select a scan to see the report summary.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GraphsPage;
