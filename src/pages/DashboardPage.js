// src/pages/DashboardPage.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { dashboardService, notificationService, scanService } from "../api/services";
import { getDashboardCache, setDashboardCache, markDashboardDirty } from "../cache/dashboardCache";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

// ── Ring circumference for r=36 ─────────────────────────────────────────────
const RING_R = 36;
const RING_C = 2 * Math.PI * RING_R; // ≈ 226.2

function PatchSuccessCard({ stats, loading, onScan }) {
  const pct      = stats ? Math.round(stats.success_rate * 100) : 0;
  const total    = stats?.total_patches ?? 0;
  const applied  = stats?.applied ?? 0;
  const confPct  = stats ? Math.round(stats.avg_confidence * 100) : 0;
  const bd       = stats?.breakdown ?? {};

  // Derive ring fill offset: full circle when 100 %, empty when 0 %
  const dashOffset = RING_C - (RING_C * pct) / 100;

  // Status label
  const statusLabel = loading
    ? "Loading…"
    : total === 0
    ? "No patches yet"
    : pct >= 75
    ? "Performing well"
    : pct >= 40
    ? "Room to improve"
    : "Needs attention";
  const statusClass = loading || total === 0 ? "idle" : pct >= 75 ? "good" : "warn";

  // Stacked bar widths (% of total)
  const bw = (n) => (total > 0 ? `${Math.max(2, (n / total) * 100)}%` : "0%");

  return (
    <div className="v-psr-card">
      <div className="v-psr-top">
        {/* Animated SVG ring */}
        <div className="v-psr-ring-wrap">
          <svg width="88" height="88" viewBox="0 0 88 88">
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
          <div className="v-psr-ring-label">
            <span className="v-psr-ring-pct">{loading ? "…" : `${pct}%`}</span>
            <span className="v-psr-ring-hint">success</span>
          </div>
        </div>

        {/* Right side */}
        <div className="v-psr-title-col">
          <h3>Patch Performance</h3>
          <div className="v-psr-status-row">
            <span className={`v-psr-status-dot ${statusClass}`} />
            <span className="v-psr-status-text">{statusLabel}</span>
          </div>
          <div className="v-psr-conf-row">
            <span className="v-psr-conf-label">Avg confidence</span>
            <div className="v-psr-conf-track">
              <div className="v-psr-conf-fill" style={{ width: `${confPct}%` }} />
            </div>
            <span className="v-psr-conf-val">{loading ? "…" : `${confPct}%`}</span>
          </div>
        </div>
      </div>

      {/* Three stat boxes */}
      <div className="v-psr-stats">
        <div className="v-psr-stat">
          <div className={`v-psr-stat-val cyan${loading ? " v-psr-loading" : ""}`}>
            {loading ? "–" : total}
          </div>
          <div className="v-psr-stat-lbl">Generated</div>
        </div>
        <div className="v-psr-stat">
          <div className={`v-psr-stat-val green${loading ? " v-psr-loading" : ""}`}>
            {loading ? "–" : applied}
          </div>
          <div className="v-psr-stat-lbl">Applied</div>
        </div>
        <div className="v-psr-stat">
          <div className={`v-psr-stat-val blue${loading ? " v-psr-loading" : ""}`}>
            {loading ? "–" : stats?.successful ?? 0}
          </div>
          <div className="v-psr-stat-lbl">Successful</div>
        </div>
      </div>

      {/* Stacked status bar */}
      {total > 0 && (
        <>
          <div className="v-psr-breakdown">
            <div className="v-psr-bar-seg applied"   style={{ width: bw((bd.applied ?? 0) + (bd.applied_pending ?? 0)) }} title="Applied" />
            <div className="v-psr-bar-seg approved"  style={{ width: bw(bd.approved ?? 0) }} title="Approved" />
            <div className="v-psr-bar-seg validated" style={{ width: bw(bd.validated ?? 0) }} title="Validated" />
            <div className="v-psr-bar-seg pending"   style={{ width: bw(bd.generated ?? 0) }} title="Generated" />
            <div className="v-psr-bar-seg rest"      style={{ width: bw((bd.failed ?? 0) + (bd.other ?? 0)) }} title="Other/Failed" />
          </div>
          <div className="v-psr-bar-legend">
            {(bd.applied ?? 0) + (bd.applied_pending ?? 0) > 0 && (
              <span className="v-psr-legend-item">
                <span className="v-psr-legend-dot" style={{ background: "#22c55e" }} />
                Applied ({(bd.applied ?? 0) + (bd.applied_pending ?? 0)})
              </span>
            )}
            {(bd.approved ?? 0) > 0 && (
              <span className="v-psr-legend-item">
                <span className="v-psr-legend-dot" style={{ background: "#60a5fa" }} />
                Approved ({bd.approved})
              </span>
            )}
            {(bd.validated ?? 0) > 0 && (
              <span className="v-psr-legend-item">
                <span className="v-psr-legend-dot" style={{ background: "#22d3ee" }} />
                Validated ({bd.validated})
              </span>
            )}
            {(bd.generated ?? 0) > 0 && (
              <span className="v-psr-legend-item">
                <span className="v-psr-legend-dot" style={{ background: "#f59e0b" }} />
                Pending ({bd.generated})
              </span>
            )}
          </div>
        </>
      )}

      <button type="button" className="v-secondary-btn" onClick={onScan}>
        SCAN NOW
      </button>
    </div>
  );
}

