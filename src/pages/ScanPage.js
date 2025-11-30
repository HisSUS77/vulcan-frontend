// src/pages/ScanPage.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { repositoryService, scanService } from "../api/services";

const BRANCHES = ["main", "dev", "feature"];

function ScanPage() {
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState("direct"); // direct | repository
  const [directCode, setDirectCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [repositories, setRepositories] = useState([]);
  const [repository, setRepository] = useState("");
  const [branch, setBranch] = useState("main");
  const [scanMode, setScanMode] = useState("deep"); // quick | deep | custom
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState("");
  const [logs, setLogs] = useState([]);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [toast, setToast] = useState("");
  const [currentScanId, setCurrentScanId] = useState(null);
  const [scanSummary, setScanSummary] = useState(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const res = await repositoryService.list();
      const repos = res.data || [];
      setRepositories(repos);
      if (repos.length > 0 && !repository) {
        setRepository(repos[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
    }
  };

  // Poll scan status when scanning
  useEffect(() => {
    if (!scanning || !currentScanId) return;

    const poll = async () => {
      try {
        const statusRes = await scanService.getStatus(currentScanId);
        const status = statusRes.data;
        setProgress(status.progress || 0);
        setEta(status.eta || "");

        // Fetch logs
        const logsRes = await scanService.getLogs(currentScanId);
        const logLines = logsRes.data?.logs || [];
        setLogs(
          logLines.map((l, idx) => ({
            time: new Date().toLocaleTimeString(),
            text: l,
          }))
        );

        if (["COMPLETED", "FAILED", "CANCELLED"].includes(status.state)) {
          setScanning(false);
          clearInterval(pollInterval.current);
          if (status.state === "COMPLETED") {
            const summaryRes = await scanService.getSummary(currentScanId);
            const summary = summaryRes.data;
            setScanSummary(summary);
            setAiConfidence(
              Math.round((summary?.ai_confidence || 0) * 100)
            );
            
            // Save to sessionStorage for cross-page persistence
            sessionStorage.setItem(`scan_${currentScanId}`, JSON.stringify(summary));
            sessionStorage.setItem('lastScanId', currentScanId);
            
            // Add vulnerabilities to logs with detailed information
            if (summary?.vulnerabilities?.length > 0) {
              const vulnLogs = summary.vulnerabilities.map((v, idx) => {
                const llmClass = v.analysis?.llm_classification?.classification || 'N/A';
                const exploitability = v.analysis?.llm_classification?.exploitability 
                  ? Math.round(v.analysis.llm_classification.exploitability * 100) + '%'
                  : 'N/A';
                
                return {
                  time: new Date().toLocaleTimeString(),
                  text: `#${idx + 1} ${v.type} | ${v.evidence?.source} → ${v.evidence?.sink} | Line ${v.location.start_line} | AI: ${llmClass} | Exploit: ${exploitability}`,
                  severity: v.severity
                };
              });
              setLogs(prev => [...prev, ...vulnLogs]);
            }
            
            // Add completion summary log
            const summaryLog = {
              time: new Date().toLocaleTimeString(),
              text: `✓ Scan completed: ${summary.vulnerabilities_found} vulnerabilities (${summary.by_severity?.critical || 0} critical, ${summary.by_severity?.high || 0} high) in ${summary.duration_seconds?.toFixed(2)}s`
            };
            setLogs(prev => [...prev, summaryLog]);
            
            setToast("Scan completed successfully.");
          } else {
            setToast(`Scan ${status.state.toLowerCase()}.`);
          }
          setTimeout(() => setToast(""), 4000);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    };

    poll();
    pollInterval.current = setInterval(poll, 2000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [scanning, currentScanId]);

  const handleDirectCodeChange = (e) => {
    const code = e.target.value;
    const lineCount = code.split('\n').length;
    if (lineCount <= 400) {
      setDirectCode(code);
    } else {
      setToast("Code exceeds 400-line limit!");
      setTimeout(() => setToast(""), 3000);
    }
  };

  const handleStartScan = async () => {
    if (scanning) return;
    
    // Validation based on input mode
    if (inputMode === "direct") {
      if (!directCode.trim()) {
        alert("Please enter code to scan.");
        return;
      }
      const lineCount = directCode.split('\n').length;
      if (lineCount > 400) {
        alert("Code exceeds 400-line limit. Please reduce the code size.");
        return;
      }
    } else if (inputMode === "repository") {
      if (!repository) {
        alert("Please select a repository.");
        return;
      }
    }

    try {
      let scanData;
      
      if (inputMode === "direct") {
        // Direct code scan payload
        scanData = {
          code: directCode,
          language: language,
          scan_mode: scanMode.toUpperCase(),
        };
      } else {
        // Repository scan payload
        scanData = {
          repo_id: repository,
          branch: branch,
          scan_mode: scanMode.toUpperCase(),
        };
      }
      
      const res = await scanService.start(scanData);
      setCurrentScanId(res.data.scan_id);
      setScanning(true);
      setProgress(0);
      setLogs([]);
      setScanSummary(null);
      setToast("");
    } catch (err) {
      console.error("Failed to start scan:", err);
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.message 
        || err.message 
        || "Unknown error occurred";
      alert("Failed to start scan: " + (typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)));
    }
  };

  const handleCancelScan = async () => {
    if (!currentScanId) return;
    try {
      await scanService.cancel(currentScanId);
      setScanning(false);
      setEta("Scan cancelled");
      setToast("Scan was cancelled.");
      setTimeout(() => setToast(""), 4000);
      if (pollInterval.current) clearInterval(pollInterval.current);
    } catch (err) {
      console.error("Failed to cancel scan:", err);
    }
  };

  const handleSaveConfig = () => {
    setToast("Scan configuration saved.");
    setTimeout(() => setToast(""), 3000);
  };

  const handleViewGraph = () => {
    if (!currentScanId) {
      setToast("Please complete a scan first.");
      setTimeout(() => setToast(""), 3000);
      return;
    }
    // Navigate to graphs page with actual scan ID
    navigate(`/graphs?scanId=${currentScanId}&fileId=file-1`);
  };

  return (
    <div className="vs-page">
      {/* Optional mini-toast */}
      {toast && <div className="vs-toast">{toast}</div>}

      {/* Header strip */}
      <div className="vs-header">
        <div className="vs-header-left">
          <div className="vs-header-logo-circle">
            <span className="vs-header-logo-icon">🕵️‍♂️</span>
          </div>
          <div className="vs-header-title">VULNERABILITY SCAN</div>
        </div>
      </div>

      <div className="vs-layout">
        {/* LEFT SIDE: config + progress */}
        <div className="vs-left">
          {/* Main config card */}
          <div className="vs-card vs-main-card">
            {/* Input mode toggle */}
            <div className="vs-row-mode">
              <div className="vs-label">Input Method</div>
              <div className="vs-mode-group">
                <button
                  type="button"
                  className={
                    "vs-mode-btn" + (inputMode === "direct" ? " active" : "")
                  }
                  onClick={() => setInputMode("direct")}
                >
                  Direct Code
                </button>
                <button
                  type="button"
                  className={
                    "vs-mode-btn" + (inputMode === "repository" ? " active" : "")
                  }
                  onClick={() => setInputMode("repository")}
                >
                  Repository
                </button>
              </div>
            </div>

            {/* Conditional input fields */}
            {inputMode === "direct" && (
              <div style={{ marginTop: "1rem" }}>
                <div className="vs-field">
                  <div className="vs-label">Language</div>
                  <select
                    className="vs-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="go">Go</option>
                    <option value="php">PHP</option>
                  </select>
                </div>
                <div className="vs-field" style={{ marginTop: "1rem" }}>
                  <div className="vs-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Enter Code (Max 400 lines)</span>
                    <span style={{ fontSize: "0.85rem", color: "#888" }}>
                      {directCode.split('\n').length} / 400 lines
                    </span>
                  </div>
                  <textarea
                    className="vs-select"
                    value={directCode}
                    onChange={handleDirectCodeChange}
                    placeholder="Paste your code here..."
                    rows={15}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.9rem",
                      resize: "vertical",
                      minHeight: "300px"
                    }}
                  />
                </div>
              </div>
            )}

            {inputMode === "repository" && (
              <div className="vs-row-top">
                <div className="vs-field">
                  <div className="vs-label">Repository</div>
                  <select
                    className="vs-select"
                    value={repository}
                    onChange={(e) => setRepository(e.target.value)}
                  >
                    <option value="">Select repository...</option>
                    {repositories.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vs-field">
                  <div className="vs-label">Branch</div>
                  <select
                    className="vs-select"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Row: scan mode */}
            <div className="vs-row-mode">
              <div className="vs-label">Scan mode</div>
              <div className="vs-mode-group">
                <button
                  type="button"
                  className={
                    "vs-mode-btn" + (scanMode === "quick" ? " active" : "")
                  }
                  onClick={() => setScanMode("quick")}
                >
                  Quick
                </button>
                <button
                  type="button"
                  className={
                    "vs-mode-btn" + (scanMode === "deep" ? " active" : "")
                  }
                  onClick={() => setScanMode("deep")}
                >
                  Deep
                </button>
                <button
                  type="button"
                  className={
                    "vs-mode-btn" + (scanMode === "custom" ? " active" : "")
                  }
                  onClick={() => setScanMode("custom")}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Start button */}
            <div className="vs-row-start">
              <button
                type="button"
                className="vs-start-btn"
                onClick={handleStartScan}
              >
                {scanning ? "SCANNING…" : "START SCAN"}
              </button>
            </div>

            {/* Progress */}
            <div className="vs-row-progress">
              <span className="vs-label">Progress</span>
              <div className="vs-progress-bar-wrap">
                <div className="vs-progress-bar-bg">
                  <div
                    className="vs-progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="vs-progress-meta">
                  <span>{eta}</span>
                  {scanning && (
                    <button
                      type="button"
                      className="vs-cancel-btn"
                      onClick={handleCancelScan}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary / AI confidence card */}
          <div className="vs-card vs-summary-card">
            <div className="vs-summary-title">START SCAN</div>
            <div className="vs-summary-body">
              <div className="vs-summary-progress-row">
                <span className="vs-summary-label">Overall progress</span>
                <span className="vs-summary-pct">{progress}%</span>
              </div>
              <div className="vs-summary-mini-bar">
                <div
                  className="vs-summary-mini-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className="vs-summary-meta">
                <div>
                  <span className="vs-summary-label">AI Confidence</span>
                  <span className="vs-summary-value">
                    {aiConfidence}% (ensemble)
                  </span>
                </div>
                <button
                  type="button"
                  className="vs-save-config-btn"
                  onClick={handleSaveConfig}
                >
                  Save configuration
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: live logs */}
        <div className="vs-right">
          <div className="vs-card vs-log-card">
            <div className="vs-log-header">
              <div>
                <div className="vs-log-title">LOG</div>
                <div className="vs-log-sub">
                  {scanSummary ? (
                    <>
                      Results <span className="critical-count">{scanSummary.by_severity?.critical || 0} Critical</span>{" "}
                      <span className="custom-count">{scanSummary.vulnerabilities_found || 0} Total</span>
                    </>
                  ) : (
                    "Waiting for scan results..."
                  )}
                </div>
              </div>
              <button className="vs-log-refresh-btn" type="button">
                ⟳
              </button>
            </div>

            {scanSummary && (
              <div className="vs-log-summary-row">
                <span className="vs-log-dot critical"></span> {scanSummary.by_severity?.critical || 0} Critical
                <span className="vs-log-bullet">•</span> {scanSummary.by_severity?.high || 0} High
                <span className="vs-log-bullet">•</span> {scanSummary.by_severity?.medium || 0} Medium
                <span className="vs-log-bullet">•</span> {scanSummary.by_severity?.low || 0} Low
              </div>
            )}

            <div className="vs-log-list">
              {logs.map((log, idx) => (
                <div key={idx} className="vs-log-item">
                  <span className="vs-log-time">{log.time}</span>
                  <span className="vs-log-text">
                    {log.severity && <span className={`vs-log-dot ${log.severity}`} style={{ marginRight: '6px' }}></span>}
                    {log.text}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="vs-log-item" style={{ opacity: 0.5 }}>
                  <span className="vs-log-text">No logs yet. Start a scan to see results.</span>
                </div>
              )}
            </div>

            <div className="vs-log-footer">
              <button
                type="button"
                className="vs-view-graph-btn"
                onClick={handleViewGraph}
                style={{ marginRight: '0.5rem' }}
              >
                VIEW GRAPH
              </button>
              <button
                type="button"
                className="vs-view-graph-btn"
                onClick={() => {
                  if (!currentScanId) {
                    setToast("Please complete a scan first.");
                    setTimeout(() => setToast(""), 3000);
                    return;
                  }
                  navigate(`/patches?scanId=${currentScanId}`);
                }}
              >
                GENERATE PATCHES
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanPage;
