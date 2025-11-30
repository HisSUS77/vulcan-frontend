// src/pages/RepoIntegrationPage.js
import React, { useState, useEffect } from "react";
import "../App.css";
import { repositoryService } from "../api/services";

const BRANCHES = ["main", "dev", "feature"];

function RepoIntegrationPage() {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const res = await repositoryService.list();
      setRepositories(res.data || []);
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this repository?"))
      return;
    try {
      await repositoryService.delete(id);
      setRepositories((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete repository:", err);
      alert("Failed to delete repository.");
    }
  };

  const handleScanNow = (id) => {
    console.log("Scan now for repository ID:", id);
    // Navigate to /scan with repo_id or trigger scan
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) {
      alert("File must be under 200 MB.");
      return;
    }

    try {
      // For upload, we need a repo ID. For now, create a placeholder LOCAL repo first
      const createRes = await repositoryService.create({
        name: file.name,
        provider: "LOCAL",
        status: "CONNECTED",
      });
      const repoId = createRes.data.id;
      await repositoryService.upload(repoId, file);
      alert("Uploaded successfully!");
      fetchRepositories();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return <div className="ri-page">Loading...</div>;
  }

  return (
    <div className="ri-page">
      <h1 className="ri-heading">Repository Integration</h1>

      <div className="ri-shell">
        {/* Add new */}
        <div className="ri-header-actions">
          <button
            className="ri-add-btn"
            onClick={() => alert("Add repository dialog (to be implemented)")}
          >
            Add New Repository
          </button>
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
                <tr key={repo.id}>
                  <td>{repo.name}</td>
                  <td>
                    <select
                      className="ri-branch-select"
                      defaultValue={repo.default_branch || "main"}
                    >
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {repo.last_scan
                      ? new Date(repo.last_scan).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td>
                    {repo.vulnerabilities_count !== undefined ? (
                      repo.vulnerabilities_count
                    ) : (
                      <button
                        className="ri-scan-link"
                        onClick={() => handleScanNow(repo.id)}
                      >
                        Scan Now
                      </button>
                    )}
                  </td>
                  <td className="ri-actions-cell">
                    <button
                      className="ri-delete-link"
                      onClick={() => handleDelete(repo.id)}
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
