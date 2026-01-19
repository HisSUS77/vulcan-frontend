// src/pages/PatchGeneratorPage.js
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../App.css";
import { patchService } from "../api/services";

export default function PatchGeneratorPage() {
  //  Extract Query Params
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scanId = searchParams.get("scanId");
  const [activeScanId, setActiveScanId] = useState(
    scanId || localStorage.getItem("lastScanId") || null
  );
  //  Component State
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [selectedVuln, setSelectedVuln] = useState("");
  const [patches, setPatches] = useState([]);
  const [selectedPatch, setSelectedPatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  // 📥 FUNCTION: Fetch Vulnerabilities for Scan
  const fetchVulnerabilities = useCallback(async () => {
    if (!activeScanId) return;
    try {
      // Call backend to get vulnerability list
      const res = await patchService.getVulnerabilities(activeScanId);
      const vulns = res.data || [];
      setVulnerabilities(vulns);
      if (vulns.length > 0) setSelectedVuln(vulns[0].id);
    } catch (err) {
      console.error("Failed to fetch vulnerabilities from API:", err);

      // Fallback to sessionStorage
      const cached = sessionStorage.getItem(`scan_${activeScanId}`);
      if (cached) {
        const scanData = JSON.parse(cached);
        const vulns = scanData.vulnerabilities || [];
        setVulnerabilities(vulns);
        if (vulns.length > 0) setSelectedVuln(vulns[0].id);
      }
    }
  }, [activeScanId]);

  // Resolve scan id without forcing a redirect to /scan
  useEffect(() => {
    if (scanId) {
      setActiveScanId(scanId);
      return;
    }
    const lastScanId = localStorage.getItem("lastScanId");
    if (lastScanId) {
      setActiveScanId(lastScanId);
      navigate(`/patches?scanId=${lastScanId}`, { replace: true });
      return;
    }
    setActiveScanId(null);
  }, [scanId, navigate, fetchVulnerabilities]);

  useEffect(() => {
    fetchVulnerabilities();
  }, [fetchVulnerabilities]);

  if (!activeScanId) {
    return (
      <div className="v-placeholder-page">
        <p>No scan selected for patch generation.</p>
        <button className="v-secondary-btn" onClick={() => navigate("/scan")}>
          Start a scan
        </button>
      </div>
    );
  }

  // ⚙️ FUNCTION: Generate New Patch
  const handleGeneratePatch = async () => {
    if (!selectedVuln) return;
    setLoading(true);
    try {
      const res = await patchService.generate({
        vulnerability_id: selectedVuln,
      });
      const newPatch = res.data;
      setPatches((prev) => [...prev, newPatch]);
      setSelectedPatch(newPatch); // Auto-select newly generated patch
    } catch (err) {
      console.error("Failed to generate patch:", err);
      setToast("Failed to generate patch.");
    } finally {
      setLoading(false);
    }
  };
  // 🛠 FUNCTION: Apply Patch to Source Code
  const handleApplyPatch = async () => {
    if (!selectedPatch) return;
    try {
      await patchService.apply(selectedPatch.id);
      setToast("Patch applied successfully!");
    } catch (err) {
      console.error("Failed to apply patch:", err);
      setToast("Failed to apply patch.");
    }
  };
  // 📤 FUNCTION: Export Patch as .diff File

  const handleExportPatch = async () => {
    if (!selectedPatch) return;
    try {
      const res = await patchService.export(selectedPatch.id);
      // Create and download a text file containing patch content
      const blob = new Blob([res.data.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.filename || "patch.diff";
      a.click();
    } catch (err) {
      console.error("Failed to export patch:", err);
      setToast("Failed to export patch.");
    }
  };
  // 🔄 FUNCTION: Re-generate Patch with AI Again
  const handleRegeneratePatch = async () => {
    if (!selectedPatch) return;
    try {
      const res = await patchService.regenerate(selectedPatch.id);
      setSelectedPatch(res.data);
      setToast("Patch regenerated!");
    } catch (err) {
      console.error("Failed to regenerate patch:", err);
      setToast("Failed to regenerate patch.");
    }
  };

  return (
    <div className="pg-wrapper">
      {toast && <div className="vs-toast">{toast}</div>}

      {/* Page Heading */}
      <div className="pg-heading-row">
        <div>
          <h1 className="pg-title">AI-Based Patch Generation</h1>
          <span style={{
            fontSize: '0.9rem',
            color: '#666',
            background: '#f0f0f0',
            padding: '4px 12px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            display: 'inline-block',
            marginTop: '0.5rem'
          }}>
            Scan ID: {activeScanId}
          </span>
        </div>
        <button
          className="pg-generate-btn"
          onClick={handleGeneratePatch}
          disabled={loading || !selectedVuln}
        >
          {loading ? "Generating..." : "Generate Patch"}
        </button>
      </div>

      {/* Main Card */}
      <div className="pg-card">
        {/* Dropdown Row */}
        <div className="pg-dropdown-row">
          <div className="pg-dropdown-group">
            <label>Select vulnerability</label>
            <select
              className="pg-select"
              value={selectedVuln}
              onChange={(e) => setSelectedVuln(e.target.value)}
            >
              {vulnerabilities.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || v.id}
                </option>
              ))}
            </select>
          </div>

          <div className="pg-dropdown-group">
            <label>AI-generated patch</label>
            <select
              className="pg-select"
              value={selectedPatch?.id || ""}
              onChange={(e) => {
                const p = patches.find((x) => x.id === e.target.value);
                setSelectedPatch(p);
              }}
            >
              {patches.length > 0 ? (
                patches.map((p) => (
                  <option key={p.id} value={p.id}>
                    Patch {p.id}
                  </option>
                ))
              ) : (
                <option value="">No patches generated</option>
              )}
            </select>
          </div>
        </div>

        {/* Code Compare Row */}
        <div className="pg-code-compare">
          {/* Original Code */}
          <div className="pg-code-box">
            <pre className="pg-code">
              {selectedPatch?.original_code || "No patch selected"}
            </pre>
            <div className="pg-diff-red"></div>
          </div>

          {/* Patched Code */}
          <div className="pg-code-box">
            <pre className="pg-code pg-green">
              {selectedPatch?.patched_code || "No patch selected"}
            </pre>
            <div className="pg-diff-green"></div>
          </div>
        </div>

        {/* Explanation + Confidence Row */}
        <div className="pg-bottom-row">

          {/* Explanation */}
          <div className="pg-explain-card">
            <div className="pg-explain-header">
              <span>AI-generated explanation</span>
              <span className="pg-tag">CWE</span>
              <span className="pg-ai-tag">AI</span>
            </div>

            <p className="pg-explain-text">
              {selectedPatch?.explanation ||
                "Select a patch to see AI explanation."}
            </p>

            <div className="pg-btn-row">
              <button
                className="pg-secondary-btn"
                onClick={handleRegeneratePatch}
                disabled={!selectedPatch}
              >
                Re-generate
              </button>
              <button
                className="pg-secondary-btn"
                onClick={handleExportPatch}
                disabled={!selectedPatch}
              >
                Export Patch
              </button>
              <button
                className="pg-secondary-btn"
                onClick={handleApplyPatch}
                disabled={!selectedPatch}
              >
                Apply Patch
              </button>
            </div>
          </div>

          {/* Confidence Meter */}
          <div className="pg-confidence-card">
            <div className="pg-conf-title">Confidence score</div>

            <div className="pg-ring-wrapper">
              <svg className="pg-ring" viewBox="0 0 36 36">
                <path
                  className="pg-ring-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="pg-ring-fg"
                  strokeDasharray={`${selectedPatch?.confidence || 0}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="pg-ring-text">
                {selectedPatch?.confidence
                  ? Math.round(selectedPatch.confidence * 100)
                  : 0}
                %
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
