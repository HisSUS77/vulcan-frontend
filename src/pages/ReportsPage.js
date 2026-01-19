// src/pages/ReportsPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reportService, scanService } from "../api/services";
import "../App.css";

export default function ReportsPage() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [selectedScan, setSelectedScan] = useState(
    localStorage.getItem("lastScanId")
  );
  const [scanSummary, setScanSummary] = useState(null);
  const [filterBy, setFilterBy] = useState("Severity");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0, accuracy: 0 });
  const [selectedVuln, setSelectedVuln] = useState(null);
  const [exportMessage, setExportMessage] = useState("");

  useEffect(() => {
    fetchScans();
  }, []);

  useEffect(() => {
    if (selectedScan) {
      fetchScanData(selectedScan);
    }
  }, [selectedScan]);

  useEffect(() => {
    if (selectedScan) {
      localStorage.setItem("lastScanId", selectedScan);
    }
  }, [selectedScan]);

  useEffect(() => {
    if (!selectedScan) {
      setScanSummary(null);
      setVulnerabilities([]);
      setSummary({ total: 0, critical: 0, high: 0, medium: 0, low: 0, accuracy: 0 });
    }
  }, [selectedScan]);

  const fetchScans = async () => {
    try {
      // Try API first
      const res = await reportService.list();
      let scanList = res.data || [];
      
      // If API returns empty, try localStorage
      if (scanList.length === 0) {
        const lastScanId = localStorage.getItem('lastScanId');
        if (lastScanId) {
          const cachedScan = localStorage.getItem(`scan_${lastScanId}`);
          if (cachedScan) {
            scanList = [JSON.parse(cachedScan)];
          }
        }
      }
      
      setScans(scanList);
      if (!selectedScan && scanList.length > 0) {
        const stored = localStorage.getItem("lastScanId");
        const match = stored && scanList.find((s) => (s.scan_id || s.id) === stored);
        setSelectedScan(match ? (match.scan_id || match.id) : (scanList[0].scan_id || scanList[0].id));
      }
      if (scanList.length === 0) {
        setSelectedScan(selectedScan || null);
      }
    } catch (err) {
      console.error("Failed to fetch scans:", err);
      // Fallback to localStorage on error
      const lastScanId = localStorage.getItem('lastScanId');
      if (lastScanId) {
        const cachedScan = localStorage.getItem(`scan_${lastScanId}`);
        if (cachedScan) {
          const scanData = JSON.parse(cachedScan);
          setScans([scanData]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchScanData = async (scanId) => {
    try {
      let scanData;
      
      // Try API first
      try {
        const res = await scanService.getSummary(scanId);
        scanData = res.data || {};
      } catch (apiErr) {
        // Fallback to sessionStorage
        const cached = localStorage.getItem(`scan_${scanId}`);
        if (cached) {
          scanData = JSON.parse(cached);
        } else {
          throw apiErr;
        }
      }

      if (!scanData?.vulnerabilities) {
        const reportRes = await reportService.get(scanId);
        scanData = {
          ...(reportRes.data || {}),
          summary: reportRes.data?.summary || {},
          vulnerabilities: reportRes.data?.vulnerabilities || [],
        };
      }
      
      const normalizedSummary = {
        ...(scanData.summary || scanData),
        scan_id: scanData.scan_id || scanData.id || scanData.summary?.scan_id,
        status: scanData.status || scanData.summary?.status,
        input_type: scanData.input_type || scanData.summary?.input_type,
        files_scanned: scanData.files_scanned || scanData.summary?.files_scanned,
        total_files: scanData.total_files || scanData.summary?.total_files,
        duration_seconds: scanData.duration_seconds || scanData.summary?.duration_seconds,
        completed_at: scanData.completed_at || scanData.summary?.completed_at,
      };
      setScanSummary(normalizedSummary);
      
      // Map vulnerabilities from backend format
      const vulns = (scanData.vulnerabilities || []).map(v => ({
        id: v.id,
        severity: v.severity.charAt(0).toUpperCase() + v.severity.slice(1),
        type: v.type,
        cwe: v.cwe,
        owasp: v.owasp,
        file: v.location?.file || "N/A",
        line: `${v.location?.start_line}-${v.location?.end_line}`,
        confidence: Math.round((v.confidence || 0) * 100),
        source: v.evidence?.source,
        sink: v.evidence?.sink,
        pattern: v.evidence?.pattern,
        codeSnippet: v.evidence?.code_snippet,
        analysis: v.analysis,
        llmClassification: v.analysis?.llm_classification?.classification,
        llmExplanation: v.analysis?.llm_classification?.explanation,
        llmRemediation: v.analysis?.llm_classification?.remediation,
        exploitability: v.analysis?.llm_classification?.exploitability,
        staticReason: v.analysis?.static_detection?.reason,
        patchStatus: "Pending" // Will be updated from patch service
      }));
      
      setVulnerabilities(vulns);
      
      // Calculate summary from backend data
      const bySeverity = normalizedSummary.by_severity || {};
      const total = normalizedSummary.vulnerabilities_found
        | normalizedSummary.total_vulns
        | 0;
      const avgConfidence = vulns.length > 0 
        ? Math.round(vulns.reduce((sum, v) => sum + v.confidence, 0) / vulns.length)
        : 0;
      
      setSummary({ 
        total,
        critical: bySeverity.critical || 0,
        high: bySeverity.high || 0,
        medium: bySeverity.medium || 0,
        low: bySeverity.low || 0,
        accuracy: avgConfidence
      });
    } catch (err) {
      console.error("Failed to fetch scan data:", err);
    }
  };

  const handleExportJSON = () => {
    if (!scanSummary) return;
    const dataStr = JSON.stringify(scanSummary, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadBlob(blob, `scan-report-${selectedScan}.json`);
  };

  const handleExportCSV = () => {
    if (!vulnerabilities.length) return;
    
    const headers = ['ID', 'Type', 'Severity', 'CWE', 'OWASP', 'File', 'Lines', 'Confidence', 'Source', 'Sink'];
    const rows = vulnerabilities.map(v => [
      v.id,
      v.type,
      v.severity,
      v.cwe,
      v.owasp,
      v.file,
      v.line,
      `${v.confidence}%`,
      v.source || '',
      v.sink || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, `scan-report-${selectedScan}.csv`);
  };

  const handleExportPDF = async () => {
    if (!selectedScan) return;
    try {
      const response = await scanService.exportPDF(selectedScan);
      const blob = response.data || response; // Handle axios response
      downloadBlob(blob, `vulcan-scan-${selectedScan}-report.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      if (err.response?.status === 404) {
        setExportMessage("Scan not found or not completed yet.");
      } else {
        setExportMessage("Failed to generate PDF report. Please try again.");
      }
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="rv-page">Loading reports...</div>;
  }

  return (
    <div className="rv-page">
      {/* Top row: report dropdown + share/export */}
      <div className="rv-top-row">
        <div className="rv-report-select-wrap">
          <select
            className="rv-report-select"
            value={selectedScan || ""}
            onChange={(e) => setSelectedScan(e.target.value)}
          >
            {scans.map((s) => {
              const date = new Date(s.created_at).toLocaleDateString();
              const time = new Date(s.created_at).toLocaleTimeString();
              const vulnCount = s.total_vulns | s.vulnerabilities_found | 0;
              return (
                <option key={s.scan_id || s.id} value={s.scan_id || s.id}>
                  {(s.scan_id || s.id)} - {date} {time} ({vulnCount} vulns)
                </option>
              );
            })}
          </select>
        </div>

        <div className="rv-top-actions">
          <button className="rv-top-btn" onClick={handleExportJSON} disabled={!vulnerabilities.length}>Export JSON</button>
          <button className="rv-top-btn" onClick={handleExportCSV} disabled={!vulnerabilities.length}>Export CSV</button>
          <button className="rv-top-btn primary" onClick={handleExportPDF} disabled={!vulnerabilities.length}>Export PDF</button>
        </div>
      </div>
      {exportMessage && (
        <div className="acct-error" style={{ marginBottom: "1rem" }}>{exportMessage}</div>
      )}

      {scanSummary ? (
        <div style={{ marginBottom: "1rem", color: "#94a3b8", fontSize: "0.95rem" }}>
          Input type: <strong>{scanSummary.input_type || "N/A"}</strong> | Files scanned:{" "}
          <strong>{scanSummary.files_scanned || 0}/{scanSummary.total_files || 0}</strong>
        </div>
      ) : (
        <div style={{ marginBottom: "1rem", color: "#94a3b8", fontSize: "0.95rem" }}>
          Input type: <strong>-</strong> | Files scanned: <strong>-</strong>
        </div>
      )}

      {/* Summary cards */}
      <div className="rv-summary-row">
        <div className="rv-summary-card">
          <div className="rv-summary-label">Total vulnerabilities</div>
          <div className="rv-summary-value">{summary.total}</div>
        </div>
        <div className="rv-summary-card">
          <div className="rv-summary-label">Critical</div>
          <div className="rv-summary-value rv-critical">{summary.critical}</div>
        </div>
        <div className="rv-summary-card">
          <div className="rv-summary-label">High</div>
          <div className="rv-summary-value" style={{color: '#ff9800'}}>{summary.high}</div>
        </div>
        <div className="rv-summary-card">
          <div className="rv-summary-label">Medium</div>
          <div className="rv-summary-value" style={{color: '#ffc107'}}>{summary.medium}</div>
        </div>
        <div className="rv-summary-card">
          <div className="rv-summary-label">Low</div>
          <div className="rv-summary-value" style={{color: '#4caf50'}}>{summary.low}</div>
        </div>
        <div className="rv-summary-card">
          <div className="rv-summary-label">Avg Confidence</div>
          <div className="rv-summary-value rv-accuracy">{summary.accuracy}%</div>
        </div>
      </div>

      {!scans.length && (
        <div style={{ padding: "1.5rem", background: "#0f172a", borderRadius: "12px", border: "1px solid #1f2937", marginBottom: "1.5rem" }}>
          <div style={{ color: "#e2e8f0", fontSize: "1rem", marginBottom: "0.75rem" }}>No report yet.</div>
          <button className="rv-top-btn primary" onClick={() => navigate("/scan")}>
            Run a scan
          </button>
        </div>
      )}

      {/* Main content row */}
      <div className="rv-main">
        {/* Table side */}
        <div className="rv-table-card">
          <div className="rv-table-header">
            <div className="rv-table-title-row">
              <span className="rv-table-title">Vulnerabilities</span>
            </div>
            <div className="rv-filter-wrap">
              <span className="rv-filter-label">Filter by</span>
              <select
                className="rv-filter-select"
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
              >
                <option value="Severity">Severity</option>
                <option value="Status">Status</option>
                <option value="CWE">CWE</option>
              </select>
            </div>
          </div>

          <div className="rv-table-scroll">
            <table className="rv-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>CWE</th>
                  <th>OWASP</th>
                  <th>File</th>
                  <th>Lines</th>
                  <th>Confidence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!selectedScan ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                      Select a scan to view its report.
                    </td>
                  </tr>
                ) : vulnerabilities.length > 0 ? (
                  vulnerabilities.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedVuln(selectedVuln?.id === row.id ? null : row)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedVuln?.id === row.id ? '#f0f7ff' : 'transparent'
                      }}
                    >
                      <td title={row.type}>
                        {row.type}
                      </td>
                      <td>
                        <span
                          className={
                            "rv-tag rv-tag-sev " +
                            (row.severity || "medium").toLowerCase()
                          }
                        >
                          {row.severity}
                        </span>
                      </td>
                      <td className="rv-mono">{row.cwe}</td>
                      <td className="rv-mono">{row.owasp}</td>
                      <td className="rv-mono" title={row.file}>
                        {row.file}
                      </td>
                      <td className="rv-mono">{row.line}</td>
                      <td>{row.confidence}%</td>
                      <td>
                        <button
                          className="rv-tag rv-tag-status pending"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVuln(selectedVuln?.id === row.id ? null : row);
                          }}
                          style={{ cursor: 'pointer', border: 'none', padding: '4px 8px' }}
                        >
                          {selectedVuln?.id === row.id ? 'Hide Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                      No vulnerabilities found in this scan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right-side panels */}
        <div className="rv-side">
          <div className="rv-side-card">
            <div className="rv-side-title">Scan Info</div>
            {scanSummary ? (
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p><b>Scan ID:</b> {scanSummary.scan_id}</p>
                <p><b>Status:</b> {scanSummary.status}</p>
                <p><b>Input Type:</b> {scanSummary.input_type}</p>
                <p><b>Files Scanned:</b> {scanSummary.files_scanned} / {scanSummary.total_files}</p>
                <p><b>Duration:</b> {scanSummary.duration_seconds?.toFixed(2)}s</p>
                <p><b>Completed:</b> {scanSummary.completed_at ? new Date(scanSummary.completed_at).toLocaleString() : "N/A"}</p>
              </div>
            ) : (
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#94a3b8' }}>
                Select a scan to see details.
              </div>
            )}
          </div>

          <div className="rv-side-card">
            <div className="rv-side-title">Compliant with</div>
            <div className="rv-compliance-pill">
              <span className="rv-compliance-dot" />
              OWASP Top 10 / CWE / SANS 25
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Vulnerability Details Section Below */}
      {selectedVuln && (
        <div style={{ 
          marginTop: '1.5rem', 
          background: 'white', 
          borderRadius: '8px', 
          padding: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>Vulnerability Details</h2>
            <button 
              onClick={() => setSelectedVuln(null)}
              style={{ 
                background: '#ff4444', 
                color: 'white',
                border: 'none', 
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '8px 20px',
                fontWeight: 'bold'
              }}
            >
              ✕ Close
            </button>
          </div>
          
          {/* Horizontal Two-Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', overflow: 'hidden' }}>
            {/* Left Column */}
            <div style={{ minWidth: 0 }}>
              {/* Header Section */}
              <div style={{ background: '#f5f5f5', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: '#333', wordWrap: 'break-word' }}>{selectedVuln.type}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`rv-tag rv-tag-sev ${selectedVuln.severity.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                    {selectedVuln.severity}
                  </span>
                  {selectedVuln.llmClassification && (
                    <span style={{ 
                      padding: '6px 14px', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      background: selectedVuln.llmClassification === 'VULNERABLE' ? '#ff4444' : '#ff9800',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      AI: {selectedVuln.llmClassification}
                    </span>
                  )}
                  {selectedVuln.exploitability !== undefined && (
                    <span style={{ 
                      padding: '6px 14px', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      background: '#9c27b0',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      Exploitability: {Math.round(selectedVuln.exploitability * 100)}%
                    </span>
                  )}
                  <span style={{ 
                    padding: '6px 14px', 
                    borderRadius: '4px', 
                    fontSize: '0.85rem',
                    background: '#2196f3',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    Confidence: {selectedVuln.confidence}%
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div style={{ marginBottom: '1.5rem', background: '#fafafa', padding: '1rem', borderRadius: '6px', overflow: 'hidden' }}>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#333', wordWrap: 'break-word' }}>
                  <b>ID:</b> <code style={{ background: '#e0e0e0', padding: '3px 8px', borderRadius: '4px', fontSize: '0.9rem', color: '#000', wordBreak: 'break-all' }}>{selectedVuln.id}</code>
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#333' }}>
                  <b>CWE:</b> {selectedVuln.cwe} &nbsp;|&nbsp; <b>OWASP:</b> {selectedVuln.owasp}
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#333', wordWrap: 'break-word' }}>
                  <b>File:</b> <code style={{ background: '#e0e0e0', padding: '3px 8px', borderRadius: '4px', fontSize: '0.9rem', color: '#000', wordBreak: 'break-all' }}>{selectedVuln.file}</code>
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#333' }}>
                  <b>Lines:</b> {selectedVuln.line}
                </p>
              </div>

              {/* Data Flow */}
              <div style={{ background: '#fff3cd', padding: '1.2rem', borderRadius: '8px', marginBottom: '1.5rem', border: '2px solid #ffc107', overflow: 'hidden' }}>
                <p style={{ margin: '0 0 0.8rem 0', fontWeight: 'bold', color: '#856404', fontSize: '1.1rem' }}>
                  🔍 Data Flow Analysis
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#333', wordWrap: 'break-word' }}>
                  <b style={{ color: '#000' }}>Source:</b> <code style={{ background: '#fff', padding: '3px 8px', borderRadius: '4px', color: '#000', wordBreak: 'break-all' }}>{selectedVuln.source}</code>
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#333', wordWrap: 'break-word' }}>
                  <b style={{ color: '#000' }}>Sink:</b> <code style={{ background: '#fff', padding: '3px 8px', borderRadius: '4px', color: '#000', wordBreak: 'break-all' }}>{selectedVuln.sink}</code>
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#333', wordWrap: 'break-word' }}>
                  <b style={{ color: '#000' }}>Pattern:</b> {selectedVuln.pattern}
                </p>
              </div>

              {/* Static Analysis */}
              {selectedVuln.staticReason && (
                <div style={{ background: '#e3f2fd', padding: '1.2rem', borderRadius: '8px', border: '2px solid #2196f3', overflow: 'hidden' }}>
                  <p style={{ margin: '0 0 0.8rem 0', fontWeight: 'bold', color: '#0d47a1', fontSize: '1.1rem' }}>
                    ⚡ Static Detection
                  </p>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#1565c0', lineHeight: '1.7', wordWrap: 'break-word' }}>
                    {selectedVuln.staticReason}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              {/* Code Snippet */}
              {selectedVuln.codeSnippet && (
                <div style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
                  <p style={{ margin: '0 0 0.8rem 0', fontWeight: 'bold', fontSize: '1.1rem' }}>📄 Vulnerable Code:</p>
                  <pre style={{ 
                    background: '#1e1e1e', 
                    padding: '1.5rem', 
                    borderRadius: '8px',
                    overflow: 'auto',
                    fontSize: '0.85rem',
                    color: '#d4d4d4',
                    lineHeight: '1.6',
                    border: '3px solid #ff4444',
                    maxHeight: '300px',
                    maxWidth: '100%',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}>{selectedVuln.codeSnippet}</pre>
                </div>
              )}

              {/* LLM Explanation */}
              {selectedVuln.llmExplanation && (
                <div style={{ background: '#f3e5f5', padding: '1.2rem', borderRadius: '8px', marginBottom: '1.5rem', border: '2px solid #9c27b0', overflow: 'hidden' }}>
                  <p style={{ margin: '0 0 0.8rem 0', fontWeight: 'bold', color: '#6a1b9a', fontSize: '1.1rem' }}>
                    🤖 AI Analysis
                  </p>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#7b1fa2', lineHeight: '1.8', wordWrap: 'break-word' }}>
                    {selectedVuln.llmExplanation}
                  </p>
                </div>
              )}

              {/* Remediation */}
              {selectedVuln.llmRemediation && (
                <div style={{ background: '#e8f5e9', padding: '1.2rem', borderRadius: '8px', border: '2px solid #4caf50', overflow: 'hidden' }}>
                  <p style={{ margin: '0 0 0.8rem 0', fontWeight: 'bold', color: '#2e7d32', fontSize: '1.1rem' }}>
                    ✅ Recommended Fix
                  </p>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#388e3c', lineHeight: '1.8', wordWrap: 'break-word' }}>
                    {selectedVuln.llmRemediation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

