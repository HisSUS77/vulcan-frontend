// src/pages/DashboardPage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { dashboardService, notificationService, scanService } from "../api/services";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setError(null);
      setRefreshing(true);
      try {
        const cachedSummary = localStorage.getItem("dashboard_summary_cache");
        const cachedRecent = localStorage.getItem("dashboard_recent_cache");
        if (mounted) {
          if (cachedSummary) {
            try { setSummary(JSON.parse(cachedSummary)); } catch {}
          }
          if (cachedRecent) {
            try { setRecentScans(JSON.parse(cachedRecent)); } catch {}
          }
          if (cachedSummary || cachedRecent) {
            setLoading(false);
          }
        }

        const lastScanId = localStorage.getItem("lastScanId");
        if (lastScanId) {
          const cached = localStorage.getItem(`scan_${lastScanId}`);
          if (cached) {
            try {
              if (mounted) {
                setRecentScans([JSON.parse(cached)]);
              }
            } catch {
              // ignore cache parsing failures
            }
          }
        }
        // Fetch all data in parallel, but handle individual failures gracefully
        const results = await Promise.allSettled([
          dashboardService.getSummary(),
          dashboardService.getRecentScans(),
          notificationService.getNotifications(1, 10),
        ]);
        
        // Handle summary
        if (mounted && results[0].status === "fulfilled") {
          setSummary(results[0].value.data);
          localStorage.setItem("dashboard_summary_cache", JSON.stringify(results[0].value.data));
        }
        
        // Handle recent scans
        if (mounted && results[1].status === "fulfilled") {
          setRecentScans(results[1].value.data || []);
          localStorage.setItem("dashboard_recent_cache", JSON.stringify(results[1].value.data || []));
        } else {
          // Try localStorage fallback for scans
          const lastScanId = localStorage.getItem("lastScanId");
          if (lastScanId) {
            const cached = localStorage.getItem(`scan_${lastScanId}`);
            if (cached) {
              if (mounted) {
                setRecentScans([JSON.parse(cached)]);
              }
            }
          }
        }
        
        // Handle notifications
        if (mounted && results[2].status === "fulfilled") {
          const notifData = results[2].value.data;
          setNotifications(notifData?.items || notifData || []);
        }
        
        // Check if all failed
        const allFailed = results.every(r => r.status === "rejected");
        if (allFailed) {
          const err = results[0].reason;
          if (mounted) {
            setError(err?.userMessage || "Failed to load dashboard data. Please check if the backend is running.");
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        if (mounted) {
          setError(err?.userMessage || "Failed to load dashboard data.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    fetchData();
    return () => {
      mounted = false;
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
      <h1 className="ri-heading">Dashboard</h1>
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
              recentScans.slice(0, 3).map((scan, idx) => (
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
          <div className="v-patch-rate">
            <span className="v-patch-rate-main">
              {summary?.ai?.patch_success_rate !== undefined
                ? `${Math.round(summary.ai.patch_success_rate * 100)}%`
                : "N/A"}
            </span>
            <span className="v-patch-rate-sub">
              {summary?.ai?.patch_success_rate !== undefined
                ? `${summary?.totals?.patches_applied || 0} Patches Applied`
                : "Patch analytics pending"}
            </span>
            <button
              type="button"
              className="v-secondary-btn"
              onClick={handleScanNow}
            >
              SCAN NOW
            </button>
          </div>
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
