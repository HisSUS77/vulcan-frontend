// src/pages/DashboardPage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { dashboardService, notificationService } from "../api/services";

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, scansRes, notifRes] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getRecentScans(),
          notificationService.getNotifications(1, 10),
        ]);
        setSummary(summaryRes.data);
        setRecentScans(scansRes.data || []);
        setNotifications(notifRes.data?.items || notifRes.data || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  if (loading) {
    return <div className="v-dashboard">Loading...</div>;
  }

  return (
    <div className="v-dashboard">
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
                  onClick={() => navigate(`/graphs?scanId=${scan.scan_id || scan.id}&fileId=file-1`)}
                  title="Click to view graphs"
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
                    {scan.vulnerabilities_count || scan.vulnerabilities_found || scan.count || 0}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ padding: "1rem", color: "#999" }}>No recent scans</p>
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
              {summary?.ai?.patch_success_rate
                ? Math.round(summary.ai.patch_success_rate * 100)
                : 0}
              %
            </span>
            <span className="v-patch-rate-sub">
              {summary?.totals?.patches_applied || 0} Patches Applied
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
                <li key={i}>{n.message || n.title || n}</li>
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
