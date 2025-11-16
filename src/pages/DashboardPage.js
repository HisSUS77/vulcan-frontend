// src/pages/DashboardPage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const recentScans = [
  { repo: "frontend-app", date: "Apr 10, 2024", count: 1377 },
  { repo: "backend-service", date: "Apr 14, 2024", count: 1229 },
  { repo: "utility-lib", date: "Apr 10, 2024", count: 631 },
];

const notifications = [
  "Scan completed for ecommerce-platform",
  "New patch available for string-utils",
  "Scheduled maintenance on April 20, 2024",
];

const severityData = {
  labels: ["Critical", "High", "Medium", "Low"],
  datasets: [
    {
      data: [21, 42, 18, 9],
      backgroundColor: ["#f97373", "#60a5fa", "#22c55e", "#0ea5e9"],
      borderColor: "#020617",
      borderWidth: 2,
      hoverOffset: 6,
    },
  ],
};

const severityOptions = {
  plugins: {
    legend: { display: false },
  },
  cutout: "65%",
};

function DashboardPage() {
  const navigate = useNavigate();

  const handleScanNow = () => {
    navigate("/scan");
  };

  return (
    <div className="v-dashboard">
      {/* Top row: Recent Scans + Severity */}
      <div className="v-row">
        <section className="v-card v-card-wide">
          <header className="v-card-header">
            <h2>Recent Scans</h2>
          </header>
          <div className="v-recent-list">
            {recentScans.map((scan) => (
              <div key={scan.repo} className="v-recent-item">
                <div className="v-recent-left">
                  <span className="v-recent-icon">↗</span>
                  <div>
                    <p className="v-recent-title">{scan.repo}</p>
                    <p className="v-recent-sub">{scan.date}</p>
                  </div>
                </div>
                <div className="v-recent-count">{scan.count}</div>
              </div>
            ))}
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
            <span className="v-patch-rate-main">85%</span>
            <span className="v-patch-rate-sub">213 Patches Applied</span>
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
            {notifications.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
