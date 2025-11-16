// src/pages/RepoIntegrationPage.js
import React, { useState } from "react";
import "../App.css";

const INITIAL_REPOS = [
  {
    name: "Repo 1",
    branch: "main",
    lastScan: "2024-04-03",
    vulns: 5,
  },
  {
    name: "Repo 2",
    branch: "dev",
    lastScan: "2024-03-28",
    vulns: 12,
  },
  {
    name: "Repo 3",
    branch: "feature",
    lastScan: "2024-03-20",
    vulns: "Scan Now",
  },
];

const BRANCHES = ["main", "dev", "feature"];

function RepoIntegrationPage() {
  const [repositories, setRepositories] = useState(INITIAL_REPOS);

  const handleDelete = (name) => {
    setRepositories((prev) => prev.filter((r) => r.name !== name));
  };

  const handleScanNow = (name) => {
    console.log("Scan now for:", name);
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) {
      alert("File must be under 200 MB.");
      return;
    }

    console.log("Uploaded local source:", file.name);
  };

  return (
    <div className="ri-page">
      <h1 className="ri-heading">Repository Integration</h1>

      <div className="ri-shell">
        {/* Add new */}
        <div className="ri-header-actions">
          <button className="ri-add-btn">Add New Repository</button>
        </div>

        {/* PROVIDER LIST – pixel perfect */}
        <div className="ri-provider-stack">
          <ProviderRow
            provider="GitHub"
            icon="/github.svg"
            leftStatus="Connected"
            rightStatus="Connected"
          />
          <ProviderRow
            provider="GitLab"
            icon="/gitlab.svg"
            leftStatus="Connected"
            rightStatus="Connected"
          />
          <ProviderRow
            provider="Bitbucket"
            icon="/bitbucket.svg"
            leftStatus="Connected"
            rightStatus="Connected"
          />
        </div>

        {/* Upload card */}
        <div className="ri-upload-card">
          <label htmlFor="file-upload" className="ri-upload-inner">
            <div className="ri-upload-icon-circle">
              <span className="ri-upload-icon">⬇</span>
            </div>
            <div className="ri-upload-text-block">
              <div className="ri-upload-title">Upload Local Source Code</div>
              <div className="ri-upload-sub">
                ZIP or TAR.GZ, max size 200 MB
              </div>
            </div>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".zip,.tar,.gz,.tar.gz"
            onChange={handleUpload}
            style={{ display: "none" }}
          />
        </div>

        {/* Table */}
        <div className="ri-table-wrapper">
          <table className="ri-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Branch</th>
                <th>Last Scan</th>
                <th>Vulnerabilities</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {repositories.map((repo) => (
                <tr key={repo.name}>
                  <td>{repo.name}</td>
                  <td>
                    <select
                      className="ri-branch-select"
                      defaultValue={repo.branch}
                    >
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{repo.lastScan}</td>
                  <td>
                    {repo.vulns === "Scan Now" ? (
                      <button
                        className="ri-scan-link"
                        onClick={() => handleScanNow(repo.name)}
                      >
                        Scan Now
                      </button>
                    ) : (
                      repo.vulns
                    )}
                  </td>
                  <td className="ri-actions-cell">
                    <button
                      className="ri-delete-link"
                      onClick={() => handleDelete(repo.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProviderRow({ provider, icon, leftStatus, rightStatus }) {
  return (
    <div className="ri-provider-row">
      {/* Left block: icon + name */}
      <div className="ri-provider-main">
        <div className="ri-provider-logo-circle">
          <img src={icon} alt={provider} className="ri-provider-logo" />
        </div>
        <span className="ri-provider-name">{provider}</span>
      </div>

      {/* Middle & right status, just like mockup */}
      <div className="ri-provider-pill">{leftStatus}</div>
      <div className="ri-provider-pill ri-provider-pill-secondary">
        {rightStatus}
      </div>
    </div>
  );
}

export default RepoIntegrationPage;
