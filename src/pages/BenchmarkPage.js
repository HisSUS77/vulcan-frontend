// src/pages/BenchmarkPage.js
import React, { useState, useEffect, useCallback } from "react";
import { benchmarkService } from "../api/services";

const OUTCOME_COLOR = { TP: "#4ade80", FP: "#f87171", FN: "#fb923c", TN: "#94a3b8" };

function OutcomePill({ outcome }) {
  const c = OUTCOME_COLOR[outcome] || "#94a3b8";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 999, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
      border: `1px solid ${c}55`, background: `${c}22`, color: c, fontWeight: 700,
    }}>{outcome}</span>
  );
}

function LabelPill({ label }) {
  const vuln = label === "vulnerable";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 999, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
      border: `1px solid ${vuln ? "#f8717155" : "#4ade8055"}`,
      background: vuln ? "#f8717122" : "#4ade8022",
      color: vuln ? "#f87171" : "#4ade80", fontWeight: 600,
    }}>{label}</span>
  );
}

function CwePill({ cwe }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 999, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
      border: "1px solid rgba(167,139,250,0.35)", background: "rgba(167,139,250,0.12)",
      color: "#a78bfa", fontWeight: 600,
    }}>{cwe}</span>
  );
}

function LangPill({ lang }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 999, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
      border: "1px solid rgba(56,189,248,0.35)", background: "rgba(56,189,248,0.12)",
      color: "#38bdf8", fontWeight: 600,
    }}>{lang}</span>
  );
}

