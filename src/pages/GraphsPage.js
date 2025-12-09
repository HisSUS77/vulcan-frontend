// src/pages/GraphsPage.js
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../App.css";
import { graphService, scanService } from "../api/services";

const GRAPH_TYPES = ["AST", "CPG"];

function GraphsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get("scanId");
  const fileId = searchParams.get("fileId") || "main";
  
  const [graphType, setGraphType] = useState("AST");
  const [graphData, setGraphData] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [selectedVuln, setSelectedVuln] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDataFlow, setShowDataFlow] = useState(false);

  // Redirect to scan page if no scanId provided
  useEffect(() => {
    if (!scanId) {
      const lastScanId = sessionStorage.getItem('lastScanId');
      if (lastScanId) {
        navigate(`/graphs?scanId=${lastScanId}&fileId=main`);
      } else {
        navigate("/scan");
      }
    }
  }, [scanId, navigate]);

  // Fetch scan summary to get vulnerabilities
  useEffect(() => {
    if (!scanId) return;
    
    const fetchVulnerabilities = async () => {
      try {
        const response = await scanService.getSummary(scanId);
        const scanData = response.data || response;
        setVulnerabilities(scanData.vulnerabilities || []);
        if (scanData.vulnerabilities?.length > 0) {
          setSelectedVuln(scanData.vulnerabilities[0]);
        }
      } catch (err) {
        console.error("Failed to fetch vulnerabilities:", err);
        // Try sessionStorage fallback
        const cached = sessionStorage.getItem(`scan_${scanId}`);
        if (cached) {
          const scanData = JSON.parse(cached);
          setVulnerabilities(scanData.vulnerabilities || []);
          if (scanData.vulnerabilities?.length > 0) {
            setSelectedVuln(scanData.vulnerabilities[0]);
          }
        }
      }
    };

    fetchVulnerabilities();
  }, [scanId]);

  // Fetch graph data
  useEffect(() => {
    if (!scanId) return;
    
    const fetchGraph = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await graphService.getGraph(scanId, fileId, graphType);
        const data = response.data || response;
        setGraphData(data);
      } catch (err) {
        console.error("Failed to fetch graph:", err);
        setError("Graph generation not yet implemented in backend. Coming soon!");
        setGraphData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [scanId, fileId, graphType]);

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
    if (loading) {
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
          <div style={{ fontSize: '3rem' }}>📊</div>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>{error}</div>
          <div style={{ fontSize: '0.9rem', color: '#999' }}>
            Graph type: {graphType} | Scan ID: {scanId}
          </div>
        </div>
      );
    }

    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '500px',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '3rem' }}>🔍</div>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>No graph data available</div>
        </div>
      );
    }

    const vulnerablePath = selectedVuln && showDataFlow 
      ? new Set(selectedVuln.evidence?.data_flow_path || [])
      : new Set();

    // Filter nodes: if showDataFlow is true, only show nodes in vulnerable path
    let nodesToShow = graphData.nodes || [];
    let edgesToShow = graphData.edges || [];
    
    if (showDataFlow && vulnerablePath.size > 0) {
      nodesToShow = nodesToShow.filter(node => vulnerablePath.has(node.id));
      edgesToShow = edgesToShow.filter(edge => 
        vulnerablePath.has(edge.from) && vulnerablePath.has(edge.to)
      );
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

            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={isInPath ? "#ff0000" : "#444"}
                  strokeWidth={isInPath ? 3 : 1.5}
                  markerEnd={isInPath ? "url(#arrowhead-red)" : "url(#arrowhead)"}
                  opacity={isInPath ? 1 : 0.6}
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
                  fill={isInPath ? "#ff6b6b" : "#888"}
                  fontSize="9"
                  textAnchor="middle"
                >
                  {edge.label || edge.type}
                </text>
              </g>
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
        {graphData.meta && (
          <g className="stats" transform="translate(605, 15)">
            <rect width="180" height="75" fill="#1a1f35" opacity="0.9" rx="5" />
            <text x="10" y="22" fill="#e5e7eb" fontSize="11" fontWeight="bold">Graph Stats</text>
            <text x="10" y="40" fill="#9ca3af" fontSize="10">Nodes: {nodesToShow.length}/{graphData.meta.total_nodes}</text>
            <text x="10" y="55" fill="#9ca3af" fontSize="10">Edges: {edgesToShow.length}/{graphData.meta.total_edges}</text>
            <text x="10" y="70" fill="#9ca3af" fontSize="10">Tainted: {graphData.meta.tainted_nodes}</text>
          </g>
        )}
      </svg>
    );
  };

  if (!scanId) {
    return null;
  }

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
          }}>{scanId}</code>
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
        {/* Graph Type Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Graph Type:</label>
          {GRAPH_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setGraphType(type)}
              style={{
                padding: '0.5rem 1rem',
                background: graphType === type ? '#3b82f6' : '#1f2937',
                color: graphType === type ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: graphType === type ? 'bold' : 'normal'
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Vulnerability Selector */}
        {vulnerabilities.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
            <label style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Vulnerability:</label>
            <select
              value={selectedVuln?.id || ''}
              onChange={(e) => {
                const vuln = vulnerabilities.find(v => v.id === e.target.value);
                setSelectedVuln(vuln);
                setShowDataFlow(false);
              }}
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
              {vulnerabilities.map(vuln => (
                <option key={vuln.id} value={vuln.id}>
                  {vuln.type} - {vuln.severity} (Line {vuln.location?.start_line})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Show Data Flow Toggle */}
        {selectedVuln && selectedVuln.evidence?.data_flow_path && (
          <button
            onClick={() => setShowDataFlow(!showDataFlow)}
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
            {showDataFlow ? '✓ Hide Data Flow' : 'Show Data Flow Path'}
          </button>
        )}
      </div>

      {/* Vulnerability Info Banner */}
      {selectedVuln && showDataFlow && (
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

        {/* Node Info Panel */}
        {selectedNode && (
          <div style={{
            flex: 1,
            background: '#020617',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #1f2937',
            maxHeight: '600px',
            overflow: 'auto'
          }}>
            {/* Close button */}
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
                ✕
              </button>
            </div>

            {/* Node details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* ID */}
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

              {/* Label */}
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

              {/* Type */}
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

              {/* Node Type */}
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

              {/* Tainted Status */}
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
                  {selectedNode.tainted ? '⚠️ YES' : '✓ NO'}
                </div>
              </div>

              {/* Properties */}
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
                    {selectedNode.properties.value !== null && selectedNode.properties.value !== undefined && (
                      <div>
                        <strong style={{ color: '#9ca3af' }}>Value:</strong> {String(selectedNode.properties.value)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vulnerability Path Status */}
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
                    {selectedVuln.evidence.data_flow_path.includes(selectedNode.id) ? '🔴 Part of Vulnerable Path' : 'Not in path'}
                  </div>
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
