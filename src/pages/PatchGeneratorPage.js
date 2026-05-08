// src/pages/PatchGeneratorPage.js
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { patchService, reportService, scanService } from "../api/services";

/* ── helpers ─────────────────────────────────────────────────────────── */
const severityClass = (sev = "") =>
  ({ critical: "crit", high: "high", medium: "med", low: "low" }[sev.toLowerCase()] || "low");

const reviewLabel = (rs = "pending_review") =>
  rs.replace(/_/g, " ").toUpperCase();

const buildDiffRows = (diffText) => {
  const lines = (diffText || "").split("\n");
  const left = [], right = [];
  let lno = 1, rno = 1;
  lines.forEach((line) => {
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) return;
    if (line.startsWith("-")) {
      left.push({ no: lno++, text: line.slice(1), type: "removed" });
      right.push({ no: "", text: "", type: "removed" });
    } else if (line.startsWith("+")) {
      left.push({ no: "", text: "", type: "added" });
      right.push({ no: rno++, text: line.slice(1), type: "added" });
    } else {
      left.push({ no: lno++, text: line.replace(/^ /, ""), type: "context" });
      right.push({ no: rno++, text: line.replace(/^ /, ""), type: "context" });
    }
  });
  return { left, right };
};

/* ── AttackSimulationPanel ──────────────────────────────────────────────── */
function AttackSimulationPanel({ attackTest }) {
  const [proofOpen, setProofOpen] = useState(false);
  if (!attackTest) return null;

  const { overall_secure, patch_confidence, attacks, recommendation, raw_analysis } = attackTest;
  const pct = Math.min(100, Math.max(0, patch_confidence ?? 0));
  const confClass = pct >= 75 ? "high" : pct >= 50 ? "medium" : "low";
  const blockedCount = (attacks || []).filter(a => (a.result||"").toUpperCase() === "BLOCKED").length;

  return (
    <div className="pg6-attack-panel">
      {/* Header row */}
      <div className="pg6-attack-header">
        <span className="pg6-attack-icon">🛡</span>
        <span className="pg6-attack-title">Adversarial Attack Simulation</span>
        <span className={`pg6-attack-verdict ${overall_secure ? "secure" : "vulnerable"}`}>
          <span className="pg6-attack-verdict-dot" />
          {overall_secure ? "PATCH HELD" : "BYPASS DETECTED"}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="pg6-attack-conf-row">
        <span className="pg6-attack-conf-label">Attacker's patch confidence</span>
        <div className="pg6-attack-conf-track">
          <div
            className={`pg6-attack-conf-fill ${confClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`pg6-attack-conf-val ${confClass}`}>{pct}%</span>
      </div>

      {/* Attack attempts */}
      {attacks && attacks.length > 0 && (
        <div className="pg6-attack-grid">
          {attacks.map((atk, i) => {
            const blocked = (atk.result || "").toUpperCase() === "BLOCKED";
            return (
              <div key={i} className={`pg6-attack-row ${blocked ? "blocked" : "bypassed"}`}>
                <span className={`pg6-attack-badge ${blocked ? "blocked" : "bypassed"}`}>
                  {blocked ? "BLOCKED" : "BYPASSED"}
                </span>
                <div className="pg6-attack-info">
                  <div className="pg6-attack-name">
                    {atk.name}
                    {atk.technique && (
                      <span className="pg6-attack-technique">via: {atk.technique}</span>
                    )}
                  </div>
                  <div className="pg6-attack-reason">{atk.explanation}</div>
                </div>
                <span className={`pg6-attack-ai-proof ${blocked ? "blocked" : "bypassed"}`}>
                  {blocked ? "✓ AI VERIFIED" : "⚠ AI FLAGGED"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Proof summary bar */}
      <div className="pg6-attack-proof-bar">
        <span className="pg6-attack-proof-stat">
          <span className="pg6-attack-proof-num">{blockedCount}</span>
          <span className="pg6-attack-proof-label">/ {(attacks||[]).length} attacks blocked by AI analysis</span>
        </span>
        {raw_analysis && (
          <button className="pg6-attack-proof-toggle" onClick={() => setProofOpen(o => !o)}>
            {proofOpen ? "▲ Hide AI Reasoning" : "▼ View Full AI Proof"}
          </button>
        )}
      </div>

      {/* Full AI reasoning chain */}
      {proofOpen && raw_analysis && (
        <div className="pg6-attack-raw">
          <div className="pg6-attack-raw-header">
            <span className="pg6-attack-raw-icon">🤖</span>
            Full AI Adversarial Reasoning Chain
          </div>
          <pre className="pg6-attack-raw-body">{raw_analysis}</pre>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="pg6-attack-rec">
          <span className="pg6-attack-rec-icon">💡</span>
          <span>{recommendation}</span>
        </div>
      )}
    </div>
  );
}

/* ── component ───────────────────────────────────────────────────────── */
export default function PatchGeneratorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scanId = searchParams.get("scanId");

  const [activeScanId, setActiveScanId] = useState(
    scanId || localStorage.getItem("lastScanId") || null
  );

  /* state */
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [selectedVuln, setSelectedVuln]       = useState("");
  const [selectedVulnData, setSelectedVulnData] = useState(null);
  const [patches, setPatches]                 = useState([]);
  const [selectedPatch, setSelectedPatch]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("pg_selectedPatch") || "null"); }
    catch { return null; }
  });
  const [loading, setLoading]                 = useState(false);
  const [reviewLoading, setReviewLoading]     = useState(false);
  const [verifyResult, setVerifyResult]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("pg_verifyResult") || "null"); }
    catch { return null; }
  });
  const [verifyLoading, setVerifyLoading]     = useState(false);
  const sandboxResult = null;
  const sandboxLoading = false;
  const setSandboxLoading = () => {};
  const setSandboxResult = () => {};
  const sandboxService = { run: async () => ({ data: { confirmed: false } }) };
  const [historyOpen, setHistoryOpen]         = useState(false);
  const [toast, setToast]                     = useState({ msg: "", type: "ok" });

  /* toast */
  const showToast = useCallback((msg, type = "ok") => setToast({ msg, type }), []);
  useEffect(() => {
    if (!toast.msg) return;
    const t = setTimeout(() => setToast({ msg: "", type: "ok" }), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      showToast("COPIED TO CLIPBOARD", "ok");
    } catch {
      showToast("COPY FAILED", "err");
    }
  };

  /* fetch vulns */
  const fetchVulnerabilities = useCallback(async () => {
    if (!activeScanId) return;
    try {
      let vulns = [];
      try {
        const s = await scanService.getSummary(activeScanId);
        vulns = (s.data || s)?.vulnerabilities || [];
      } catch { /* fall through */ }
      if (!vulns.length) {
        const r = await reportService.get(activeScanId);
        vulns = r.data?.vulnerabilities || [];
      }
      setVulnerabilities(vulns);
      if (vulns.length) { setSelectedVuln(vulns[0].id); setSelectedVulnData(vulns[0]); }
    } catch {
      const cached = localStorage.getItem(`scan_${activeScanId}`);
      if (cached) {
        const vulns = JSON.parse(cached).vulnerabilities || [];
        setVulnerabilities(vulns);
        if (vulns.length) { setSelectedVuln(vulns[0].id); setSelectedVulnData(vulns[0]); }
      }
    }
  }, [activeScanId]);

  /* scanId resolution */
  useEffect(() => {
    if (scanId) { setActiveScanId(scanId); return; }
    const last = localStorage.getItem("lastScanId");
    if (last) { setActiveScanId(last); navigate(`/patches?scanId=${last}`, { replace: true }); return; }
    setActiveScanId(null);
  }, [scanId, navigate]);

  useEffect(() => { fetchVulnerabilities(); }, [fetchVulnerabilities]);

  /* persist patch session to localStorage */
  useEffect(() => {
    if (selectedPatch) localStorage.setItem("pg_selectedPatch", JSON.stringify(selectedPatch));
    else localStorage.removeItem("pg_selectedPatch");
  }, [selectedPatch]);
  useEffect(() => {
    if (verifyResult) localStorage.setItem("pg_verifyResult", JSON.stringify(verifyResult));
    else localStorage.removeItem("pg_verifyResult");
  }, [verifyResult]);
  /* keep selectedVulnData in sync — do NOT auto-clear patch on vuln change */
  useEffect(() => {
    const v = vulnerabilities.find((x) => x.id === selectedVuln);
    setSelectedVulnData(v || null);
  }, [selectedVuln, vulnerabilities]);

  /* clear patch session — called by the Clear button */
  const handleClearPatch = () => {
    setPatches([]);
    setSelectedPatch(null);
    setVerifyResult(null);
    localStorage.removeItem("pg_selectedPatch");
    localStorage.removeItem("pg_verifyResult");
    showToast("PATCH CLEARED", "ok");
  };

  /* ── actions ── */
  const handleGeneratePatch = async (isRegen = false) => {
    if (!selectedVuln || loading) return;
    setLoading(true);
    showToast(isRegen ? "REGENERATING PATCH…" : "FORGING PATCH…", "ok");
    try {
      const res  = await patchService.generate({ vulnerability_id: selectedVuln });
      const newP = res.data;
      setPatches((prev) => [...prev, newP]);
      setSelectedPatch(newP);
      showToast(isRegen ? `ALT PATCH v${patches.length + 1} FORGED` : "PATCH SYNTHESIZED", "ok");
      window.dispatchEvent(new CustomEvent("vulcan:patch-generated"));
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "unknown error";
      showToast(`SYNTHESIS FAILED: ${detail}`, "err");
      console.error("[PatchForge] generate failed:", err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePatch = async () => {
    if (!selectedPatch) return;
    try {
      const res     = await patchService.validate(selectedPatch.patch_id);
      const updated = { ...selectedPatch, ...res.data };
      setSelectedPatch(updated);
      setPatches((prev) => prev.map((p) => (p.patch_id === updated.patch_id ? updated : p)));
      showToast("VALIDATION COMPLETE", "ok");
    } catch { showToast("VALIDATION FAILED", "err"); }
  };

  const handleApplyPatch = async () => {
    if (!selectedPatch) return;
    if (selectedPatch.review_status === "rejected") {
      showToast("REJECTED PATCH — CANNOT APPLY", "err"); return;
    }
    try {
      const res = await patchService.apply(selectedPatch.patch_id);
      showToast(res?.data?.branch_suggestion
        ? `BRANCH: ${res.data.branch_suggestion}`
        : "APPLY PENDING", "ok");
    } catch { showToast("APPLY FAILED", "err"); }
  };

  const handleExportPatch = async () => {
    if (!selectedPatch) return;
    if (selectedPatch.review_status === "rejected") {
      showToast("REJECTED PATCH — CANNOT EXPORT", "err"); return;
    }
    try {
      const res  = await patchService.export(selectedPatch.patch_id);
      const blob = new Blob([res.data.content], { type: "text/plain" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = res.data.filename || "patch.diff";
      a.click();
      showToast("PATCH EXPORTED", "ok");
    } catch { showToast("EXPORT FAILED", "err"); }
  };

  const handleApprovePatch = async () => {
    if (!selectedPatch || reviewLoading) return;
    setReviewLoading(true);
    try {
      const res     = await patchService.approve(selectedPatch.patch_id);
      const updated = { ...selectedPatch, review_status: res.data.review_status };
      setSelectedPatch(updated);
      setPatches((prev) => prev.map((p) => (p.patch_id === updated.patch_id ? updated : p)));
      showToast("PATCH APPROVED ✓", "ok");
    } catch { showToast("APPROVE FAILED", "err"); }
    finally { setReviewLoading(false); }
  };

  const handleVerifyPatch = async () => {
    if (!selectedPatch || verifyLoading) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await patchService.verify(selectedPatch.patch_id);
      setVerifyResult(res.data);
      showToast(res.data.fixed ? "✓ VULNERABILITY CONFIRMED FIXED" : "⚠ VULNERABILITY STILL PRESENT", res.data.fixed ? "ok" : "err");
    } catch { showToast("Verification failed", "err"); }
    finally { setVerifyLoading(false); }
  };

  const handleRunSandbox = async () => {
    const pocCode = selectedPatch?.exploit?.poc_code || selectedVulnData?.exploit?.poc_code;
    if (!pocCode) { showToast("No PoC code available for this finding", "err"); return; }
    setSandboxLoading(true);
    setSandboxResult(null);
    try {
      const res = await sandboxService.run(pocCode, "python", selectedPatch?.vuln_type || "unknown");
      setSandboxResult(res.data);
      showToast(res.data.confirmed ? "⚡ EXPLOIT CONFIRMED IN SANDBOX" : "NOT CONFIRMED IN SANDBOX", res.data.confirmed ? "err" : "ok");
    } catch { showToast("Sandbox execution failed", "err"); }
    finally { setSandboxLoading(false); }
  };

  const handleRejectPatch = async () => {
    if (!selectedPatch || reviewLoading) return;
    setReviewLoading(true);
    try {
      const res     = await patchService.reject(selectedPatch.patch_id);
      const updated = { ...selectedPatch, review_status: res.data.review_status };
      setSelectedPatch(updated);
      setPatches((prev) => prev.map((p) => (p.patch_id === updated.patch_id ? updated : p)));
      showToast("PATCH REJECTED ✗", "err");
    } catch { showToast("REJECT FAILED", "err"); }
    finally { setReviewLoading(false); }
  };

  /* derived */
  const diffRows       = buildDiffRows(selectedPatch?.unified_diff || "");
  const confidencePct  = selectedPatch ? Math.round((selectedPatch.confidence || 0) * 100) : 0;
  const isLowConf      = confidencePct > 0 && confidencePct < 70;
  const cwe            = selectedVulnData?.cwe  || selectedPatch?.cwe  || null;
  const owasp          = selectedVulnData?.owasp || selectedPatch?.owasp || null;
  const reviewStatus   = selectedPatch?.review_status || "pending_review";

  /* ── no-scan state ── */
  if (!activeScanId) {
    return (
      <div className="pg6-no-scan">
        <div className="pg6-no-scan-inner">
          <div className="pg6-no-scan-icon">⬡</div>
          <div className="pg6-no-scan-title">PATCH FORGE IDLE</div>
          <div className="pg6-no-scan-sub">
            No target loaded. Initialize a scan to begin patch synthesis.
          </div>
          <button className="pg6-primary" onClick={() => navigate("/scan")}>
            INITIALIZE SCAN
          </button>
        </div>
      </div>
    );
  }

  /* ── main render ── */
  return (
    <div className="pg6-page">

      {/* Toast (FR-M6 feedback) */}
      {toast.msg && (
        <div className={`pg6-toast pg6-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Hero header ── */}
      <div className="pg6-hero">
        <div className="pg6-hero-left">
          <div className="pg6-kicker">PATCH FORGE // MODULE 6 // PG-06</div>
          <h1 className="pg6-title" data-text="Automated Patch Generation">
            Automated Patch Generation
          </h1>
          <p className="pg6-subtitle">
            LLM-powered secure patch synthesis · diff output · validation pipeline ·
            chain-of-thought reasoning · review &amp; approval workflow
          </p>
          <div className="pg6-meta-row">
            <div className="pg6-scan-pill">SCAN <span>{activeScanId}</span></div>
            {patches.length > 0 && (
              <div className="pg6-version-pill">
                {patches.length} patch{patches.length !== 1 ? "es" : ""} forged
              </div>
            )}
          </div>
        </div>

        <div className="pg6-hero-right">
          <button
            className={`pg6-primary${loading ? " pg6-generating" : ""}`}
            onClick={() => handleGeneratePatch(false)}
            disabled={loading || !selectedVuln}
          >
            {loading ? "FORGING…" : "⚡ FORGE PATCH"}
          </button>
          {patches.length > 0 && (
            <button
              className="pg6-regen-btn"
              onClick={() => handleGeneratePatch(true)}
              disabled={loading || !selectedVuln}
              title="FR-M6.8 — Generate alternative patch version"
            >
              ↺ REGEN ALT
            </button>
          )}
          {selectedPatch && (
            <button
              className="pg6-clear-btn"
              onClick={handleClearPatch}
              title="Clear current patch and start fresh"
            >
              ✕ CLEAR PATCH
            </button>
          )}
          {loading && (
            <div className="pg6-forge-loader">
              <div className="pg6-forge-loader-bar" />
              <span className="pg6-forge-loader-text">
                SYNTHESIZING · 4-PHASE CoT · ATTACK SIMULATION
              </span>
            </div>
          )}
          <div className="pg6-primary-hint">
            Diff-only output · semantic validation · no direct repo edits
          </div>
        </div>
      </div>

      {/* ── Target Acquisition Bar (FR-M6.1 metadata) ── */}
      {selectedVulnData && (
        <div className="pg6-target-bar">
          <div className="pg6-target-label">◈ TARGET ACQUIRED</div>
          <div className="pg6-target-chips">
            <span className="pg6-chip pg6-chip--type">
              {selectedVulnData.type || selectedVulnData.name || "UNKNOWN"}
            </span>
            {selectedVulnData.severity && (
              <span className={`pg6-chip pg6-chip--sev pg6-chip--sev-${severityClass(selectedVulnData.severity)}`}>
                {selectedVulnData.severity.toUpperCase()}
              </span>
            )}
            {selectedVulnData.location?.file && (
              <span className="pg6-chip pg6-chip--file">
                {selectedVulnData.location.file}
                {selectedVulnData.location.line ? ` : L${selectedVulnData.location.line}` : ""}
              </span>
            )}
            {cwe   && <span className="pg6-chip pg6-chip--cwe">CWE-{cwe}</span>}
            {owasp && <span className="pg6-chip pg6-chip--owasp">OWASP {owasp}</span>}
          </div>
        </div>
      )}

      {/* ── Exploit PoC Card ── */}
      {(() => {
        const ex = selectedVulnData?.exploit;
        if (!ex) return null;
        return (
          <div className={`pg6-exploit-card ${ex.exploitable ? "exploitable" : "not-exploitable"}`}>
            <div className="pg6-exploit-header">
              <span className="pg6-exploit-icon">⚡</span>
              <span className="pg6-exploit-title">Exploit PoC — Auto-Generated</span>
              <span className={`pg6-exploit-verdict ${ex.exploitable ? "exploitable" : "not-exploitable"}`}>
                {ex.exploitable ? "CONFIRMED EXPLOITABLE" : "NOT EXPLOITABLE AS WRITTEN"}
              </span>
              <span className="pg6-exploit-conf">{Math.round((ex.confidence || 0) * 100)}%</span>
            </div>
            <div className="pg6-exploit-meta">
              {ex.exploit_type    && <div><span>Type</span>{ex.exploit_type}</div>}
              {ex.attack_vector   && <div><span>Attack vector</span>{ex.attack_vector}</div>}
              {ex.impact          && <div><span>Impact</span>{ex.impact}</div>}
            </div>
            {ex.bypass_hints && (() => {
              const hints = Array.isArray(ex.bypass_hints)
                ? ex.bypass_hints
                : String(ex.bypass_hints).split(/[,;]/).map(s => s.trim()).filter(Boolean);
              return hints.length > 0 ? (
                <div className="pg6-exploit-hints">
                  <div className="pg6-exploit-hints-label">Bypass hints</div>
                  {hints.map((h, i) => <span key={i} className="pg6-exploit-hint-tag">{h}</span>)}
                </div>
              ) : null;
            })()}
            {ex.poc_code && (
              <div className="pg6-exploit-poc">
                <div className="pg6-exploit-poc-header">
                  <span className="pg6-exploit-poc-label">Proof-of-Concept Code</span>
                  <button
                    className="pg6-copy-btn"
                    onClick={() => copyToClipboard(ex.poc_code)}
                  >
                    Copy
                  </button>
                </div>
                <pre className="pg6-exploit-pre">{ex.poc_code}</pre>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Main grid ── */}
      <div className="pg6-grid">

        {/* Panel 1 — Mission Control (FR-M6.1, FR-M6.6, FR-M6.7, FR-M6.10) */}
        <div className="pg6-panel pg6-panel-controls">
          <div className="pg6-panel-title">Mission Control</div>

          {/* FR-M6.1 Vulnerability select */}
          <div className="pg6-field">
            <label>Target Vulnerability</label>
            <select
              className="pg6-select"
              value={selectedVuln}
              onChange={(e) => setSelectedVuln(e.target.value)}
            >
              {vulnerabilities.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || v.type || v.id}
                  {v.severity ? ` — ${v.severity}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* FR-M6.8 Patch version select */}
          <div className="pg6-field">
            <label>Patch Version ({patches.length})</label>
            <select
              className="pg6-select"
              value={selectedPatch?.patch_id || ""}
              onChange={(e) => {
                const p = patches.find((x) => x.patch_id === e.target.value);
                setSelectedPatch(p || null);
              }}
            >
              {patches.length > 0 ? (
                patches.map((p, i) => (
                  <option key={p.patch_id} value={p.patch_id}>
                    v{i + 1} · {p.status} · {Math.round((p.confidence || 0) * 100)}%
                    {p.review_status === "approved" ? " ✓" : p.review_status === "rejected" ? " ✗" : ""}
                  </option>
                ))
              ) : (
                <option value="">No patches forged yet</option>
              )}
            </select>
          </div>

          {/* Actions */}
          <div className="pg6-actions">
            <button className="pg6-secondary" onClick={handleValidatePatch} disabled={!selectedPatch}>
              Validate
            </button>
            <button className="pg6-secondary" onClick={handleExportPatch} disabled={!selectedPatch}>
              Export .diff
            </button>
            <button className="pg6-secondary" onClick={handleApplyPatch} disabled={!selectedPatch}>
              Apply Branch
            </button>
            <button
              className="pg6-verify-btn"
              onClick={handleVerifyPatch}
              disabled={!selectedPatch || verifyLoading}
            >
              {verifyLoading ? "Verifying…" : "⟳ Verify Fix"}
            </button>
          </div>

          {/* Status card */}
          <div className="pg6-status-card">
            <div className="pg6-status-label">Patch Status</div>
            <div className="pg6-status-value">{selectedPatch?.status || "IDLE"}</div>
            {selectedPatch?.validations && (
              <div className="pg6-status-meta">
                {selectedPatch.validations.filter((v) => v.passed).length}/
                {selectedPatch.validations.length} checks passed
              </div>
            )}
            {selectedPatch?.patch_id && (
              <div className="pg6-status-id">
                ID: {selectedPatch.patch_id.slice(0, 16)}…
              </div>
            )}
          </div>

          {/* FR-M6.10 Review & Approval workflow */}
          {selectedPatch && (
            <div className="pg6-review-card">
              <div className="pg6-review-label">Review &amp; Approval</div>
              <div className={`pg6-review-status pg6-review-status--${reviewStatus.replace("_", "-")}`}>
                {reviewLabel(reviewStatus)}
              </div>
              <div className="pg6-review-btns">
                <button
                  className="pg6-approve-btn"
                  onClick={handleApprovePatch}
                  disabled={reviewLoading || reviewStatus === "approved"}
                >
                  ✓ APPROVE
                </button>
                <button
                  className="pg6-reject-btn"
                  onClick={handleRejectPatch}
                  disabled={reviewLoading || reviewStatus === "rejected"}
                >
                  ✗ REJECT
                </button>
              </div>
              {reviewStatus === "rejected" && (
                <div className="pg6-review-warning">
                  Rejected — apply &amp; export disabled
                </div>
              )}
              {reviewStatus === "approved" && (
                <div className="pg6-review-approved">
                  Approved — ready for deployment
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel 2 — Diff Viewer (FR-M6.2, FR-M6.3) */}
        <div className="pg6-panel pg6-panel-diff">
          <div className="pg6-panel-title">Diff Viewer — Vulnerable vs Secured</div>
          <div className="pg6-diff-grid">

            {/* Original (FR-M6.2) */}
            <div className="pg6-diff-pane">
              <div className="pg6-diff-header">
                <span>⚠ VULNERABLE</span>
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
                  diffRows.left.map((line, i) => (
                    <div key={`l-${i}`} className={`pg6-line ${line.type}`}>
                      <span className="pg6-line-no">{line.no}</span>
                      <span>{line.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="pg6-diff-empty">Awaiting patch synthesis…</div>
                )}
              </div>
            </div>

            {/* Patched (FR-M6.3) */}
            <div className="pg6-diff-pane">
              <div className="pg6-diff-header">
                <span>✓ SECURED</span>
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
                  diffRows.right.map((line, i) => (
                    <div key={`r-${i}`} className={`pg6-line ${line.type}`}>
                      <span className="pg6-line-no">{line.no}</span>
                      <span>{line.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="pg6-diff-empty">Awaiting patch synthesis…</div>
                )}
              </div>
            </div>
          </div>

          <div className="pg6-diff-copy-row">
            <button
              className="pg6-copy-btn"
              onClick={() => copyToClipboard(selectedPatch?.unified_diff || "")}
              disabled={!selectedPatch}
            >
              Copy Unified Diff
            </button>
          </div>
        </div>

        {/* Panel 3 — AI Synthesis Report (FR-M6.5) */}
        <div className="pg6-panel pg6-panel-explain">
          <div className="pg6-panel-title">AI Synthesis Report</div>

          {/* CWE / OWASP badges (FR-M6.5) */}
          {(cwe || owasp) && (
            <div className="pg6-badge-row">
              {cwe   && <span className="pg6-badge pg6-badge--cwe">CWE-{cwe}</span>}
              {owasp && <span className="pg6-badge pg6-badge--owasp">OWASP {owasp}</span>}
            </div>
          )}

          <p className="pg6-explain">
            {selectedPatch?.explanation ||
              "Run ⚡ FORGE PATCH to generate an AI explanation with CWE/OWASP references and taint-flow reasoning."}
          </p>

          {/* Validation results */}
          {selectedPatch?.validations && (
            <div className="pg6-validation-list">
              {selectedPatch.validations.map((v) => (
                <div key={v.name} className={`pg6-validation ${v.passed ? "ok" : "bad"}`}>
                  <span className="pg6-validation-name">{v.name}</span>
                  <span className="pg6-validation-pill">{v.passed ? "PASS" : "FAIL"}</span>
                  <span className="pg6-validation-detail">{v.details}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel 4 — Confidence Matrix (FR-M6.9) */}
        <div className="pg6-panel pg6-panel-confidence">
          <div className="pg6-panel-title">Confidence Matrix</div>

          {/* FR-M6.9: flag low confidence */}
          {isLowConf && (
            <div className="pg6-low-conf-warn">
              ⚠ LOW CONFIDENCE — Manual review required (FR-M6.9)
            </div>
          )}

          <div className="pg6-ring-wrap">
            <svg className="pg6-ring" viewBox="0 0 36 36">
              <path
                className="pg6-ring-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`pg6-ring-fg${isLowConf ? " pg6-ring-fg--warn" : ""}`}
                strokeDasharray={`${confidencePct}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className={`pg6-ring-text${isLowConf ? " pg6-ring-text--warn" : ""}`}>
              {confidencePct}%
            </div>
          </div>

          <div className="pg6-confidence-foot">
            {isLowConf
              ? "Below 70% threshold — flagged for manual review"
              : "Derived from diff format, syntax, and semantic checks"}
          </div>
        </div>
      </div>

      {/* ── Adversarial Attack Simulation ── */}
      {selectedPatch?.attack_test && (
        <AttackSimulationPanel attackTest={selectedPatch.attack_test} />
      )}
      {loading && (
        <div className="pg6-attack-panel">
          <div className="pg6-attack-header">
            <span className="pg6-attack-icon">🛡</span>
            <span className="pg6-attack-title">Adversarial Attack Simulation</span>
          </div>
          <div className="pg6-attack-loading">
            <div className="pg6-attack-spinner" />
            RUNNING ATTACK SIMULATION · TESTING PATCH AGAINST 5 BYPASS TECHNIQUES…
          </div>
        </div>
      )}

      {/* ── Fix Verification Result ── */}
      {verifyResult && (
        <div className={`pg6-verify-panel ${verifyResult.fixed ? "pg6-verify-panel--fixed" : "pg6-verify-panel--unfixed"}`}>
          <div className="pg6-verify-header">
            <span className="pg6-verify-icon">{verifyResult.fixed ? "✓" : "✗"}</span>
            <span className="pg6-verify-title">Fix Verification Result</span>
            <span className={`pg6-verify-verdict ${verifyResult.fixed ? "fixed" : "unfixed"}`}>
              {verifyResult.fixed ? "VULNERABILITY ELIMINATED" : "VULNERABILITY PERSISTS"}
            </span>
          </div>
          <div className="pg6-verify-grid">
            <div className="pg6-verify-stat">
              <div className="pg6-verify-stat-val">{verifyResult.original_vuln_type || "—"}</div>
              <div className="pg6-verify-stat-label">Original Vuln Type</div>
            </div>
            <div className="pg6-verify-stat">
              <div className="pg6-verify-stat-val">{verifyResult.remaining_vulns?.length ?? 0}</div>
              <div className="pg6-verify-stat-label">Remaining Vulns</div>
            </div>
            <div className="pg6-verify-stat">
              <div className={`pg6-verify-stat-val ${verifyResult.new_vulns?.length ? "warn" : ""}`}>
                {verifyResult.new_vulns?.length ?? 0}
              </div>
              <div className="pg6-verify-stat-label">New Vulns Introduced</div>
            </div>
            <div className="pg6-verify-stat">
              <div className="pg6-verify-stat-val">{verifyResult.patched_code_lines ?? "—"}</div>
              <div className="pg6-verify-stat-label">Patched Code Lines</div>
            </div>
          </div>
          {verifyResult.remaining_vulns?.length > 0 && (
            <div className="pg6-verify-remaining">
              <div className="pg6-verify-remaining-label">Still detected:</div>
              {verifyResult.remaining_vulns.map((v, i) => (
                <span key={i} className="pg6-verify-vuln-tag">{v}</span>
              ))}
            </div>
          )}
          {verifyResult.new_vulns?.length > 0 && (
            <div className="pg6-verify-new-vulns">
              <div className="pg6-verify-remaining-label">⚠ New issues introduced:</div>
              {verifyResult.new_vulns.map((v, i) => (
                <span key={i} className="pg6-verify-vuln-tag pg6-verify-vuln-tag--new">{v}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Exploit Sandbox Terminal ── */}
      {false && (
        <div className="pg6-sandbox-panel">
          <div className="pg6-sandbox-header">
            <span className="pg6-sandbox-icon">⬡</span>
            <span className="pg6-sandbox-title">Exploit Sandbox — Isolated Execution</span>
            {sandboxResult && (
              <span className={`pg6-sandbox-verdict ${sandboxResult.confirmed ? "confirmed" : sandboxResult.timed_out ? "timeout" : "not-confirmed"}`}>
                {sandboxResult.confirmed ? "⚡ EXPLOIT CONFIRMED" : sandboxResult.timed_out ? "⏱ SANDBOX TIMEOUT" : "NOT EXPLOITABLE"}
              </span>
            )}
          </div>
          {sandboxLoading && (
            <div className="pg6-sandbox-loading">
              <div className="pg6-sandbox-spinner" />
              <span>EXECUTING IN ISOLATED CONTAINER · --network none · --read-only…</span>
            </div>
          )}
          {sandboxResult && (
            <div className="pg6-sandbox-body">
              <div className="pg6-sandbox-meta-row">
                <span className={`pg6-sandbox-exit ${sandboxResult.exit_code === 0 ? "ok" : "bad"}`}>
                  EXIT {sandboxResult.exit_code ?? "—"}
                </span>
                {sandboxResult.timed_out && <span className="pg6-sandbox-timeout">TIMED OUT</span>}
              </div>
              {sandboxResult.stdout && (
                <div className="pg6-sandbox-stream">
                  <div className="pg6-sandbox-stream-label">STDOUT</div>
                  <pre className="pg6-sandbox-pre">{sandboxResult.stdout}</pre>
                </div>
              )}
              {sandboxResult.stderr && (
                <div className="pg6-sandbox-stream">
                  <div className="pg6-sandbox-stream-label pg6-sandbox-stream-label--err">STDERR</div>
                  <pre className="pg6-sandbox-pre pg6-sandbox-pre--err">{sandboxResult.stderr}</pre>
                </div>
              )}
              {sandboxResult.error && (
                <div className="pg6-sandbox-error">{sandboxResult.error}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Patch History Log (FE-5, FR-M6.8) ── */}
      {patches.length > 0 && (
        <div className="pg6-history">
          <button
            className="pg6-history-toggle"
            onClick={() => setHistoryOpen((h) => !h)}
          >
            <span className="pg6-hist-toggle-label">⏱ PATCH HISTORY &amp; AUDIT TRAIL</span>
            <span className="pg6-history-count">{patches.length} record{patches.length !== 1 ? "s" : ""}</span>
            <span className="pg6-history-arrow">{historyOpen ? "▲" : "▼"}</span>
          </button>

          {historyOpen && (
            <div className="pg6-history-log">
              <div className="pg6-hist-header">
                <span>VER</span>
                <span>PATCH ID</span>
                <span>STATUS</span>
                <span>REVIEW</span>
                <span>CONF</span>
              </div>
              {patches.map((p, i) => (
                <div
                  key={p.patch_id}
                  className={`pg6-history-row${selectedPatch?.patch_id === p.patch_id ? " active" : ""}`}
                  onClick={() => setSelectedPatch(p)}
                >
                  <span className="pg6-hist-ver">v{i + 1}</span>
                  <span className="pg6-hist-id">{p.patch_id.slice(0, 12)}…</span>
                  <span className="pg6-hist-status">{p.status}</span>
                  <span className={`pg6-hist-review pg6-hist-review--${(p.review_status || "pending").replace("_", "-")}`}>
                    {reviewLabel(p.review_status || "pending_review")}
                  </span>
                  <span className={`pg6-hist-conf${(p.confidence || 0) < 0.7 ? " warn" : ""}`}>
                    {Math.round((p.confidence || 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