// ── Test Cases ────────────────────────────────────────────────────────────────
function TestCasesTab({ onCasesLoaded }) {
  const [cases, setCases]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterCWE, setFilterCWE]     = useState("");
  const [filterLang, setFilterLang]   = useState("");
  const [filterLabel, setFilterLabel] = useState("");
  const [showAdd, setShowAdd]         = useState(false);
  const [form, setForm]               = useState({ name: "", code: "", language: "python", cwe: "", vuln_type: "", label: "vulnerable", source: "manual" });
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCWE)   params.cwe = filterCWE;
      if (filterLang)  params.language = filterLang;
      if (filterLabel) params.label = filterLabel;
      const res = await benchmarkService.listTestCases(params);
      setCases(res.data);
      if (onCasesLoaded) onCasesLoaded(res.data.length);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filterCWE, filterLang, filterLabel, onCasesLoaded]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this test case?")) return;
    await benchmarkService.deleteTestCase(id);
    load();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await benchmarkService.createTestCase(form); setShowAdd(false); load(); }
    catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const cwes = [...new Set(cases.map(c => c.cwe))].sort();

  return (
    <div>
      {/* Filter row */}
      <div className="bm2-filter-row">
        <select className="rp6-select bm2-mini-select" value={filterCWE} onChange={e => setFilterCWE(e.target.value)}>
          <option value="">All CWEs</option>
          {cwes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="rp6-select bm2-mini-select" value={filterLang} onChange={e => setFilterLang(e.target.value)}>
          <option value="">All Languages</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
        <select className="rp6-select bm2-mini-select" value={filterLabel} onChange={e => setFilterLabel(e.target.value)}>
          <option value="">All Labels</option>
          <option value="vulnerable">Vulnerable</option>
          <option value="safe">Safe</option>
        </select>
        <div className="flex-1" />
        <button className="rp6-btn bm2-add-btn" onClick={() => setShowAdd(s => !s)}>
          {showAdd ? "✕ Cancel" : "+ Add Case"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form className="bm2-add-form" onSubmit={handleAdd}>
          <div className="bm2-form-row">
            <input className="rp6-input bm2-input-grow" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="rp6-input bm2-input-grow" placeholder="CWE (e.g. CWE-89)" value={form.cwe} onChange={e => setForm(f => ({ ...f, cwe: e.target.value }))} required />
            <input className="rp6-input bm2-input-grow" placeholder="Vuln type (e.g. SQL_INJECTION)" value={form.vuln_type} onChange={e => setForm(f => ({ ...f, vuln_type: e.target.value }))} required />
          </div>
          <div className="bm2-form-row">
            <select className="rp6-select bm2-mini-select" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
            <select className="rp6-select bm2-mini-select" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}>
              <option value="vulnerable">Vulnerable</option>
              <option value="safe">Safe</option>
            </select>
          </div>
          <textarea className="rp6-input bm2-textarea" rows={5} placeholder="Code snippet…" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
          <div className="flex gap-2">
            <button className="rp6-btn rp6-btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Test Case"}</button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="bm2-loading">Loading test cases…</div>
      ) : (
        <div className="rp6-table-wrap">
          <table className="rp6-table text-[13px]">
            <thead>
              <tr>
                <th>NAME</th>
                <th>LANGUAGE</th>
                <th>CWE</th>
                <th>VULN TYPE</th>
                <th>LABEL</th>
                <th>SOURCE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 && (
                <tr><td colSpan={7} className="rp6-empty-row">No test cases found.</td></tr>
              )}
              {cases.map(tc => (
                <tr key={tc.id}>
                  <td style={{ fontWeight: 500, color: "#e5e7eb", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tc.code}>{tc.name}</td>
                  <td><LangPill lang={tc.language} /></td>
                  <td><CwePill cwe={tc.cwe} /></td>
                  <td style={{ color: "#93a4b8", fontSize: 12 }}>{tc.vuln_type}</td>
                  <td><LabelPill label={tc.label} /></td>
                  <td style={{ color: "#93a4b8", fontSize: 12 }}>{tc.source}</td>
                  <td>
                    <button className="bm2-del-btn" onClick={() => handleDelete(tc.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="text-xs text-[#475569] mt-2">{cases.length} test cases</div>
    </div>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────
function ResultsTab({ latestResult }) {
  if (!latestResult) return (
    <div className="bm2-loading">No results yet. Run a benchmark from the top-right button.</div>
  );

  const r = latestResult;
  return (
    <div className="flex flex-col gap-5">
      {/* Per-CWE */}
      {r.per_cwe?.length > 0 && (
        <div>
          <div className="rp6-panel-title mb-[10px]">Per-CWE Breakdown</div>
          <div className="rp6-table-wrap">
            <table className="rp6-table text-[13px]">
              <thead>
                <tr>
                  <th>CWE</th><th>PRECISION</th><th>RECALL</th><th>F1</th><th>TP</th><th>FP</th><th>FN</th><th>TN</th>
                </tr>
              </thead>
              <tbody>
                {r.per_cwe.sort((a, b) => b.f1 - a.f1).map(c => (
                  <tr key={c.cwe}>
                    <td><CwePill cwe={c.cwe} /></td>
                    <td style={{ color: "#e5e7eb" }}>{(c.precision * 100).toFixed(0)}%</td>
                    <td style={{ color: "#e5e7eb" }}>{(c.recall * 100).toFixed(0)}%</td>
                    <td style={{ color: "#4ade80", fontWeight: 600 }}>{(c.f1 * 100).toFixed(0)}%</td>
                    <td style={{ color: "#4ade80" }}>{c.tp}</td>
                    <td style={{ color: "#f87171" }}>{c.fp}</td>
                    <td style={{ color: "#fb923c" }}>{c.fn}</td>
                    <td style={{ color: "#94a3b8" }}>{c.tn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-case */}
      {r.case_results?.length > 0 && (
        <div>
          <div className="rp6-panel-title mb-[10px]">Per-Case Results</div>
          <div className="rp6-table-wrap max-h-[320px]">
            <table className="rp6-table text-[13px]">
              <thead>
                <tr>
                  <th>NAME</th><th>CWE</th><th>LABEL</th><th>OUTCOME</th><th>DETECTED TYPE</th><th>CONFIDENCE</th>
                </tr>
              </thead>
              <tbody>
                {r.case_results.map((cr, i) => (
                  <tr key={i} style={{ borderLeft: `3px solid ${OUTCOME_COLOR[cr.outcome] || "#475569"}` }}>
                    <td style={{ fontWeight: 500, color: "#e5e7eb" }}>{cr.name}</td>
                    <td><CwePill cwe={cr.cwe} /></td>
                    <td><LabelPill label={cr.label} /></td>
                    <td><OutcomePill outcome={cr.outcome} /></td>
                    <td style={{ color: "#93a4b8", fontSize: 12 }}>{cr.detected_type || "—"}</td>
                    <td style={{ color: "#93a4b8" }}>{cr.confidence > 0 ? `${(cr.confidence * 100).toFixed(0)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function LeaderboardTab({ runVersion }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    benchmarkService.leaderboard()
      .then(r => setEntries(r.data || []))
      .catch(err => console.error("[Benchmark] leaderboard failed:", err))
      .finally(() => setLoading(false));
  }, [runVersion]);

  if (loading) return <div className="bm2-loading">Loading leaderboard…</div>;
  if (!entries.length) return <div className="bm2-loading">No runs yet. Run a benchmark first.</div>;

  return (
    <div>
      <div className="rp6-panel-title mb-[10px]">Model Comparison — ranked by best F1</div>
      <div className="rp6-table-wrap">
        <table className="rp6-table text-[13px]">
          <thead>
            <tr>
              <th>#</th><th>MODEL</th><th>RUNS</th><th>BEST F1</th><th>AVG PRECISION</th><th>AVG RECALL</th><th>AVG F1</th><th>TREND</th><th>LAST RUN</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.model_used} style={i === 0 ? { borderLeft: "3px solid rgba(250,204,21,0.7)", background: "rgba(250,204,21,0.04)" } : {}}>
                <td style={{ color: "#475569", fontWeight: 700 }}>{i === 0 ? "👑" : `#${i + 1}`}</td>
                <td style={{ fontWeight: 600, color: "#e5e7eb", fontSize: 12 }}>{e.model_used}</td>
                <td style={{ color: "#93a4b8" }}>{e.runs}</td>
                <td style={{ color: "#4ade80", fontWeight: 700 }}>{(e.best_f1 * 100).toFixed(1)}%</td>
                <td style={{ color: "#e5e7eb" }}>{(e.avg_precision * 100).toFixed(1)}%</td>
                <td style={{ color: "#e5e7eb" }}>{(e.avg_recall * 100).toFixed(1)}%</td>
                <td style={{ color: "#e5e7eb" }}>{(e.avg_f1 * 100).toFixed(1)}%</td>
                <td style={{ fontWeight: 700, fontSize: 16, color: e.trend === "↑" ? "#4ade80" : e.trend === "↓" ? "#f87171" : "#475569" }}>{e.trend}</td>
                <td style={{ color: "#475569", fontSize: 12 }}>{e.last_run ? new Date(e.last_run).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────
function HistoryTab({ runVersion }) {
  const [runs, setRuns]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail]     = useState(null);

  useEffect(() => {
    setLoading(true);
    benchmarkService.listRuns(30)
      .then(r => setRuns(r.data || []))
      .catch(err => console.error("[Benchmark] history failed:", err))
      .finally(() => setLoading(false));
  }, [runVersion]);

  const openRun = async (id) => {
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
    setExpanded(id);
    setDetail(null);
    try {
      const res = await benchmarkService.getRun(id);
      setDetail(res.data);
    } catch { /* ignore */ }
  };

  if (loading) return <div className="bm2-loading">Loading history…</div>;
  if (!runs.length) return <div className="bm2-loading">No runs yet.</div>;

  return (
    <div className="flex flex-col gap-[6px]">
      {runs.map(run => (
        <div key={run.id} className="bm2-history-item">
          <div className="bm2-history-row" onClick={() => openRun(run.id)}>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{run.run_date ? new Date(run.run_date).toLocaleString() : "—"}</span>
            <span style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{run.model_used}</span>
            <span style={{ color: "#475569", fontSize: 12 }}>{run.total} cases</span>
            <span style={{ color: "#4ade80", fontWeight: 700 }}>F1 {(run.f1 * 100).toFixed(1)}%</span>
            <span style={{ color: "#475569", fontSize: 12 }}>P {(run.precision * 100).toFixed(0)}% · R {(run.recall * 100).toFixed(0)}%</span>
            <span style={{ color: "#475569", marginLeft: "auto" }}>{expanded === run.id ? "▲" : "▼"}</span>
          </div>
          {expanded === run.id && (
            <div className="bm2-history-detail">
              {!detail ? <div className="bm2-loading" style={{ padding: "12px 0" }}>Loading…</div> : (
                <div className="rp6-table-wrap">
                  <table className="rp6-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr><th>NAME</th><th>CWE</th><th>LABEL</th><th>OUTCOME</th></tr>
                    </thead>
                    <tbody>
                      {detail.case_results?.map((cr, i) => (
                        <tr key={i}>
                          <td style={{ color: "#e5e7eb", fontWeight: 500 }}>{cr.name}</td>
                          <td><CwePill cwe={cr.cwe} /></td>
                          <td><LabelPill label={cr.label} /></td>
                          <td><OutcomePill outcome={cr.outcome} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Verdict pill ─────────────────────────────────────────────────────────────
function VerdictPill({ verdict }) {
  const confirmed = verdict === "confirmed";
  const color = confirmed ? "#4ade80" : "#f87171";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 999, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
      border: `1px solid ${color}55`, background: `${color}22`, color, fontWeight: 700,
    }}>{verdict}</span>
  );
}

// ── Field Metrics tab ─────────────────────────────────────────────────────────
function FieldMetricsTab({ metrics, onMetricsReload }) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [running, setRunning]   = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      benchmarkService.confirmedFindings(),
      benchmarkService.listFieldRuns(1),
    ])
      .then(([f, r]) => {
        if (!active) return;
        setFindings(f.data || []);
        if (r.data?.length) setRunResult(r.data[0]);
      })
      .catch(err => { if (active) setError(err?.message || "Failed to load findings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleRunField = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await benchmarkService.runFieldBenchmark();
      setRunResult(res.data);
      if (onMetricsReload) onMetricsReload();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Field benchmark failed.");
    } finally {
      setRunning(false);
    }
  };

  const pct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "—";
  const visible = filter === "all" ? findings : findings.filter(f => f.oracle_verdict === filter);

  if (loading) return <div className="bm2-loading">Loading field findings…</div>;

  return (
    <div className="flex flex-col gap-5">
      {error && <div className="rp6-alert"><strong>Error:</strong> {error}</div>}

      {/* Field benchmark run scores */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="rp6-panel-title">Field Benchmark Scores</div>
          {runResult && <span style={{ fontSize: 11, color: "#475569" }}>oracle-based · {runResult.total} real findings · precision = TP/(TP+FP) · recall N/A</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Field Precision", value: runResult ? pct(runResult.precision) : "No run", color: "#4ade80" },
            { label: "FP Rate",         value: runResult ? pct(runResult.fp_rate)  : "—",      color: "#fb923c" },
            { label: "TP Confirmed",    value: runResult ? runResult.tp            : "—",      color: "#4ade80" },
            { label: "FP Rejected",     value: runResult ? runResult.fp            : "—",      color: "#f87171" },
            { label: "Total",           value: runResult ? runResult.total         : "—",      color: "#e5e7eb" },
          ].map(s => (
            <div key={s.label} className="rp6-card" style={{ padding: "11px 18px", minWidth: 130, flex: "0 0 auto" }}>
              <div className="rp6-label">{s.label}</div>
              <div style={{ color: s.color, fontSize: 24, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
        {!runResult && (
          <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
            Run the field benchmark below to see scores against oracle-confirmed findings.
          </div>
        )}
      </div>

      {/* Confirmed findings table */}
      <div>
        <div className="flex items-center gap-[10px] mb-[10px]">
          <div className="rp6-panel-title">AI-Oracle Confirmed Findings</div>
          <div className="flex-1" />
          <select className="rp6-select bm2-mini-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            className="rp6-btn rp6-btn-primary bm2-run-btn"
            style={{ fontSize: 12, padding: "5px 14px" }}
            onClick={handleRunField}
            disabled={running || findings.length === 0}
          >
            {running ? "Running…" : "▶ Run Field Benchmark"}
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="bm2-loading">
            {findings.length === 0
              ? "No confirmed findings yet. Run real scans — HIGH/CRITICAL findings are auto-confirmed by the oracle after each scan."
              : "No findings match the selected filter."}
          </div>
        ) : (
          <div className="rp6-table-wrap max-h-[340px]">
            <table className="rp6-table" style={{ fontSize: 12 }}>
              <thead>
                <tr><th>VULN TYPE</th><th>CWE</th><th>SEV</th><th>ORACLE</th><th>CONFIDENCE</th><th>FILE</th><th>SCAN</th></tr>
              </thead>
              <tbody>
                {visible.map(f => (
                  <tr key={f.id}>
                    <td style={{ color: "#e5e7eb", fontWeight: 500 }}>{f.vuln_type || "—"}</td>
                    <td><CwePill cwe={f.cwe || "—"} /></td>
                    <td style={{ color: f.severity === "critical" ? "#f87171" : f.severity === "high" ? "#fb923c" : "#e5e7eb", fontWeight: 600, textTransform: "uppercase", fontSize: 10 }}>{f.severity}</td>
                    <td><VerdictPill verdict={f.oracle_verdict} /></td>
                    <td style={{ color: "#93a4b8" }}>{f.oracle_confidence != null ? `${(f.oracle_confidence * 100).toFixed(0)}%` : "—"}</td>
                    <td style={{ color: "#475569", fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.file_path}>{f.file_path || "—"}</td>
                    <td style={{ color: "#475569", fontSize: 11 }}>{f.scan_id?.slice(-8) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-[11px] text-[#475569] mt-[6px]">{visible.length} findings shown</div>
      </div>
    </div>
  );
}

// ── Spot Check tab ────────────────────────────────────────────────────────────
function SpotCheckTab({ onMetricsReload }) {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [showAll, setShowAll]   = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    benchmarkService.spotcheck(!showAll)
      .then(res => { if (active) setItems(res.data || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showAll]);

  const handleVerdict = async (id, verdict) => {
    setSubmitting(id + verdict);
    try {
      await benchmarkService.submitVerdict(id, verdict);
      setItems(prev => prev.map(it => it.id === id ? { ...it, human_verdict: verdict } : it));
      if (onMetricsReload) onMetricsReload();
    } catch { /* ignore */ }
    finally { setSubmitting(null); }
  };

  if (loading) return <div className="bm2-loading">Loading spot-check queue…</div>;

  const reviewed   = items.filter(i => i.human_verdict);
  const agreed     = reviewed.filter(i => i.human_verdict === i.oracle_verdict).length;
  const agreePct   = reviewed.length ? Math.round((agreed / reviewed.length) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="rp6-panel-title">Human Spot-Check Review</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            10% of oracle decisions are randomly sampled here for human verification.
          </div>
        </div>
        <div className="flex-1" />
        {agreePct != null && (
          <div style={{ fontSize: 13, color: "#a78bfa" }}>
            Human agreement: <strong>{agreePct}%</strong> ({agreed}/{reviewed.length})
          </div>
        )}
        <button
          className="rp6-btn"
          style={{ fontSize: 12, padding: "4px 12px" }}
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? "Show Pending Only" : "Show All"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bm2-loading">
          No spot-check items yet. They appear automatically once scans confirm findings.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div key={item.id} className="bm2-history-item">
              {/* Row summary */}
              <div
                className="bm2-history-row"
                onClick={() => setExpanded(e => e === item.id ? null : item.id)}
                style={{ cursor: "pointer" }}
              >
                <VerdictPill verdict={item.oracle_verdict} />
                <span style={{ color: "#e5e7eb", fontWeight: 600, fontSize: 13 }}>{item.vuln_type || "Unknown"}</span>
                <CwePill cwe={item.cwe || "—"} />
                <span style={{ color: "#475569", fontSize: 12 }}>{item.file_path || "—"}</span>
                <span style={{ color: "#93a4b8", fontSize: 12 }}>
                  confidence {item.oracle_confidence != null ? `${(item.oracle_confidence * 100).toFixed(0)}%` : "—"}
                </span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  {item.human_verdict ? (
                    <span style={{ fontSize: 12, color: item.human_verdict === item.oracle_verdict ? "#4ade80" : "#f87171" }}>
                      Reviewed: {item.human_verdict}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); handleVerdict(item.id, "confirmed"); }}
                        disabled={!!submitting}
                        style={{ padding: "3px 12px", borderRadius: 6, border: "1px solid rgba(74,222,128,0.4)", background: "rgba(74,222,128,0.08)", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                      >{submitting === item.id + "confirmed" ? "…" : "✓ Confirm"}</button>
                      <button
                        onClick={e => { e.stopPropagation(); handleVerdict(item.id, "rejected"); }}
                        disabled={!!submitting}
                        style={{ padding: "3px 12px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                      >{submitting === item.id + "rejected" ? "…" : "✕ Reject"}</button>
                    </>
                  )}
                  <span style={{ color: "#475569" }}>{expanded === item.id ? "▲" : "▼"}</span>
                </span>
              </div>

              {/* Expanded detail */}
              {expanded === item.id && (
                <div className="bm2-history-detail flex flex-col gap-[10px]">
                  <div style={{ fontSize: 12, color: "#93a4b8", lineHeight: 1.6 }}>
                    <strong style={{ color: "#e5e7eb" }}>Oracle reasoning:</strong> {item.oracle_reasoning || "No reasoning provided."}
                  </div>
                  {item.code_snippet && (
                    <pre style={{
                      background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 6, padding: "10px 14px", fontSize: 11, color: "#e5e7eb",
                      overflow: "auto", maxHeight: 200, whiteSpace: "pre-wrap", wordBreak: "break-all",
                    }}>{item.code_snippet}</pre>
                  )}
                  {item.poc_code && (
                    <div>
                      <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>ORACLE POC</div>
                      <pre style={{
                        background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)",
                        borderRadius: 6, padding: "10px 14px", fontSize: 11, color: "#fb923c",
                        overflow: "auto", maxHeight: 160, whiteSpace: "pre-wrap", wordBreak: "break-all",
                      }}>{item.poc_code}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BenchmarkPage() {
  const [tab, setTab]               = useState(0);
  const [running, setRunning]       = useState(false);
  const [lastRun, setLastRun]       = useState(null);
  const [totalCases, setTotalCases] = useState(null);
  const [runError, setRunError]     = useState("");
  const [runVersion, setRunVersion] = useState(0);
  const [fieldMetrics, setFieldMetrics] = useState(null);
  const [enableLlm, setEnableLlm] = useState(false);

  const loadFieldMetrics = () => {
    benchmarkService.fieldMetrics()
      .then(r => setFieldMetrics(r.data))
      .catch(() => {});
  };

  // Load most recent run + field metrics on mount
  useEffect(() => {
    benchmarkService.listRuns(1)
      .then(r => { if (r.data?.length) setLastRun(r.data[0]); })
      .catch(() => {});
    loadFieldMetrics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = async () => {
    setRunning(true);
    setRunError("");
    try {
      const res = await benchmarkService.runBenchmark(enableLlm);
      setLastRun(res.data);
      setRunVersion(v => v + 1);
      setTab(1);
    } catch (err) {
      const msg = err?.userMessage || err?.response?.data?.detail || err?.message || "Benchmark run failed.";
      setRunError(msg);
      console.error("[Benchmark] run failed:", err);
    } finally {
      setRunning(false);
    }
  };

  const pct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "—";
  const num = (v) => v != null ? v : "—";

  return (
    <div className="rp6-page bm2-page">
      {/* Hero */}
      <div className="rp6-hero">
        <div>
          <h1 className="rp6-title bm2-title">Benchmark &amp; Model Performance</h1>
          <div className="rp6-cyber-status">
            <span className="rp6-cyber-dot" />
            {tab >= 4 ? (
              <>
                <span>FIELD ORACLE ACTIVE</span>
                {fieldMetrics && <>
                  <span className="rp6-cyber-sep">{"//"}</span>
                  <span>{fieldMetrics.oracle_confirmed} CONFIRMED</span>
                  <span className="rp6-cyber-sep">{"//"}</span>
                  <span>PRECISION {pct(fieldMetrics.field_precision)}</span>
                  {fieldMetrics.spotcheck_pending > 0 && <>
                    <span className="rp6-cyber-sep">{"//"}</span>
                    <span>{fieldMetrics.spotcheck_pending} PENDING REVIEW</span>
                  </>}
                </>}
              </>
            ) : (
              <>
                <span>BENCHMARK ACTIVE</span>
                {totalCases != null && <><span className="rp6-cyber-sep">{"//"}</span><span>{totalCases} CASES LOADED</span></>}
                {lastRun && (
                  <>
                    <span className="rp6-cyber-sep">{"//"}</span>
                    <span>LAST RUN: F1 {pct(lastRun.f1)}</span>
                    <span className="rp6-cyber-sep">{"//"}</span>
                    <span>{lastRun.model_used || "UNKNOWN MODEL"}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="rp6-exports flex flex-col items-end gap-2">
          <button
            className="rp6-btn rp6-btn-primary bm2-run-btn"
            onClick={handleRun}
            disabled={running}
          >
            {running ? <><span className="bm2-spinner" /> Running…</> : "▶ Run Benchmark"}
          </button>
          {/* LLM toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none" }}>
            <div
              onClick={() => setEnableLlm(v => !v)}
              style={{
                width: 36, height: 20, borderRadius: 10, position: "relative", cursor: "pointer",
                background: enableLlm ? "linear-gradient(135deg,#f97316,#fb923c)" : "rgba(255,255,255,0.1)",
                border: enableLlm ? "1px solid #f9731680" : "1px solid rgba(255,255,255,0.15)",
                transition: "background 0.2s",
              }}
            >
              <div style={{
                position: "absolute", top: 2, left: enableLlm ? 18 : 2,
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }} />
            </div>
            <span style={{ fontSize: 11, color: enableLlm ? "#fb923c" : "#475569", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {enableLlm ? "LLM ON" : "LLM OFF"}
            </span>
            {enableLlm && <span style={{ fontSize: 10, color: "#475569" }}>— slower, uses API quota</span>}
          </label>
        </div>
      </div>

      {/* Error banner */}
      {runError && (
        <div className="rp6-alert mb-[14px]">
          <strong>Run failed:</strong> {runError}
        </div>
      )}

      {/* Stats bar — switches context based on active tab */}
      <div className="rp6-summary" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
        {tab >= 4 ? (
          /* Field Metrics / Spot Check stats */
          <>
            <div className="rp6-card">
              <div className="rp6-label">Field Precision</div>
              <div className="rp6-value rp6-accuracy">{fieldMetrics ? pct(fieldMetrics.field_precision) : "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">Oracle Confirmed</div>
              <div className="rp6-value" style={{ color: "#4ade80" }}>{fieldMetrics ? num(fieldMetrics.oracle_confirmed) : "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">Oracle Rejected</div>
              <div className="rp6-value" style={{ color: "#f87171" }}>{fieldMetrics ? num(fieldMetrics.oracle_rejected) : "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">Spotcheck Pending</div>
              <div className="rp6-value rp6-high">{fieldMetrics ? num(fieldMetrics.spotcheck_pending) : "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">Reviewed</div>
              <div className="rp6-value" style={{ color: "#e5e7eb" }}>{fieldMetrics ? num(fieldMetrics.spotcheck_reviewed) : "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">Human Agreement</div>
              <div className="rp6-value" style={{ color: "#a78bfa" }}>
                {fieldMetrics?.human_agreement_rate != null ? pct(fieldMetrics.human_agreement_rate) : "No data"}
              </div>
            </div>
          </>
        ) : (
          /* Synthetic benchmark stats */
          <>
            <div className="rp6-card">
              <div className="rp6-label">Precision</div>
              <div className="rp6-value rp6-accuracy">{lastRun ? pct(lastRun.precision) : "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">Recall</div>
              <div className="rp6-value" style={{ color: "#a78bfa" }}>{lastRun ? pct(lastRun.recall) : "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">F1 Score</div>
              <div className="rp6-value rp6-low">{lastRun ? pct(lastRun.f1) : "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">FP Rate</div>
              <div className="rp6-value rp6-high">{lastRun ? pct(lastRun.fp_rate) : "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">Total Cases</div>
              <div className="rp6-value">{lastRun ? num(lastRun.total) : totalCases ?? "—"}</div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">TP / FP / FN</div>
              <div className="rp6-value" style={{ fontSize: 15, color: "#e5e7eb" }}>
                {lastRun ? `${lastRun.tp} / ${lastRun.fp} / ${lastRun.fn}` : "—"}
              </div>
            </div>
            <div className="rp6-card">
              <div className="rp6-label">Duration</div>
              <div className="rp6-value" style={{ fontSize: 16, color: "#e5e7eb" }}>
                {lastRun ? `${(lastRun.duration_ms / 1000).toFixed(1)}s` : "—"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Two-column grid */}
      <div className="rp6-grid">

        {/* Main panel */}
        <div className="rp6-panel">
          <div className="rp6-panel-header">
            <span className="rp6-panel-title">
              {["Test Cases", "Results", "Leaderboard", "History", "Field Metrics", "Spot Check"][tab]}
            </span>
            <div className="rp6-toggle flex-wrap">
              {["Test Cases", "Results", "Leaderboard", "History", "Field Metrics", "Spot Check"].map((t, i) => (
                <button
                  key={t}
                  className={`rp6-toggle-btn ${tab === i ? "active" : ""}`}
                  onClick={() => setTab(i)}
                >{t}</button>
              ))}
            </div>
          </div>

          {tab === 0 && <TestCasesTab onCasesLoaded={setTotalCases} />}
          {tab === 1 && <ResultsTab latestResult={lastRun} />}
          {tab === 2 && <LeaderboardTab runVersion={runVersion} />}
          {tab === 3 && <HistoryTab runVersion={runVersion} />}
          {tab === 4 && <FieldMetricsTab metrics={fieldMetrics} onMetricsReload={loadFieldMetrics} />}
          {tab === 5 && <SpotCheckTab onMetricsReload={loadFieldMetrics} />}
        </div>

        {/* Right side panels */}
        <div className="rp6-side">

          {/* Run info — context-aware */}
          <div className="rp6-panel">
            <div className="rp6-panel-header">
              <span className="rp6-panel-title">{tab >= 4 ? "Oracle Info" : "Run Info"}</span>
            </div>
            {tab >= 4 ? (
              <div className="rp6-scan-info">
                <div><span>Total Findings</span><strong>{fieldMetrics?.total ?? "—"}</strong></div>
                <div><span>Oracle Confirmed</span><strong style={{ color: "#4ade80" }}>{fieldMetrics?.oracle_confirmed ?? "—"}</strong></div>
                <div><span>Oracle Rejected</span><strong style={{ color: "#f87171" }}>{fieldMetrics?.oracle_rejected ?? "—"}</strong></div>
                <div><span>Field Precision</span><strong style={{ color: "#38bdf8" }}>{fieldMetrics ? pct(fieldMetrics.field_precision) : "—"}</strong></div>
                <div><span>Spotcheck Pending</span><strong style={{ color: "#fb923c" }}>{fieldMetrics?.spotcheck_pending ?? "—"}</strong></div>
                <div><span>Reviewed</span><strong>{fieldMetrics?.spotcheck_reviewed ?? "—"}</strong></div>
                <div><span>Human Agreement</span><strong style={{ color: "#a78bfa" }}>{fieldMetrics?.human_agreement_rate != null ? pct(fieldMetrics.human_agreement_rate) : "No data"}</strong></div>
              </div>
            ) : (
              <div className="rp6-scan-info">
                <div><span>Model</span><strong>{lastRun?.model_used || "—"}</strong></div>
                <div><span>Status</span><strong style={{ color: lastRun ? "#4ade80" : "#475569" }}>{lastRun ? "COMPLETED" : "NOT RUN"}</strong></div>
                <div><span>Total Cases</span><strong>{lastRun?.total ?? "—"}</strong></div>
                <div><span>True Positives</span><strong style={{ color: "#4ade80" }}>{lastRun?.tp ?? "—"}</strong></div>
                <div><span>False Positives</span><strong style={{ color: "#f87171" }}>{lastRun?.fp ?? "—"}</strong></div>
                <div><span>False Negatives</span><strong style={{ color: "#fb923c" }}>{lastRun?.fn ?? "—"}</strong></div>
                <div><span>True Negatives</span><strong style={{ color: "#94a3b8" }}>{lastRun?.tn ?? "—"}</strong></div>
                <div><span>Duration</span><strong>{lastRun ? `${(lastRun.duration_ms / 1000).toFixed(2)}s` : "—"}</strong></div>
                <div><span>Date</span><strong style={{ fontSize: 11, color: "#e5e7eb" }}>{lastRun?.run_date ? new Date(lastRun.run_date).toLocaleString() : "—"}</strong></div>
              </div>
            )}
          </div>

          {/* How to use */}
          <div className="rp6-panel">
            <div className="rp6-panel-header">
              <span className="rp6-panel-title">Quick Guide</span>
            </div>
            <div className="flex flex-col gap-[10px] text-xs text-[#93a4b8] leading-relaxed">
              <div>
                <strong style={{ color: "#e5e7eb" }}>1. Review test cases</strong><br />
                Browse the 55 labeled code snippets covering 12 CWE categories.
              </div>
              <div>
                <strong style={{ color: "#e5e7eb" }}>2. Run benchmark</strong><br />
                Click <span style={{ color: "#f97316", fontWeight: 600 }}>▶ Run Benchmark</span> to scan all cases through the pipeline.
              </div>
              <div>
                <strong style={{ color: "#e5e7eb" }}>3. Analyse results</strong><br />
                Check precision / recall / F1 per CWE. High FP rate → noisy rules. Low recall → missed vulns.
              </div>
              <div>
                <strong style={{ color: "#e5e7eb" }}>4. Compare models</strong><br />
                Switch LLM in backend env, re-run, then check the Leaderboard tab for head-to-head scores.
              </div>
              <div>
                <strong style={{ color: "#e5e7eb" }}>5. Field Metrics</strong><br />
                After real scans, HIGH/CRITICAL findings are auto-confirmed by an oracle LLM. Field Metrics shows real-world precision vs. synthetic benchmarks.
              </div>
              <div>
                <strong style={{ color: "#e5e7eb" }}>6. Spot Check</strong><br />
                10% of oracle decisions are sampled for human review. Confirm or reject to calibrate oracle accuracy over time.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
