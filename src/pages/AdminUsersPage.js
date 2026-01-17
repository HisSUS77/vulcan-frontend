// src/pages/AdminUsersPage.js
import React, { useEffect, useState } from "react";
import "../App.css";
import { adminService } from "../api/services";

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await adminService.listUsers();
        if (!mounted) return;
        setUsers(res.data || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.userMessage || "Failed to load users.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRoleChange = async (userId, nextRole) => {
    setSavingId(userId);
    setError("");
    try {
      const res = await adminService.updateUserRole(userId, nextRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...res.data } : u))
      );
    } catch (err) {
      setError(err?.userMessage || "Failed to update user role.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="v-dashboard">
      <div className="v-card">
        <div className="v-card-header">
          <h2>All Users</h2>
        </div>

        {loading ? <p>Loading users...</p> : null}
        {error ? <p className="acct-error">{error}</p> : null}

        {!loading && !error ? (
          <div className="rv-table-scroll">
            <table className="rv-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="rv-filter-select"
                        value={u.role || "normal"}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={savingId === u.id}
                      >
                        <option value="normal">Normal</option>
                        <option value="premium">Premium</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{u.status || (u.is_active ? "active" : "inactive")}</td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AdminUsersPage;
