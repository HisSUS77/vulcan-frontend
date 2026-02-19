// src/pages/PatchGeneratorPage.js
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../App.css";
import { patchService, reportService, scanService } from "../api/services";

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

  const buildDiffRows = (diffText) => {
    const lines = (diffText || "").split("\n");
    const left = [];
    const right = [];
    let lno = 1;
    let rno = 1;
    lines.forEach((line) => {
      if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) {
        return;
      }
      if (line.startsWith("-")) {
        left.push({ no: lno++, text: line.slice(1), type: "removed" });
        right.push({ no: "", text: "", type: "removed" });
        return;
      }
      if (line.startsWith("+")) {
        left.push({ no: "", text: "", type: "added" });
        right.push({ no: rno++, text: line.slice(1), type: "added" });
        return;
      }
      left.push({ no: lno++, text: line.replace(/^ /, ""), type: "context" });
      right.push({ no: rno++, text: line.replace(/^ /, ""), type: "context" });
    });
    return { left, right };
  };

  const diffRows = buildDiffRows(selectedPatch?.unified_diff || "");

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      setToast("Copied to clipboard");
    } catch (err) {
      setToast("Copy failed");
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  // 📥 FUNCTION: Fetch Vulnerabilities for Scan
  const fetchVulnerabilities = useCallback(async () => {
    if (!activeScanId) return;
    try {
      let vulns = [];
      try {
        const summaryRes = await scanService.getSummary(activeScanId);
        const summaryData = summaryRes.data || summaryRes;
        vulns = summaryData?.vulnerabilities || [];
      } catch {}
      if (!vulns.length) {
        const res = await reportService.get(activeScanId);
        vulns = res.data?.vulnerabilities || [];
      }
      setVulnerabilities(vulns);
      if (vulns.length > 0) setSelectedVuln(vulns[0].id);
    } catch (err) {
      console.error("Failed to fetch vulnerabilities from API:", err);

      // Fallback to localStorage
      const cached = localStorage.getItem(`scan_${activeScanId}`);
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
      const res = await patchService.apply(selectedPatch.patch_id);
      setToast(res?.data?.instructions || "Patch marked for apply.");
    } catch (err) {
      console.error("Failed to apply patch:", err);
      setToast("Failed to apply patch.");
    }
  };
  // 📤 FUNCTION: Export Patch as .diff File

  const handleExportPatch = async () => {
    if (!selectedPatch) return;
    try {
      const res = await patchService.export(selectedPatch.patch_id);
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
  // ✅ FUNCTION: Validate Patch
  const handleValidatePatch = async () => {
    if (!selectedPatch) return;
    try {
      const res = await patchService.validate(selectedPatch.patch_id);
      const updated = { ...selectedPatch, ...res.data };
      setSelectedPatch(updated);
      setPatches((prev) =>
        prev.map((p) => (p.patch_id === updated.patch_id ? updated : p))
      );
      setToast("Patch validated.");
    } catch (err) {
      console.error("Failed to validate patch:", err);
      setToast("Failed to validate patch.");
    }
  };

  return (
    <div className="pg6-page">
      {toast && <div className="pg6-toast">{toast}</div>}

      <div className="pg6-hero">
        <div className="pg6-hero-left">
          <h1 className="pg6-title">Automated Patch Generation</h1>
          <p className="pg6-subtitle">
            Generate verified patches with diff-only output, validation signals,
            and apply-ready metadata.
          </p>
          <div className="pg6-scan-pill">
            Scan ID <span>{activeScanId}</span>
          </div>
        </div>
        <div className="pg6-hero-right">
          <button
            className="pg6-primary"
            onClick={handleGeneratePatch}
            disabled={loading || !selectedVuln}
          >
            {loading ? "Generating..." : "Generate Patch"}
          </button>
          <div className="pg6-primary-hint">Diff-only output, no repo edits.</div>
        </div>
      </div>

      <div className="pg6-grid">
        <div className="pg6-panel pg6-panel-controls">
          <div className="pg6-panel-title">Inputs</div>
          <div className="pg6-field">
            <label>Select vulnerability</label>
            <select
              className="pg6-select"
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

          <div className="pg6-field">
            <label>Generated patches</label>
            <select
              className="pg6-select"
              value={selectedPatch?.patch_id || ""}
              onChange={(e) => {
                const p = patches.find((x) => x.patch_id === e.target.value);
                setSelectedPatch(p);
              }}
            >
              {patches.length > 0 ? (
                patches.map((p) => (
                  <option key={p.patch_id} value={p.patch_id}>
                    Patch {p.patch_id}
                  </option>
                ))
              ) : (
                <option value="">No patches generated</option>
              )}
            </select>
          </div>

          <div className="pg6-actions">
            <button
              className="pg6-secondary"
              onClick={handleValidatePatch}
              disabled={!selectedPatch}
            >
              Validate
            </button>
            <button
              className="pg6-secondary"
              onClick={handleExportPatch}
              disabled={!selectedPatch}
            >
              Export Patch
            </button>
            <button
              className="pg6-secondary"
              onClick={handleApplyPatch}
              disabled={!selectedPatch}
            >
              Apply Patch
            </button>
          </div>

          <div className="pg6-status-card">
            <div className="pg6-status-label">Patch status</div>
            <div className="pg6-status-value">
              {selectedPatch?.status || "n/a"}
            </div>
            {selectedPatch?.validations && (
              <div className="pg6-status-meta">
                {selectedPatch.validations.filter((v) => v.passed).length}/
                {selectedPatch.validations.length} checks passed
              </div>
            )}
          </div>
        </div>

        <div className="pg6-panel pg6-panel-diff">
          <div className="pg6-panel-title">Diff Viewer</div>
          <div className="pg6-diff-grid">
            <div className="pg6-diff-pane">
              <div className="pg6-diff-header">
                <span>Original</span>
                <button
                  className="pg6-copy-btn"
                  onClick={() => copyToClipboard(diffRows.left.map((l) => l.text).join("\n"))}
                  disabled={!selectedPatch}
                >
                  Copy
                </button>
              </div>
              <div className="pg6-diff-body">
                {diffRows.left.length ? (
                  diffRows.left.map((line, idx) => (
                    <div key={`l-${idx}`} className={`pg6-line ${line.type}`}>
                      <span className="pg6-line-no">{line.no}</span>
                      <span>{line.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="pg6-line">
                    <span className="pg6-line-no"></span>
                    <span>No patch selected</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pg6-diff-pane">
              <div className="pg6-diff-header">
                <span>Patched</span>
                <button
                  className="pg6-copy-btn"
                  onClick={() => copyToClipboard(diffRows.right.map((l) => l.text).join("\n"))}
                  disabled={!selectedPatch}
                >
                  Copy
                </button>
              </div>
              <div className="pg6-diff-body">
                {diffRows.right.length ? (
                  diffRows.right.map((line, idx) => (
                    <div key={`r-${idx}`} className={`pg6-line ${line.type}`}>
                      <span className="pg6-line-no">{line.no}</span>
                      <span>{line.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="pg6-line">
                    <span className="pg6-line-no"></span>
                    <span>No patch selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
            <button
              className="pg6-copy-btn"
              onClick={() => copyToClipboard(selectedPatch?.unified_diff || "")}
              disabled={!selectedPatch}
            >
              Copy Unified Diff
            </button>
          </div>
        </div>

        <div className="pg6-panel pg6-panel-explain">
          <div className="pg6-panel-title">Explanation</div>
          <p className="pg6-explain">
            {selectedPatch?.explanation ||
              "Select a patch to see AI explanation."}
          </p>
          {selectedPatch?.validations && (
            <div className="pg6-validation-list">
              {selectedPatch.validations.map((v) => (
                <div
                  key={v.name}
                  className={`pg6-validation ${v.passed ? "ok" : "bad"}`}
                >
                  <span className="pg6-validation-name">{v.name}</span>
                  <span className="pg6-validation-pill">
                    {v.passed ? "Passed" : "Failed"}
                  </span>
                  <span className="pg6-validation-detail">{v.details}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pg6-panel pg6-panel-confidence">
          <div className="pg6-panel-title">Confidence</div>
          <div className="pg6-ring-wrap">
            <svg className="pg6-ring" viewBox="0 0 36 36">
              <path
                className="pg6-ring-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="pg6-ring-fg"
                strokeDasharray={`${selectedPatch?.confidence || 0}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="pg6-ring-text">
              {selectedPatch?.confidence
                ? Math.round(selectedPatch.confidence * 100)
                : 0}
              %
            </div>
          </div>
          <div className="pg6-confidence-foot">
            Confidence derived from diff, syntax, and semantic checks.
          </div>
        </div>
      </div>
    </div>
  );
}
