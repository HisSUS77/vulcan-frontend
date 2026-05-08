// src/pages/ResetPasswordPage.js
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../api/services";

function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("token") || "";
  }, [location.search]);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setStatus({ type: "error", message: "Reset token is missing." });
        setTokenValid(false);
        setValidating(false);
        return;
      }
      setValidating(true);
      try {
        const { data } = await authService.validateResetToken(token);
        if (data?.valid) {
          setTokenValid(true);
          setStatus({ type: "success", message: "Token verified. Set a new password." });
        } else {
          setTokenValid(false);
          setStatus({ type: "error", message: data?.message || "Invalid or expired reset token." });
        }
      } catch {
        setTokenValid(false);
        setStatus({ type: "error", message: "Failed to validate reset token." });
      } finally {
        setValidating(false);
      }
    };
    validate();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setStatus({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const { data } = await authService.resetPassword(token, password);
      setStatus({ type: "success", message: data?.message || "Password reset successfully." });
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to reset password.";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-[10px] border border-[#e5e7eb] px-3 text-sm outline-none bg-[#f9fafb] transition-all placeholder:text-[#9ca3af] focus:bg-white focus:border-blue-600 focus:shadow-[0_0_0_1px_rgba(37,99,235,0.3)]";

  const alertCls =
    status.type === "success"
      ? "rounded-[10px] px-3 py-2.5 mb-3 text-[13px] bg-[#ecfdf3] text-[#166534] border border-[#bbf7d0]"
      : "rounded-[10px] px-3 py-2.5 mb-3 text-[13px] bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]";

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4 bg-[#f4f5fb]">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8 mt-5">
        <div className="w-[180px] h-[180px] rounded-full overflow-hidden bg-white flex items-center justify-center mb-3">
          <img
            src="/logo.jpg"
            alt="VULCAN logo"
            className="w-[140px] h-[140px] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.15)]"
          />
        </div>
        <div className="text-[40px] tracking-[0.2em] font-bold">VULCAN</div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[460px] bg-white rounded-[18px] shadow-[0_18px_45px_rgba(15,23,42,0.12)] pt-7 px-8 pb-8 max-[480px]:px-[18px] max-[480px]:py-[22px]">
        <h2 className="mt-0 mb-[18px] text-2xl font-semibold">Reset password</h2>

        {validating && (
          <p className="m-0 mb-3 text-[13px] text-[#6b7280]">Validating reset token...</p>
        )}

        {status.message && (
          <div className={alertCls}>{status.message}</div>
        )}

        {tokenValid ? (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm text-[#111827]">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-sm text-[#111827]">Confirm password</label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              className="mt-1.5 w-full h-[46px] rounded-full border-none bg-blue-600 text-white font-semibold text-[15px] cursor-pointer transition hover:bg-blue-700 hover:shadow-[0_10px_25px_rgba(37,99,235,0.35)] hover:-translate-y-px disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Updating..." : "Reset password"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="mt-2.5 bg-transparent border-none p-0 text-blue-600 text-sm cursor-pointer hover:underline"
            onClick={() => navigate("/forgot-password")}
          >
            Request a new reset link
          </button>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
