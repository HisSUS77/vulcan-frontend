// src/pages/ReportsPage.js
import React, { useState } from "react";
import "../App.css";

const REPORTS = [
  {
    id: "r1",
    label: "vulcan/semantic-engine - Apr 22, 2024 - v1.9.0",
  },
  {
    id: "r2",
    label: "vulcan/semantic-engine - Apr 15, 2024 - v1.8.3",
  },
  {
    id: "r3",
    label: "vulcan/frontend-app - Apr 10, 2024 - v2.4.1",
  },
];

const VULNS = [
  {
    id: "R517",
    severity: "Critical",
    cwe: "/aset4/nin_ceveic.iuv",
    file: "vza/assets",
    patchStatus: "Patched",
  },
  {
    id: "R539",
    severity: "High",
    cwe: "/example.connexg.py",
    file: "css:cpp",
    patchStatus: "Pending",
  },
  {
    id: "C263",
    severity: "Medium",
    cwe: "/example.scan.iuv",
    file: "csscassst",
    patchStatus: "Ignored",
  },
  {
    id: "C373",
    severity: "Medium",
    cwe: "/example.semaric.iuv",
    file: "file.css",
    patchStatus: "Ignored",
  },
  {
    id: "C365",
    severity: "Critical",
    cwe: "/example.snitoti.iuv",
    file: "ccc.b.cpp",
    patchStatus: "Pending",
  },
  {
    id: "C726",
    severity: "Critical",
    cwe: "/example.tost.iuv",
    file: "header:tail",
    patchStatus: "Ignored",
  },
  {
    id: "C323",
    severity: "Medium",
    cwe: "/example.vulcamg.iuv",
    file: "lavbkt:cat",
    patchStatus: "Patched",
  },
  {
    id: "C550",
    severity: "Medium",
    cwe: "/example.pain.iuv",
    file: "index.css",
    patchStatus: "Ignored",
  },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState(REPORTS[0].id);
  const [filterBy, setFilterBy] = useState("Severity");

  return (
    <div className="rv-page">
      {/* Top row: report dropdown + share/export */}
      <div className="rv-top-row">
        <div className="rv-report-select-wrap">
          <select
            className="rv-report-select"
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
          >
            {REPORTS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rv-top-actions">
          <button className="rv-top-btn">Share</button>
          <button className="rv-top-btn primary">Export</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="rv-summary-row">
        <div className="rv-summary-card">
          <div className="rv-summary-label">Total vulnerabilities</div>
          <div className="rv-summary-value">34</div>
        </div>
        <div className="rv-summary-card">
          <div className="rv-summary-label">Critical</div>
          <div className="rv-summary-value rv-critical">4</div>
        </div>
        <div className="rv-summary-card">
          <div className="rv-summary-label">Fixed</div>
          <div className="rv-summary-value rv-fixed">20</div>
        </div>
        <div className="rv-summary-card">
          <div className="rv-summary-label">AI accuracy</div>
          <div className="rv-summary-value rv-accuracy">92%</div>
        </div>
      </div>

      {/* Main content row */}
      <div className="rv-main">
        {/* Table side */}
        <div className="rv-table-card">
          <div className="rv-table-header">
            <div className="rv-table-title-row">
              <span className="rv-table-title">Vulnerabilities</span>
            </div>
            <div className="rv-filter-wrap">
              <span className="rv-filter-label">Filter by</span>
              <select
                className="rv-filter-select"
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
              >
                <option value="Severity">Severity</option>
                <option value="Status">Status</option>
                <option value="CWE">CWE</option>
              </select>
            </div>
          </div>

          <div className="rv-table-scroll">
            <table className="rv-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Severity</th>
                  <th>CWE</th>
                  <th>File / path</th>
                  <th>Patch / status</th>
                </tr>
              </thead>
              <tbody>
                {VULNS.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>
                      <span
                        className={
                          "rv-tag rv-tag-sev " +
                          row.severity.toLowerCase()
                        }
                      >
                        {row.severity}
                      </span>
                    </td>
                    <td className="rv-mono">{row.cwe}</td>
                    <td className="rv-mono">{row.file}</td>
                    <td>
                      <span
                        className={
                          "rv-tag rv-tag-status " +
                          row.patchStatus.toLowerCase()
                        }
                      >
                        {row.patchStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right-side panels */}
        <div className="rv-side">
          <div className="rv-side-card">
            <div className="rv-side-title">AI insights</div>
            <p className="rv-side-text">
              Multiple high-risk vulnerabilities were found and should be
              patched immediately. AI-generated patches for common patterns
              showed <b>92% accuracy</b> across recent scans.
            </p>
          </div>

          <div className="rv-side-card">
            <div className="rv-side-title">Compliant with</div>
            <div className="rv-compliance-pill">
              <span className="rv-compliance-dot" />
              OWASP Top 10 / CWE / SANS 25
            </div>
          </div>

          <button className="rv-compare-btn">
            Generate comparison
          </button>
        </div>
      </div>
    </div>
  );
}
