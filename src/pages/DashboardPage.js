// src/pages/DashboardPage.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardService, notificationService, scanService } from "../api/services";
import { getDashboardCache, setDashboardCache, markDashboardDirty } from "../cache/dashboardCache";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const RING_R = 36;
const RING_C = 2 * Math.PI * RING_R;

function PatchSuccessCard({ stats, loading, onScan }) {
  const pct     = stats ? Math.round(stats.success_rate * 100) : 0;
  const total   = stats?.total_patches ?? 0;
  const applied = stats?.applied ?? 0;
  const confPct = stats ? Math.round(stats.avg_confidence * 100) : 0;
  const bd      = stats?.breakdown ?? {};

  const dashOffset = RING_C - (RING_C * pct) / 100;

  const statusLabel =
    loading    ? "Loading…"
    : total === 0 ? "No patches yet"
    : pct >= 75   ? "Performing well"
    : pct >= 40   ? "Room to improve"
    : "Needs attention";
  const statusCls = loading || total === 0 ? "idle" : pct >= 75 ? "good" : "warn";

  const bw = (n) => (total > 0 ? `${Math.max(2, (n / total) * 100)}%` : "0%");

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Ring + stats */}
      <div className="flex items-center gap-[18px] pb-[14px] border-b border-[rgba(255,255,255,0.05)] mb-3">
        {/* SVG ring — stroke classes defined in index.css */}
        <div className="relative flex-shrink-0 w-[88px] h-[88px]">
          <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
            <defs>
              <linearGradient id="psrGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <circle className="v-psr-ring-bg" cx="44" cy="44" r={RING_R} />
            <circle
              className={`v-psr-ring-fill${loading ? " v-psr-loading" : ""}`}
              cx="44" cy="44" r={RING_R}
              strokeDasharray={RING_C}
              strokeDashoffset={loading ? RING_C * 0.6 : dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-extrabold text-[#22d3ee] leading-none tracking-[-0.5px]">
              {loading ? "…" : `${pct}%`}
            </span>
            <span className="text-[8px] text-[#6b7280] uppercase tracking-[0.5px] mt-0.5">success</span>
          </div>
        </div>

        {/* Title + confidence */}
        <div className="flex-1 min-w-0">
          <h3 className="m-0 mb-1 text-[13px] font-bold text-[#e2e8f0] tracking-[0.3px]">Patch Performance</h3>
          <div className="flex items-center gap-1.5 mb-2">
            <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${
              statusCls === "good" ? "bg-green-500 shadow-[0_0_6px_#22c55e]"
              : statusCls === "warn" ? "bg-amber-400 shadow-[0_0_6px_#f59e0b]"
              : "bg-[#6b7280]"
            }`} />
            <span className="text-[11px] text-[#9ca3af]">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-[7px]">
            <span className="text-[10px] text-[#6b7280] whitespace-nowrap">Avg confidence</span>
            <div className="flex-1 h-[3px] bg-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#22d3ee] rounded-sm transition-[width_1s_ease]" style={{ width: `${confPct}%` }} />
            </div>
            <span className="text-[10px] text-[#22d3ee] font-bold whitespace-nowrap">
              {loading ? "…" : `${confPct}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Three stat boxes */}
      <div className="grid grid-cols-3 gap-[7px] mb-3">
        {[
          { val: total,              color: "text-[#22d3ee]", lbl: "Generated" },
          { val: applied,            color: "text-[#22c55e]", lbl: "Applied"   },
          { val: stats?.successful ?? 0, color: "text-[#60a5fa]", lbl: "Successful" },
        ].map(({ val, color, lbl }) => (
          <div key={lbl} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-lg px-1.5 py-2 text-center">
            <div className={`text-[18px] font-extrabold leading-none ${color}${loading ? " v-psr-loading" : ""}`}>
              {loading ? "–" : val}
            </div>
            <div className="text-[9px] text-[#6b7280] uppercase tracking-[0.6px] mt-[3px]">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Stacked breakdown bar */}
      {total > 0 && (
        <>
          <div className="flex gap-1 items-center mb-3">
            <div className="h-[5px] rounded-[3px] transition-[width_1s_ease] min-w-[2px] bg-green-500"  style={{ width: bw((bd.applied ?? 0) + (bd.applied_pending ?? 0)) }} title="Applied" />
            <div className="h-[5px] rounded-[3px] transition-[width_1s_ease] min-w-[2px] bg-[#60a5fa]" style={{ width: bw(bd.approved ?? 0) }} title="Approved" />
            <div className="h-[5px] rounded-[3px] transition-[width_1s_ease] min-w-[2px] bg-[#22d3ee]" style={{ width: bw(bd.validated ?? 0) }} title="Validated" />
            <div className="h-[5px] rounded-[3px] transition-[width_1s_ease] min-w-[2px] bg-amber-400"  style={{ width: bw(bd.generated ?? 0) }} title="Generated" />
            <div className="h-[5px] rounded-[3px] transition-[width_1s_ease] min-w-[2px] bg-[rgba(255,255,255,0.08)]" style={{ width: bw((bd.failed ?? 0) + (bd.other ?? 0)) }} title="Other/Failed" />
          </div>
          <div className="flex flex-wrap gap-2 mb-2.5">
            {(bd.applied ?? 0) + (bd.applied_pending ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-[#9ca3af]">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-green-500" />
                Applied ({(bd.applied ?? 0) + (bd.applied_pending ?? 0)})
              </span>
            )}
            {(bd.approved ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-[#9ca3af]">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#60a5fa]" />
                Approved ({bd.approved})
              </span>
            )}
            {(bd.validated ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-[#9ca3af]">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#22d3ee]" />
                Validated ({bd.validated})
              </span>
            )}
            {(bd.generated ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-[#9ca3af]">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-400" />
                Pending ({bd.generated})
              </span>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        className="mt-3 self-start px-4 py-2 rounded-full border border-[rgba(148,163,184,0.6)] bg-[#020617] text-[#e5e7eb] text-xs tracking-[0.08em] uppercase cursor-pointer hover:bg-[#0f172a] transition"
        onClick={onScan}
      >
        SCAN NOW
      </button>
    </div>
  );
}

const severityOptions = {
  plugins: { legend: { display: false } },
  cutout: "65%",
};

function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [patchStats, setPatchStats] = useState(null);
  const [patchStatsLoading, setPatchStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const patchPollRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const cache = getDashboardCache();

    if (cache.summary)       { setSummary(cache.summary);             setLoading(false); }
    if (cache.recentScans)   { setRecentScans(cache.recentScans);     setLoading(false); }
    if (cache.patchStats)    { setPatchStats(cache.patchStats);       setPatchStatsLoading(false); }
    if (cache.notifications) { setNotifications(cache.notifications); }

    if (!cache.dirty && cache.summary) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const fetchAll = async () => {
      setError(null);
      if (!cache.summary) setLoading(true);
      else setRefreshing(true);

      try {
        const [summaryRes, recentRes, notifRes, patchRes] = await Promise.allSettled([
          dashboardService.getSummary(),
          dashboardService.getRecentScans(),
          notificationService.getNotifications(1, 10),
          dashboardService.getPatchStats(),
        ]);

        const updates = {};
        if (summaryRes.status === "fulfilled") { updates.summary = summaryRes.value.data; if (mounted) setSummary(updates.summary); }
        if (recentRes.status  === "fulfilled") { updates.recentScans = recentRes.value.data || []; if (mounted) setRecentScans(updates.recentScans); }
        if (notifRes.status   === "fulfilled") { const d = notifRes.value.data; updates.notifications = d?.items || d || []; if (mounted) setNotifications(updates.notifications); }
        if (patchRes.status   === "fulfilled") { updates.patchStats = patchRes.value.data; if (mounted) { setPatchStats(updates.patchStats); setPatchStatsLoading(false); } }
        else { if (mounted) setPatchStatsLoading(false); }

        setDashboardCache(updates);

        const allFailed = [summaryRes, recentRes, notifRes, patchRes].every(r => r.status === "rejected");
        if (allFailed && mounted) setError(summaryRes.reason?.userMessage || "Failed to load dashboard data.");
      } catch (err) {
        if (mounted) setError(err?.userMessage || "Failed to load dashboard data.");
      } finally {
        if (mounted) { setLoading(false); setRefreshing(false); }
      }
    };

    fetchAll();

    const onInvalidate = () => { markDashboardDirty(); fetchAll(); };
    window.addEventListener("vulcan:scan-started",    onInvalidate);
    window.addEventListener("vulcan:patch-generated", onInvalidate);

    const pollTimer = patchPollRef.current;
    return () => {
      mounted = false;
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener("vulcan:scan-started",    onInvalidate);
      window.removeEventListener("vulcan:patch-generated", onInvalidate);
    };
  }, []);

  const severityData = summary
    ? {
        labels: ["Critical", "High", "Medium", "Low"],
        datasets: [{
          data: [
            summary.severity?.CRITICAL || 0,
            summary.severity?.HIGH     || 0,
            summary.severity?.MEDIUM   || 0,
            summary.severity?.LOW      || 0,
          ],
          backgroundColor: ["#f97373", "#60a5fa", "#22c55e", "#0ea5e9"],
          borderColor: "#020617",
          borderWidth: 2,
          hoverOffset: 6,
        }],
      }
    : { labels: ["Critical","High","Medium","Low"], datasets: [{ data: [0,0,0,0], backgroundColor: ["#ccc"] }] };

  const handleScanNow = () => navigate("/scan");

  const handleLoadScan = async (scanId) => {
    try {
      const summaryRes = await scanService.getSummary(scanId);
      localStorage.setItem(`scan_${scanId}`, JSON.stringify(summaryRes.data));
      localStorage.setItem("lastScanId", scanId);
      navigate(`/graphs?scanId=${scanId}&fileId=main`);
    } catch (err) {
      console.error("Failed to load scan summary:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-[18px] px-1.5 pt-2.5 pb-[30px] min-h-[400px]">
        <div className="grid grid-cols-2 gap-[22px]">
          {[0,1].map((i) => (
            <section key={i} className="v-card v-card-wide">
              <div className="p-6">
                <div className="h-5 w-2/5 bg-[#1f2937] rounded-lg mb-4" />
                <div className="h-[180px] bg-[#0f172a] rounded-xl" />
              </div>
            </section>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_0.9fr_1fr] gap-[22px] mt-2.5">
          {[0,1,2].map((i) => (
            <section key={i} className="v-card">
              <div className="p-6">
                <div className="h-[18px] w-1/2 bg-[#1f2937] rounded-lg mb-4" />
                <div className="h-[120px] bg-[#0f172a] rounded-xl" />
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-[18px] px-1.5 pt-2.5 pb-[30px] flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="text-[2rem] mb-4">⚠️</div>
          <div className="text-[#f97373] mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-5 py-2 border-none rounded-lg cursor-pointer hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px] px-1.5 pt-2.5 pb-[30px]">
      <h1 className="ri-heading" data-text="Dashboard">Dashboard</h1>
      <p className="ri-subheading">Overview of scans, vulnerabilities, and patch performance.</p>

      {refreshing && (
        <div className="self-end text-xs text-[#94a3b8] tracking-[0.04em] uppercase mb-1">
          Syncing latest data…
        </div>
      )}

      {/* Top row */}
      <div className="v-row grid grid-cols-2 gap-[22px]">
        <section className="v-card v-card-wide">
          <header className="v-card-header"><h2>Recent Scans</h2></header>
          <div className="flex flex-col gap-2.5 max-h-[232px] overflow-y-auto pr-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(34,211,238,0.3)] [&::-webkit-scrollbar-thumb]:rounded-sm">
            {recentScans.length > 0 ? (
              recentScans.map((scan, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-[#020617] border border-[rgba(31,41,55,0.9)] cursor-pointer transition hover:bg-[rgba(30,41,59,0.35)] hover:translate-x-0.5"
                  onClick={() => handleLoadScan(scan.scan_id || scan.id)}
                  title="Click to load scan"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-[26px] h-[26px] rounded-full bg-[#0f172a] flex items-center justify-center text-xs">↗</span>
                    <div>
                      <p className="m-0 text-[13px]">
                        {scan.repository_name || scan.repo_id || scan.scan_id || "Scan"}
                      </p>
                      <p className="m-0 text-[11px] text-[#9ca3af]">
                        {scan.created_at ? new Date(scan.created_at).toLocaleDateString() : "N/A"}
                        {scan.scanned_by && <span className="ml-2 opacity-70">· {scan.scanned_by}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-[#0f172a]">
                    {scan.vulnerabilities_found ?? scan.vulnerabilities_count ?? scan.count ?? 0}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-[#999]">
                <p className="m-0 mb-2">No recent scans</p>
                <button
                  type="button"
                  className="mt-3 self-start px-4 py-2 rounded-full border border-[rgba(148,163,184,0.6)] bg-[#020617] text-[#e5e7eb] text-xs tracking-[0.08em] uppercase cursor-pointer hover:bg-[#0f172a] transition"
                  onClick={handleScanNow}
                >
                  Run your first scan
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="v-card v-card-wide">
          <header className="v-card-header"><h2>Vulnerabilities by Severity</h2></header>
          <div className="flex items-center justify-center gap-2.5">
            <Doughnut data={severityData} options={severityOptions} />
            <div className="flex flex-col gap-1 text-xs">
              {[
                { label: "Critical", color: "#f97373" },
                { label: "High",     color: "#60a5fa" },
                { label: "Medium",   color: "#22c55e" },
                { label: "Low",      color: "#0ea5e9" },
              ].map(({ label, color }) => (
                <div key={label}>
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom row */}
      <div className="v-row-bottom grid grid-cols-[1fr_0.9fr_1fr] gap-[22px] mt-2.5">
        <section className="v-card">
          <header className="v-card-header"><h2>AI Patch Success Rate</h2></header>
          <PatchSuccessCard stats={patchStats} loading={patchStatsLoading} onScan={handleScanNow} />
        </section>

        <section className="v-card v-card-glow">
          <div className="v-card-glow-inner">
            <button
              type="button"
              className="px-10 py-4 rounded-full border-none bg-white text-[#006aff] font-semibold tracking-[0.08em] uppercase text-[17px] cursor-pointer transition shadow-[0_10px_24px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(59,130,246,0.45)]"
              onClick={handleScanNow}
            >
              SCAN NOW
            </button>
          </div>
        </section>

        <section className="v-card">
          <header className="v-card-header"><h2>Notifications</h2></header>
          <ul className="v-notifications">
            {notifications.length > 0 ? (
              notifications.slice(0, 3).map((n, i) => (
                <li key={i}>
                  {n.message || n.title || n}
                  {n.created_at && (
                    <span className="text-[#6b7280] ml-2 text-[0.85rem]">
                      {new Date(n.created_at).toLocaleTimeString()}
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className="text-[#999]">No notifications</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