const severityOptions = {
  plugins: {
    legend: { display: false },
  },
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

    // ── Paint from cache instantly (no loading spinner on return visits) ──────
    if (cache.summary)       { setSummary(cache.summary);             setLoading(false); }
    if (cache.recentScans)   { setRecentScans(cache.recentScans);     setLoading(false); }
    if (cache.patchStats)    { setPatchStats(cache.patchStats);       setPatchStatsLoading(false); }
    if (cache.notifications) { setNotifications(cache.notifications);                    }

    // Skip network fetch entirely if cache is fresh (scan/patch didn't happen)
    if (!cache.dirty && cache.summary) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // ── Background refresh (cache was dirty or empty) ─────────────────────────
    const fetchAll = async () => {
      setError(null);
      if (!cache.summary) setLoading(true);   // first visit → show spinner
      else setRefreshing(true);               // return visit → silent refresh

      try {
        const [summaryRes, recentRes, notifRes, patchRes] = await Promise.allSettled([
          dashboardService.getSummary(),
          dashboardService.getRecentScans(),
          notificationService.getNotifications(1, 10),
          dashboardService.getPatchStats(),
        ]);

        const updates = {};

        if (summaryRes.status === "fulfilled") {
          updates.summary = summaryRes.value.data;
          if (mounted) setSummary(updates.summary);
        }
        if (recentRes.status === "fulfilled") {
          updates.recentScans = recentRes.value.data || [];
          if (mounted) setRecentScans(updates.recentScans);
        }
        if (notifRes.status === "fulfilled") {
          const d = notifRes.value.data;
          updates.notifications = d?.items || d || [];
          if (mounted) setNotifications(updates.notifications);
        }
        if (patchRes.status === "fulfilled") {
          updates.patchStats = patchRes.value.data;
          if (mounted) { setPatchStats(updates.patchStats); setPatchStatsLoading(false); }
        } else {
          if (mounted) setPatchStatsLoading(false);
        }

        // Persist fresh data to cache
        setDashboardCache(updates);

        const allFailed = [summaryRes, recentRes, notifRes, patchRes].every(r => r.status === "rejected");
        if (allFailed && mounted) {
          setError(summaryRes.reason?.userMessage || "Failed to load dashboard data.");
        }
      } catch (err) {
        if (mounted) setError(err?.userMessage || "Failed to load dashboard data.");
      } finally {
        if (mounted) { setLoading(false); setRefreshing(false); }
      }
    };

    fetchAll();

    // Listen for invalidation events fired mid-session (e.g. scan completes
    // while user is on a different page then navigates back to dashboard)
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
        datasets: [
          {
            data: [
              summary.severity?.CRITICAL || 0,
              summary.severity?.HIGH || 0,
              summary.severity?.MEDIUM || 0,
              summary.severity?.LOW || 0,
            ],
            backgroundColor: ["#f97373", "#60a5fa", "#22c55e", "#0ea5e9"],
            borderColor: "#020617",
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      }
    : {
        labels: ["Critical", "High", "Medium", "Low"],
        datasets: [{ data: [0, 0, 0, 0], backgroundColor: ["#ccc"] }],
      };

  const handleScanNow = () => {
    navigate("/scan");
  };

  const handleLoadScan = async (scanId) => {
    try {
      const summaryRes = await scanService.getSummary(scanId);
      const summary = summaryRes.data;
      localStorage.setItem(`scan_${scanId}`, JSON.stringify(summary));
      localStorage.setItem("lastScanId", scanId);
      navigate(`/graphs?scanId=${scanId}&fileId=main`);
    } catch (err) {
      console.error("Failed to load scan summary:", err);
    }
  };

  if (loading) {
    return (
      <div className="v-dashboard" style={{ minHeight: '400px' }}>
        <div className="v-row">
          {[0, 1].map((idx) => (
            <section key={idx} className="v-card v-card-wide">
              <div style={{ padding: "1.5rem" }}>
                <div style={{ height: "20px", width: "40%", background: "#1f2937", borderRadius: "8px", marginBottom: "1rem" }} />
                <div style={{ height: "180px", background: "#0f172a", borderRadius: "12px" }} />
              </div>
            </section>
          ))}
        </div>
        <div className="v-row v-row-bottom">
          {[0, 1, 2].map((idx) => (
            <section key={idx} className="v-card">
              <div style={{ padding: "1.5rem" }}>
                <div style={{ height: "18px", width: "50%", background: "#1f2937", borderRadius: "8px", marginBottom: "1rem" }} />
                <div style={{ height: "120px", background: "#0f172a", borderRadius: "12px" }} />
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="v-dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ color: '#f97373', marginBottom: '1rem' }}>{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              background: '#2563eb', 
              color: '#fff', 
              padding: '8px 20px', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer' 
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="v-dashboard">
      <h1 className="ri-heading" data-text="Dashboard">Dashboard</h1>
      <p className="ri-subheading">
        Overview of scans, vulnerabilities, and patch performance.
      </p>
      {refreshing && <div className="v-refreshing">Syncing latest data…</div>}
      {/* Top row: Recent Scans + Severity */}
      <div className="v-row">
        <section className="v-card v-card-wide">
          <header className="v-card-header">
            <h2>Recent Scans</h2>
          </header>
          <div className="v-recent-list">
            {recentScans.length > 0 ? (
              recentScans.map((scan, idx) => (
                <div
                  key={idx}
                  className="v-recent-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleLoadScan(scan.scan_id || scan.id)}
                  title="Click to load scan"
                >
                  <div className="v-recent-left">
                    <span className="v-recent-icon">↗</span>
                    <div>
                      <p className="v-recent-title">
                        {scan.repository_name || scan.repo_id || scan.scan_id || "Scan"}
                      </p>
                      <p className="v-recent-sub">
                        {scan.created_at
                          ? new Date(scan.created_at).toLocaleDateString()
                          : "N/A"}
                        {scan.scanned_by && (
                          <span style={{ marginLeft: 8, opacity: 0.7 }}>· {scan.scanned_by}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="v-recent-count">
                    {scan.vulnerabilities_found ?? scan.vulnerabilities_count ?? scan.count ?? 0}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "1rem", color: "#999" }}>
                <p style={{ margin: 0, marginBottom: "0.5rem" }}>No recent scans</p>
                <button type="button" className="v-secondary-btn" onClick={handleScanNow}>
                  Run your first scan
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="v-card v-card-wide">
          <header className="v-card-header">
            <h2>Vulnerabilities by Severity</h2>
          </header>
          <div className="v-chart-wrap">
            <Doughnut data={severityData} options={severityOptions} />
            <div className="v-chart-legend">
              <div>
                <span className="v-legend-dot critical"></span> Critical
              </div>
              <div>
                <span className="v-legend-dot high"></span> High
              </div>
              <div>
                <span className="v-legend-dot medium"></span> Medium
              </div>
              <div>
                <span className="v-legend-dot low"></span> Low
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Second row: Patch rate + Scan Now + Notifications */}
      <div className="v-row v-row-bottom">
        <section className="v-card">
          <header className="v-card-header">
            <h2>AI Patch Success Rate</h2>
          </header>
          <PatchSuccessCard stats={patchStats} loading={patchStatsLoading} onScan={handleScanNow} />
        </section>

        <section className="v-card v-card-glow">
          <div className="v-card-glow-inner">
            <button
              type="button"
              className="v-primary-big-btn"
              onClick={handleScanNow}
            >
              SCAN NOW
            </button>
          </div>
        </section>

        <section className="v-card">
          <header className="v-card-header">
            <h2>Notifications</h2>
          </header>
          <ul className="v-notifications">
            {notifications.length > 0 ? (
              notifications.slice(0, 3).map((n, i) => (
                <li key={i}>
                  {n.message || n.title || n}
                  {n.created_at && (
                    <span style={{ color: "#6b7280", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                      {new Date(n.created_at).toLocaleTimeString()}
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li style={{ color: "#999" }}>No notifications</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
