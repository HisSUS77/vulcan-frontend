// src/pages/AccountPage.js
import React, { useEffect, useState } from "react";
import "../App.css";
import { authService } from "../api/services";
import { getCurrentUser, setCurrentUser } from "../api/client";

function AccountPage() {
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authService.me();
      setUser(res.data);
      setCurrentUser(res.data);
    } catch (err) {
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = user?.role || "normal";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="acct-page">
      <div className="acct-card">
        <div className="acct-header">
          <div>
            <h2 className="acct-title">Account</h2>
            <p className="acct-subtitle">Profile and access details</p>
          </div>
          <button type="button" className="acct-refresh-btn" onClick={fetchProfile}>
            Refresh
          </button>
        </div>

        {loading && <div className="acct-muted">Loading profile...</div>}
        {error && <div className="acct-error">{error}</div>}

        {!loading && !error && (
          <div className="acct-grid">
            <div className="acct-row">
              <span className="acct-label">Email</span>
              <span className="acct-value">{user?.email || "-"}</span>
            </div>
            <div className="acct-row">
              <span className="acct-label">Full name</span>
              <span className="acct-value">{user?.full_name || "-"}</span>
            </div>
            <div className="acct-row">
              <span className="acct-label">Role</span>
              <span className={`acct-badge acct-role-${role}`}>{roleLabel}</span>
            </div>
            <div className="acct-row">
              <span className="acct-label">Status</span>
              <span className="acct-value">{user?.is_active ? "Active" : "Inactive"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountPage;
