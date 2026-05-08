// src/pages/AccountPage.js
import React, { useEffect, useState } from "react";

import { authService } from "../api/services";
import { getCurrentUser, setCurrentUser } from "../api/client";

function AccountPage() {
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [toast, setToast] = useState("");
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authService.me();
      setUser(res.data);
      setCurrentUser(res.data);
      setFullName(res.data?.full_name || "");
      setAvatarUrl(res.data?.avatar_url || "");
      setIsEditingName(false);
      setShowEditConfirm(false);
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

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image too large. Max 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result?.toString() || "");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const res = await authService.updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl,
      });
      setUser(res.data);
      setCurrentUser(res.data);
      setIsEditingName(false);
      setToast("Profile updated.");
      setTimeout(() => setToast(""), 2500);
    } catch (err) {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditName = () => {
    setShowEditConfirm(true);
  };

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
        {toast && <div className="acct-muted text-[#22c55e]">{toast}</div>}

        {!loading && !error && (
          <div className="acct-grid">
            <div className="acct-row items-center">
              <span className="acct-label">Profile photo</span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#0f172a] border border-[#1f2937] flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#94a3b8] text-[0.8rem]">No photo</span>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="acct-refresh-btn m-0"
                >
                  Upload
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <span className="text-[#94a3b8] text-[0.8rem]">PNG/JPG, max 2MB</span>
              </div>
            </div>
            <div className="acct-row">
              <span className="acct-label">Email</span>
              <span className="acct-value">{user?.email || "-"}</span>
            </div>
            <div className="acct-row">
              <span className="acct-label">Full name</span>
              <div className="flex gap-3 items-center justify-end flex-1">
                {isEditingName ? (
                  <input
                    type="text"
                    className="acct-value"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-transparent border border-[#1f2937] rounded-lg px-3 py-2 text-[#e2e8f0] w-full max-w-[320px]"
                  />
                ) : (
                  <span className="acct-value text-right flex-1">
                    {fullName || "-"}
                  </span>
                )}
                {showEditConfirm && !isEditingName ? (
                  <>
                    <button
                      type="button"
                      className="acct-refresh-btn"
                      onClick={() => {
                        setIsEditingName(true);
                        setShowEditConfirm(false);
                      }}
                    >
                      Allow
                    </button>
                    <button
                      type="button"
                      className="acct-refresh-btn"
                      onClick={() => setShowEditConfirm(false)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="acct-refresh-btn"
                    onClick={handleEditName}
                    disabled={isEditingName}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="acct-row">
              <span className="acct-label">Role</span>
              <span className={`acct-badge acct-role-${role}`}>{roleLabel}</span>
            </div>
            <div className="acct-row">
              <span className="acct-label">Status</span>
              <span className="acct-value">{user?.is_active ? "Active" : "Inactive"}</span>
            </div>
            <div className="acct-row">
              <span className="acct-label"></span>
              <button
                type="button"
                className="acct-refresh-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
            <div className="acct-row">
              <span className="acct-label">Delete account</span>
              <div className="flex gap-3 items-center justify-end flex-1">
                {showDeleteConfirm ? (
                  <>
                    <button
                      type="button"
                      className="acct-refresh-btn"
                      onClick={() => {
                        setDeleteNotice("Account deletion is handled manually. Please contact support.");
                        setShowDeleteConfirm(false);
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="acct-refresh-btn"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="acct-refresh-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Request delete
                  </button>
                )}
              </div>
            </div>
            {deleteNotice && (
              <div className="acct-row">
                <span className="acct-label"></span>
                <span className="acct-value text-[#f59e0b]">{deleteNotice}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountPage;
