// src/pages/ReportsPage.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { reportService, scanService } from "../api/services";
import "../App.css";

const FRAMEWORKS = [
  { value: "owasp",   label: "OWASP Top 10" },
  { value: "pci-dss", label: "PCI-DSS 4.0" },
  { value: "soc2",    label: "SOC2 TSC" },
];

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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVuln, setSelectedVuln] = useState(null);
  const [exportMessage, setExportMessage] = useState("");
  const [patchFilter, setPatchFilter] = useState("all");
  const [patchSearch, setPatchSearch] = useState("");
  const [vulnView, setVulnView] = useState("all"); // all | ai
  const [complianceFramework, setComplianceFramework] = useState("owasp");
  const [complianceData, setComplianceData]           = useState(null);
  const [complianceLoading, setComplianceLoading]     = useState(false);

  const normalizeVulns = useCallback((rawVulns, prev = []) => {
    const prevMap = new Map(prev.map((v) => [v.id, v]));
    return (rawVulns || []).map((v) => {
      const prevV = prevMap.get(v.id);
      const patch = v.patch || prevV?.patch;
      const patchStatus = (v.patch?.status || prevV?.patchStatus || "none");
      return {
        id: v.id,
        severity: v.severity ? v.severity.charAt(0).toUpperCase() + v.severity.slice(1) : "Medium",
        type: v.type,
        cwe: v.cwe,
        owasp: v.owasp,
        file: v.location?.file || "N/A",
        line: `${v.location?.start_line}-${v.location?.end_line}`,
        confidence: Math.round((v.confidence || 0) * 100),
        cvss_score: v.cvss_score ?? null,
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
        patch,
        patchStatus,
        patchConfidence: v.patch?.confidence ?? prevV?.patchConfidence,
        patchValidationSummary: v.patch?.validation_summary || prevV?.patchValidationSummary,
        patchId: v.patch?.patch_id || prevV?.patchId,
        exploit: v.exploit || null,
      };
    });
  }, []);

  const applyVulnsAndSummary = useCallback((rawVulns) => {
    setVulnerabilities((prev) => {
      const merged = normalizeVulns(rawVulns, prev);
      return merged;
    });
  }, [normalizeVulns]);

  const filteredVulnerabilities = useMemo(() => {
    if (vulnView === "ai") {
      return vulnerabilities.filter(
        (v) => (v.analysis?.llm_classification?.classification || v.llmClassification) === "VULNERABLE"
      );
    }
    return vulnerabilities;
  }, [vulnerabilities, vulnView]);

  const filteredSummary = useMemo(() => {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const v of filteredVulnerabilities) {
      const sev = (v.severity || "Medium").toLowerCase();
      if (bySeverity[sev] !== undefined) bySeverity[sev] += 1;
    }
    const total = filteredVulnerabilities.length;
    const avgConfidence = total
      ? Math.round(filteredVulnerabilities.reduce((sum, v) => sum + (v.confidence || 0), 0) / total)
      : 0;
    return { total, ...bySeverity, accuracy: avgConfidence };
  }, [filteredVulnerabilities]);

  const fetchScans = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await reportService.list();
      let scanList = res.data || [];

      if (scanList.length === 0) {
        const lastScanId = localStorage.getItem("lastScanId");
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
      const lastScanId = localStorage.getItem("lastScanId");
      if (lastScanId) {
        const cachedScan = localStorage.getItem(`scan_${lastScanId}`);
        if (cachedScan) {
          const scanData = JSON.parse(cachedScan);
          setScans([scanData]);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedScan]);

  const fetchScanData = useCallback(async (scanId) => {
    try {
      const cached = localStorage.getItem(`scan_${scanId}`);
      if (cached) {
        try {
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
          };
          setScanSummary((prev) => ({
            ...prev,
            ...normalizedSummary,
          }));
          applyVulnsAndSummary(scanData.vulnerabilities);
          setLoading(false);
        } catch {}
      }

      let scanData;
      try {
        const res = await scanService.getSummary(scanId);
        scanData = res.data || {};
      } catch (apiErr) {
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
      setScanSummary((prev) => ({
        ...prev,
        ...normalizedSummary,
      }));

      applyVulnsAndSummary(scanData.vulnerabilities);
      localStorage.setItem(`scan_${scanId}`, JSON.stringify(scanData));
    } catch (err) {
      console.error("Failed to fetch scan data:", err);
    }
  }, [applyVulnsAndSummary]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  useEffect(() => {
    if (selectedScan) {
      fetchScanData(selectedScan);
    }
  }, [selectedScan, fetchScanData]);

  useEffect(() => {
    if (selectedScan) {
      localStorage.setItem("lastScanId", selectedScan);
    }
  }, [selectedScan]);

  useEffect(() => {
    if (!selectedScan) {
      setScanSummary(null);
      setVulnerabilities([]);
    }
  }, [selectedScan]);

  useEffect(() => {
    if (selectedVuln && !filteredVulnerabilities.find((v) => v.id === selectedVuln.id)) {
      setSelectedVuln(null);
    }
  }, [filteredVulnerabilities, selectedVuln]);

  const handleExportJSON = () => {
    if (!scanSummary) return;
    const dataStr = JSON.stringify(scanSummary, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    downloadBlob(blob, `scan-report-${selectedScan}.json`);
  };

  const handleExportCSV = () => {
    if (!filteredVulnerabilities.length) return;

    const headers = ["ID", "Type", "Severity", "CWE", "OWASP", "File", "Lines", "Confidence", "Source", "Sink"];
    const rows = filteredVulnerabilities.map((v) => [
      v.id,
      v.type,
      v.severity,
      v.cwe,
      v.owasp,
      v.file,
      v.line,
      `${v.confidence}%`,
      v.source || "",
      v.sink || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    downloadBlob(blob, `scan-report-${selectedScan}.csv`);
  };

  const handleExportSARIF = async () => {
    if (!selectedScan) return;
    try {
      const response = await scanService.exportSARIF(selectedScan);
      const data = response.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      downloadBlob(blob, `vulcan-${selectedScan}.sarif`);
    } catch (err) {
      console.error("Failed to export SARIF:", err);
      setExportMessage("Failed to export SARIF. Please try again.");
    }
  };

  const handleExportPDF = async () => {
    if (!selectedScan) return;
    try {
      const response = await scanService.exportPDF(selectedScan);
      const blob = response.data || response;
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

  const handleLoadCompliance = async () => {
    if (!selectedScan) return;
    setComplianceLoading(true);
    setComplianceData(null);
    try {
      const res = await reportService.getCompliance(selectedScan, complianceFramework);
      setComplianceData(res.data);
    } catch (err) {
      console.error("Compliance load failed:", err);
    } finally {
      setComplianceLoading(false);
    }
  };

  const handleExportCompliancePDF = async () => {
    if (!selectedScan) return;
    try {
      const res = await reportService.exportCompliancePDF(selectedScan, complianceFramework);
      downloadBlob(res.data, `vulcan-compliance-${complianceFramework}-${selectedScan}.pdf`);
    } catch (err) {
      console.error("Compliance PDF export failed:", err);
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

  const patchHistory = useMemo(() => {
    let items = vulnerabilities.filter((v) => v.patchStatus && v.patchStatus !== "none");
    if (patchFilter !== "all") {
      items = items.filter((v) => v.patchStatus === patchFilter);
    }
    if (patchSearch) {
      const q = patchSearch.toLowerCase();
      items = items.filter((v) =>
        v.type?.toLowerCase().includes(q) ||
        v.file?.toLowerCase().includes(q) ||
        v.patchId?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [vulnerabilities, patchFilter, patchSearch]);

  if (loading) {
    return (
      <div className="rp6-page">
        <div className="rp6-cyber-loader">
          <div className="rp6-cyber-loader-bar" />
          <span>LOADING REPORT DATA...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rp6-page">
      <div className="rp6-hero">
        <div>
          <h1 className="rp6-title" data-text="Reports & Patch Insights">Reports & Patch Insights</h1>
          <div className="rp6-cyber-status">
            <span className="rp6-cyber-dot" />
            <span>ANALYSIS ACTIVE</span>
            <span className="rp6-cyber-sep">{"//"}</span>
            <span>{filteredVulnerabilities.length} VULNERABILITIES</span>
            <span className="rp6-cyber-sep">{"//"}</span>
            <span>{scans.length} {scans.length === 1 ? "SCAN" : "SCANS"} LOADED</span>
            {refreshing && <><span className="rp6-cyber-sep">{"//"}</span><span>SYNCING…</span></>}
          </div>
        </div>
        <div className="rp6-exports">
          <button className="rp6-btn" onClick={handleExportJSON} disabled={!filteredVulnerabilities.length}>
            Export JSON
          </button>
          <button className="rp6-btn" onClick={handleExportCSV} disabled={!filteredVulnerabilities.length}>
            Export CSV
          </button>
          <button className="rp6-btn" onClick={handleExportSARIF} disabled={!selectedScan} title="SARIF 2.1.0 — compatible with GitHub, VS Code, Azure DevOps">
            Export SARIF
          </button>
          <button className="rp6-btn rp6-btn-primary" onClick={handleExportPDF} disabled={!filteredVulnerabilities.length}>
            Export PDF
          </button>
        </div>
      </div>

      {exportMessage && <div className="rp6-alert">{exportMessage}</div>}

      <div className="rp6-controls">
        <div className="rp6-select-wrap">
          <label>Selected scan</label>
          <select
            className="rp6-select"
            value={selectedScan || ""}
            onChange={(e) => setSelectedScan(e.target.value)}
          >
            {scans.map((s) => {
              const date = new Date(s.created_at).toLocaleDateString();
              const time = new Date(s.created_at).toLocaleTimeString();
              const vulnCount = s.total_vulns || s.vulnerabilities_found || 0;
              return (
                <option key={s.scan_id || s.id} value={s.scan_id || s.id}>
                  {(s.scan_id || s.id)} - {date} {time} ({vulnCount} vulns)
                </option>
              );
            })}
          </select>
        </div>
        <div className="rp6-scan-meta">
          <div>
            Input type <span>{scanSummary?.input_type || "-"}</span>
          </div>
          <div>
            Files scanned <span>{scanSummary?.files_scanned || 0}/{scanSummary?.total_files || 0}</span>
          </div>
        </div>
      </div>

      <div className="rp6-summary">
        <div className="rp6-card">
          <div className="rp6-label">Total</div>
          <div className="rp6-value">{filteredSummary.total}</div>
        </div>
        <div className="rp6-card">
          <div className="rp6-label">Critical</div>
          <div className="rp6-value rp6-critical">{filteredSummary.critical}</div>
        </div>
        <div className="rp6-card">
          <div className="rp6-label">High</div>
          <div className="rp6-value rp6-high">{filteredSummary.high}</div>
        </div>
        <div className="rp6-card">
          <div className="rp6-label">Medium</div>
          <div className="rp6-value rp6-medium">{filteredSummary.medium}</div>
        </div>
        <div className="rp6-card">
          <div className="rp6-label">Low</div>
          <div className="rp6-value rp6-low">{filteredSummary.low}</div>
        </div>
        <div className="rp6-card">
          <div className="rp6-label">Avg Confidence</div>
          <div className="rp6-value rp6-accuracy">{filteredSummary.accuracy}%</div>
        </div>
      </div>

      {!loading && !refreshing && scans.length === 0 && (
        <div className="rp6-empty">
          <div>No report yet.</div>
          <button className="rp6-btn rp6-btn-primary" onClick={() => navigate("/scan")}>Run a scan</button>
        </div>
      )}

      <div className="rp6-grid">
        <div className="rp6-panel">
          <div className="rp6-panel-header">
            <div className="rp6-panel-title">Vulnerabilities</div>
            <div className="rp6-filter">
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
              <span>Filter</span>
              <select className="rp6-select" value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
                <option value="Severity">Severity</option>
                <option value="Status">Status</option>
                <option value="CWE">CWE</option>
              </select>
            </div>
          </div>
          <div className="rp6-table-wrap">
            <table className="rp6-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>CVSS</th>
                  <th>CWE</th>
                  <th>OWASP</th>
                  <th>File</th>
                  <th>Lines</th>
                  <th>Confidence</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!selectedScan ? (
                  <tr>
                    <td colSpan="8" className="rp6-empty-row">Select a scan to view its report.</td>
                  </tr>
                ) : filteredVulnerabilities.length > 0 ? (
                  filteredVulnerabilities.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedVuln(selectedVuln?.id === row.id ? null : row)}
                      className={selectedVuln?.id === row.id ? "rp6-row-active" : ""}
                    >
                      <td title={row.type}>{row.type}</td>
                      <td>
                        <span className={`rp6-pill rp6-sev ${row.severity.toLowerCase()}`}>
                          {row.severity}
                        </span>
                      </td>
                      <td className="rp6-mono" style={{ fontWeight: 600, color: row.cvss_score >= 9 ? "#f97373" : row.cvss_score >= 7 ? "#fb923c" : row.cvss_score >= 4 ? "#fbbf24" : "#22d3ee" }}>
                        {row.cvss_score != null ? row.cvss_score.toFixed(1) : "—"}
                      </td>
                      <td className="rp6-mono">{row.cwe}</td>
                      <td className="rp6-mono">{row.owasp}</td>
                      <td className="rp6-mono" title={row.file}>{row.file}</td>
                      <td className="rp6-mono">{row.line}</td>
                      <td>{row.confidence}%</td>
                      <td>
                        <button className="rp6-pill rp6-pill-btn">
                          {selectedVuln?.id === row.id ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="rp6-empty-row">No vulnerabilities found in this scan</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rp6-side">
          <div className="rp6-panel">
            <div className="rp6-panel-title">Scan Info</div>
            {scanSummary ? (
              <div className="rp6-scan-info">
                <div><span>Scan ID</span>{scanSummary.scan_id}</div>
                <div><span>Status</span>{scanSummary.status}</div>
                <div><span>Input Type</span>{scanSummary.input_type}</div>
                <div><span>Files</span>{scanSummary.files_scanned} / {scanSummary.total_files}</div>
                <div><span>Duration</span>{scanSummary.duration_seconds?.toFixed(2)}s</div>
                <div><span>Completed</span>{scanSummary.completed_at ? new Date(scanSummary.completed_at).toLocaleString() : "N/A"}</div>
              </div>
            ) : (
              <div className="rp6-muted">Select a scan to see details.</div>
            )}
          </div>

          <div className="rp6-panel">
            <div className="rp6-panel-title">Patch History</div>
            <div className="rp6-patch-controls">
              <input
                className="rp6-input"
                placeholder="Search by type, file, patch id"
                value={patchSearch}
                onChange={(e) => setPatchSearch(e.target.value)}
              />
              <select className="rp6-select" value={patchFilter} onChange={(e) => setPatchFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="generated">Generated</option>
                <option value="validated">Validated</option>
                <option value="rejected">Rejected</option>
                <option value="applied_pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="applied">Applied</option>
              </select>
            </div>
            <div className="rp6-patch-list">
              {patchHistory.length === 0 ? (
                <div className="rp6-muted">No patches available for this scan.</div>
              ) : (
                patchHistory.map((p) => (
                  <div key={p.id} className="rp6-patch-item">
                    <div>
                      <div className="rp6-patch-title">{p.type}</div>
                      <div className="rp6-patch-sub">{p.file}</div>
                    </div>
                    <div className="rp6-patch-meta">
                      <span className={`rp6-pill rp6-status ${p.patchStatus}`}>{p.patchStatus}</span>
                      <span className="rp6-mono">{p.patchId || "-"}</span>
                    </div>
                    {p.patchValidationSummary && (
                      <div className="rp6-patch-foot">{p.patchValidationSummary}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rp6-panel rp6-compliance-panel">
            <div className="rp6-panel-title">Compliance Report</div>
            <div className="rp6-compliance-controls">
              <select
                className="rp6-select"
                value={complianceFramework}
                onChange={(e) => { setComplianceFramework(e.target.value); setComplianceData(null); }}
              >
                {FRAMEWORKS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <button
                className="rp6-btn"
                onClick={handleLoadCompliance}
                disabled={!selectedScan || complianceLoading}
              >
                {complianceLoading ? "Loading…" : "Run Assessment"}
              </button>
              {complianceData && (
                <button className="rp6-btn rp6-btn-primary" onClick={handleExportCompliancePDF}>
                  Export PDF
                </button>
              )}
            </div>

            {complianceLoading && (
              <div className="rp6-compliance-loading">
                <div className="rp6-cyber-loader-bar" style={{ width: "100%", margin: "12px 0" }} />
                <span>Mapping vulnerabilities to {FRAMEWORKS.find(f=>f.value===complianceFramework)?.label} controls…</span>
              </div>
            )}

            {complianceData && !complianceLoading && (() => {
              const s = complianceData.summary || {};
              const score = s.score ?? complianceData.score ?? 0;
              return (
              <div className="rp6-compliance-body">
                <div className="rp6-compliance-score-row">
                  <div className="rp6-compliance-score">
                    <div className={`rp6-compliance-score-val ${score >= 70 ? "pass" : score >= 40 ? "warn" : "fail"}`}>
                      {score}%
                    </div>
                    <div className="rp6-compliance-score-label">Compliance Score</div>
                  </div>
                  <div className="rp6-compliance-meta">
                    <div><span>Framework</span>{complianceData.framework?.toUpperCase()}</div>
                    <div><span>Controls assessed</span>{s.total_controls ?? complianceData.controls_assessed ?? "—"}</div>
                    <div><span>Failed controls</span>{s.failed ?? complianceData.failed_controls ?? "—"}</div>
                    <div><span>Warnings</span>{s.warnings ?? "—"}</div>
                    <div><span>Passed</span>{s.passed ?? "—"}</div>
                  </div>
                </div>

                {complianceData.controls && complianceData.controls.length > 0 && (
                  <div className="rp6-compliance-table-wrap">
                    <table className="rp6-compliance-table">
                      <thead>
                        <tr>
                          <th>Control</th>
                          <th>Name</th>
                          <th>Status</th>
                          <th>Findings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complianceData.controls.map((ctrl) => (
                          <tr key={ctrl.id}>
                            <td className="rp6-mono">{ctrl.id}</td>
                            <td>{ctrl.name ?? ctrl.label ?? ctrl.description ?? "—"}</td>
                            <td>
                              <span className={`rp6-pill ${ctrl.status === "PASS" || ctrl.status === "pass" ? "rp6-sev low" : ctrl.status === "FAIL" || ctrl.status === "fail" ? "rp6-sev critical" : "rp6-sev medium"}`}>
                                {ctrl.status?.toUpperCase()}
                              </span>
                            </td>
                            <td>{ctrl.findings_count ?? ctrl.count ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              );
            })()}

            {!complianceData && !complianceLoading && (
              <div className="rp6-muted" style={{ marginTop: "12px" }}>
                Select a framework and run assessment to map scan findings to compliance controls.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedVuln && (
        <div className="rp6-detail">
          <div className="rp6-detail-header">
            <div>
              <div className="rp6-detail-title">{selectedVuln.type}</div>
              <div className="rp6-detail-sub">{selectedVuln.file} � {selectedVuln.line}</div>
            </div>
            <button className="rp6-btn" onClick={() => setSelectedVuln(null)}>Close</button>
          </div>
          <div className="rp6-detail-grid">
            <div className="rp6-detail-card">
              <div className="rp6-detail-label">Data Flow</div>
              <div className="rp6-detail-row"><span>Source</span>{selectedVuln.source}</div>
              <div className="rp6-detail-row"><span>Sink</span>{selectedVuln.sink}</div>
              <div className="rp6-detail-row"><span>Pattern</span>{selectedVuln.pattern}</div>
            </div>
            <div className="rp6-detail-card">
              <div className="rp6-detail-label">Static Detection</div>
              <p className="rp6-detail-text">{selectedVuln.staticReason || "No static reason available."}</p>
            </div>
            <div className="rp6-detail-card rp6-detail-code">
              <div className="rp6-detail-label">Vulnerable Code</div>
              <pre>{selectedVuln.codeSnippet || "No code snippet available."}</pre>
            </div>
            <div className="rp6-detail-card">
              <div className="rp6-detail-label">AI Analysis</div>
              <p className="rp6-detail-text">{selectedVuln.llmExplanation || "No AI explanation available."}</p>
              {selectedVuln.llmRemediation && (
                <div className="rp6-detail-remediation">{selectedVuln.llmRemediation}</div>
              )}
            </div>

            {selectedVuln.exploit && (
              <div className={`rp6-detail-card rp6-exploit-card ${selectedVuln.exploit.exploitable ? "exploitable" : "not-exploitable"}`}>
                <div className="rp6-exploit-header">
                  <div className="rp6-detail-label">Exploit PoC</div>
                  <span className={`rp6-exploit-badge ${selectedVuln.exploit.exploitable ? "exploitable" : "not-exploitable"}`}>
                    {selectedVuln.exploit.exploitable ? "⚡ EXPLOITABLE" : "NOT EXPLOITABLE"}
                  </span>
                  <span className="rp6-exploit-conf">
                    {Math.round((selectedVuln.exploit.confidence || 0) * 100)}% confidence
                  </span>
                </div>
                <div className="rp6-exploit-meta">
                  {selectedVuln.exploit.exploit_type && (
                    <div><span>Type</span>{selectedVuln.exploit.exploit_type}</div>
                  )}
                  {selectedVuln.exploit.attack_vector && (
                    <div><span>Attack vector</span>{selectedVuln.exploit.attack_vector}</div>
                  )}
                  {selectedVuln.exploit.impact && (
                    <div><span>Impact</span>{selectedVuln.exploit.impact}</div>
                  )}
                </div>
                {selectedVuln.exploit.bypass_hints && (() => {
                  const hints = Array.isArray(selectedVuln.exploit.bypass_hints)
                    ? selectedVuln.exploit.bypass_hints
                    : String(selectedVuln.exploit.bypass_hints).split(/[,;]/).map(s => s.trim()).filter(Boolean);
                  return hints.length > 0 ? (
                    <div className="rp6-exploit-hints">
                      <div className="rp6-exploit-hints-label">Bypass hints</div>
                      <ul>
                        {hints.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  ) : null;
                })()}
                {selectedVuln.exploit.poc_code && (
                  <div className="rp6-exploit-poc">
                    <div className="rp6-exploit-poc-label">Proof-of-Concept Code</div>
                    <pre className="rp6-exploit-pre">{selectedVuln.exploit.poc_code}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
