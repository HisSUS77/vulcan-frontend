// src/pages/ForgotPasswordPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../api/services";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus({ type: "error", message: "Please enter a valid email address." });
      return;
    }
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const { data } = await authService.forgotPassword(email.trim());
      setStatus({ type: "success", message: data?.message || "Check your email for reset instructions." });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to send reset email.";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="mt-0 mb-[18px] text-2xl font-semibold">Forgot password</h2>
        <p className="m-0 mb-3 text-[13px] text-[#6b7280]">
          Enter your email address and we will send a reset link.
        </p>

        {status.message && (
          <div className={alertCls}>{status.message}</div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-[#111827]">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 w-full rounded-[10px] border border-[#e5e7eb] px-3 text-sm outline-none bg-[#f9fafb] transition-all placeholder:text-[#9ca3af] focus:bg-white focus:border-blue-600 focus:shadow-[0_0_0_1px_rgba(37,99,235,0.3)]"
            />
          </div>

          <button
            type="submit"
            className="mt-1.5 w-full h-[46px] rounded-full border-none bg-blue-600 text-white font-semibold text-[15px] cursor-pointer transition hover:bg-blue-700 hover:shadow-[0_10px_25px_rgba(37,99,235,0.35)] hover:-translate-y-px disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <button
            type="button"
            className="bg-transparent border-none p-0 text-blue-600 text-sm cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
