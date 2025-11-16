// src/pages/ScanPage.js
import React, { useEffect, useState } from "react";
import "../App.css";

const MOCK_REPOS = ["example-repo", "frontend-app", "backend-service"];
const BRANCHES = ["main", "dev", "feature"];

const INITIAL_LOGS = [
  { time: "12:57", text: "Analyzing auth.js" },
  { time: "12:57", text: "Detected SQL injection" },
  { time: "12:56", text: "Scanning utils.py" },
  { time: "12:44", text: "Analyzing data flow" },
  { time: "12:44", text: "Scanning main.go" },
  { time: "12:44", text: "Scanning semantic graphs" },
  { time: "12:44", text: "Detecting arbitrary code exec patterns" },
  { time: "12:44", text: "Inferring fix patterns based on LLM" },
];

function ScanPage() {
  const [repository, setRepository] = useState(MOCK_REPOS[0]);
  const [branch, setBranch] = useState("main");
  const [scanMode, setScanMode] = useState("deep"); // quick | deep | custom
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState("3m 39s remaining");
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [aiConfidence, setAiConfidence] = useState(87); // %
  const [toast, setToast] = useState("");

  // Fake scan progress + log streaming
  useEffect(() => {
    if (!scanning) return;

    setProgress(0);
    setLogs(INITIAL_LOGS.slice(0, 1));

    const totalSteps = 20;
    let step = 0;

    const interval = setInterval(() => {
      step += 1;
      const pct = Math.min(100, Math.round((step / totalSteps) * 100));
      setProgress(pct);

      const remainingSec = Math.max(0, totalSteps - step) * 10;
      const min = Math.floor(remainingSec / 60);
      const sec = remainingSec % 60;
      setEta(
        remainingSec === 0
          ? "Finishing…"
          : `${min}m ${sec.toString().padStart(2, "0")}s remaining`
      );

      // Gradually reveal logs
      if (step < INITIAL_LOGS.length) {
        setLogs(INITIAL_LOGS.slice(0, step + 1));
      }

      if (step >= totalSteps) {
        clearInterval(interval);
        setScanning(false);
        setEta("Completed");
        setAiConfidence(92);
        setToast("Scan completed successfully.");
        setTimeout(() => setToast(""), 4000);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [scanning]);

  const handleStartScan = () => {
    if (scanning) return;
    setScanning(true);
    setToast("");
  };

  const handleCancelScan = () => {
    setScanning(false);
    setEta("Scan cancelled");
    setToast("Scan was cancelled.");
    setTimeout(() => setToast(""), 4000);
  };

  const handleSaveConfig = () => {
    setToast("Scan configuration saved.");
    setTimeout(() => setToast(""), 3000);
  };

  const handleViewGraph = () => {
    // Later: navigate to /graphs with selected file info
    setToast("Graph view will open in Graphs module (M5).");
    setTimeout(() => setToast(""), 3000);
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
            {/* Row: repo + branch */}
            <div className="vs-row-top">
              <div className="vs-field">
                <div className="vs-label">Repository</div>
                <select
                  className="vs-select"
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                >
                  {MOCK_REPOS.map((r) => (
                    <option key={r} value={r}>
                      {r}
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
                  Results <span className="critical-count">3 Critical</span>{" "}
                  <span className="custom-count">05 Custom</span>
                </div>
              </div>
              <button className="vs-log-refresh-btn" type="button">
                ⟳
              </button>
            </div>

            <div className="vs-log-summary-row">
              <span className="vs-log-dot critical"></span> 8 Critical
              <span className="vs-log-bullet">•</span> 5 others
            </div>

            <div className="vs-log-list">
              {logs.map((log, idx) => (
                <div key={idx} className="vs-log-item">
                  <span className="vs-log-time">{log.time}</span>
                  <span className="vs-log-text">{log.text}</span>
                </div>
              ))}
            </div>

            <div className="vs-log-footer">
              <button
                type="button"
                className="vs-view-graph-btn"
                onClick={handleViewGraph}
              >
                VIEW GRAPH
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanPage;
