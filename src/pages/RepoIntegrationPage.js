// src/pages/RepoIntegrationPage.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { repositoryService } from "../api/services";

const PROVIDERS = ["GITHUB", "GITLAB", "BITBUCKET", "LOCAL"];

function RepoIntegrationPage() {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [repoBranches, setRepoBranches] = useState({}); // { repoId: [branches] }
  const [newRepo, setNewRepo] = useState({
    name: "",
    provider: "GITHUB",
    url: "",
    token: "",
  });
  const [addingRepo, setAddingRepo] = useState(false);

  // 📥 FUNCTION: Fetch repositories from API
  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await repositoryService.list();
      const repos = res.data || [];
      setRepositories(repos);
      // Fetch branches for each repository
      repos.forEach((repo) => fetchBranches(repo.id));
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
      const msg = err.response?.data?.detail || "Failed to load repositories.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🌿 FUNCTION: Fetch branches for a repository
  const fetchBranches = useCallback(async (repoId) => {
    try {
      const res = await repositoryService.getBranches(repoId);
      const branches = res.data || ["main"];
      setRepoBranches((prev) => ({ ...prev, [repoId]: branches }));
    } catch (err) {
      console.error(`Failed to fetch branches for repo ${repoId}:`, err);
      // Default to common branches if API fails
      setRepoBranches((prev) => ({ ...prev, [repoId]: ["main", "dev", "master"] }));
    }
  }, []);

  // 📥 FUNCTION: Fetch repositories on page load
  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  // ➕ FUNCTION: Add new repository
  const handleAddRepository = async (e) => {
    e.preventDefault();
    if (!newRepo.name.trim()) {
      alert("Repository name is required.");
      return;
    }
    setAddingRepo(true);
    try {
      const payload = {
        name: newRepo.name.trim(),
        provider: newRepo.provider,
        url: newRepo.url.trim() || undefined,
        token: newRepo.token.trim() || undefined,
        status: "CONNECTED",
      };
      await repositoryService.create(payload);
      setShowAddModal(false);
      setNewRepo({ name: "", provider: "GITHUB", url: "", token: "" });
      fetchRepositories();
    } catch (err) {
      console.error("Failed to add repository:", err);
      const msg = err.response?.data?.detail || "Failed to add repository.";
      alert(msg);
    } finally {
      setAddingRepo(false);
    }
  };

  // ❌ FUNCTION: Delete repository by ID
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this repository?"))
      return;
    try {
      await repositoryService.delete(id);
      setRepositories((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete repository:", err);
      const msg = err.response?.data?.detail || "Failed to delete repository.";
      alert(msg);
    }
  };

  // 🔎 FUNCTION: Trigger a scan for repo
  const handleScanNow = (id) => {
    navigate(`/scan?repoId=${id}`);
  };
  // 📤 FUNCTION: Upload a local ZIP/TAR source code
  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) {
      alert("File must be under 200 MB.");
      return;
    }

    try {
      // For upload, we need a repo ID. Create a placeholder LOCAL repo first
      const createRes = await repositoryService.create({
        name: file.name.replace(/\.(zip|tar|gz|tar\.gz)$/i, ""),
        provider: "LOCAL",
        status: "CONNECTED",
      });
      const repoId = createRes.data.id;
      // Step 2: Upload the file contents to backend
      await repositoryService.upload(repoId, file);
      alert("Uploaded successfully!");
      fetchRepositories();
    } catch (err) {
      console.error("Upload failed:", err);
      const msg = err.response?.data?.detail || err.message || "Upload failed";
      alert("Upload failed: " + msg);
    }
    // Reset file input
    event.target.value = "";
  };

  if (loading) {
    return <div className="ri-page">Loading repositories...</div>;
  }

  if (error) {
    return (
      <div className="ri-page">
        <div style={{ color: "#f97373", marginBottom: "1rem" }}>{error}</div>
        <button className="ri-add-btn" onClick={fetchRepositories}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="ri-page">
      <h1 className="ri-heading">Repository Integration</h1>

      <div className="ri-shell">
        {/* Add new */}
        <div className="ri-header-actions">
          <button
            className="ri-add-btn"
            onClick={() => setShowAddModal(true)}
          >
            Add New Repository
          </button>
        </div>

        {/* Add Repository Modal */}
        {showAddModal && (
          <div className="ri-modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="ri-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="ri-modal-title">Add Repository</h2>
              <form onSubmit={handleAddRepository}>
                <div className="ri-form-group">
                  <label>Repository Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., my-project"
                    value={newRepo.name}
                    onChange={(e) =>
                      setNewRepo((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="ri-form-group">
                  <label>Provider</label>
                  <select
                    value={newRepo.provider}
                    onChange={(e) =>
                      setNewRepo((prev) => ({ ...prev, provider: e.target.value }))
                    }
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ri-form-group">
                  <label>Repository URL</label>
                  <input
                    type="text"
                    placeholder="https://github.com/user/repo"
                    value={newRepo.url}
                    onChange={(e) =>
                      setNewRepo((prev) => ({ ...prev, url: e.target.value }))
                    }
                  />
                </div>
                <div className="ri-form-group">
                  <label>Access Token (optional)</label>
                  <input
                    type="password"
                    placeholder="Personal access token"
                    value={newRepo.token}
                    onChange={(e) =>
                      setNewRepo((prev) => ({ ...prev, token: e.target.value }))
                    }
                  />
                </div>
                <div className="ri-modal-actions">
                  <button
                    type="button"
                    className="ri-modal-cancel"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ri-add-btn"
                    disabled={addingRepo}
                  >
                    {addingRepo ? "Adding..." : "Add Repository"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                <th>Provider</th>
                <th>Branch</th>
                <th>Last Scan</th>
                <th>Vulnerabilities</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {repositories.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>
                    No repositories found. Add one above or upload source code.
                  </td>
                </tr>
              ) : (
                repositories.map((repo) => {
                  const branches = repoBranches[repo.id] || ["main"];
                  return (
                    <tr key={repo.id}>
                      <td>{repo.name}</td>
                      <td>
                        <span className={`ri-provider-badge ri-provider-${(repo.provider || "").toLowerCase()}`}>
                          {repo.provider || "N/A"}
                        </span>
                      </td>
                      <td>
                        <select
                          className="ri-branch-select"
                          defaultValue={repo.default_branch || branches[0] || "main"}
                        >
                          {branches.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {repo.last_scan
                          ? new Date(repo.last_scan).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td>
                        {repo.vulnerabilities_count !== undefined ? (
                          <span className={repo.vulnerabilities_count > 0 ? "ri-vuln-count" : ""}>
                            {repo.vulnerabilities_count}
                          </span>
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
                          className="ri-scan-link"
                          onClick={() => handleScanNow(repo.id)}
                          style={{ marginRight: "0.5rem" }}
                        >
                          Scan
                        </button>
                        <button
                          className="ri-delete-link"
                          onClick={() => handleDelete(repo.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
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
