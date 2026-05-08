// src/pages/LoginPage.js
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, setAccessToken, setCurrentUser } from "../api/client";
import { authService } from "../api/services";

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = { email: "", password: "" };
    if (!form.email.includes("@")) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!form.password || form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      if (data?.access_token) {
        localStorage.removeItem("pg_selectedVuln");
        localStorage.removeItem("pg_patches");
        localStorage.removeItem("pg_selectedPatch");
        localStorage.removeItem("lastScanId");
        setAccessToken(data.access_token);
        try {
          const me = await authService.me();
          setCurrentUser(me.data);
        } catch {
          setCurrentUser(null);
        }
        const dest = location.state?.from?.pathname || "/dashboard";
        navigate(dest, { replace: true });
        return;
      }
      throw new Error("No token in response");
    } catch (err) {
      const msg =
        err?.userMessage ||
        err?.response?.data?.detail ||
        "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-[10px] border border-[#e5e7eb] px-3 text-sm outline-none bg-[#f9fafb] transition-all placeholder:text-[#9ca3af] focus:bg-white focus:border-blue-600 focus:shadow-[0_0_0_1px_rgba(37,99,235,0.3)]";

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
        <h2 className="mt-0 mb-[18px] text-2xl font-semibold">Login</h2>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-[#111827]">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              required
              className={inputCls}
            />
            {fieldErrors.email && (
              <div className="text-[#ff8c66] text-sm mt-1.5">{fieldErrors.email}</div>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-[#111827]">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                className="absolute right-[10px] bg-transparent border-none cursor-pointer flex items-center justify-center"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px] text-[#6b7280]" aria-hidden="true" />
                ) : (
                  <Eye className="w-[18px] h-[18px] text-[#6b7280]" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="text-[#ff8c66] text-sm mt-1.5">{fieldErrors.password}</div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="mt-1.5 w-full h-[46px] rounded-full border-none bg-blue-600 text-white font-semibold text-[15px] cursor-pointer transition hover:bg-blue-700 hover:shadow-[0_10px_25px_rgba(37,99,235,0.35)] hover:-translate-y-px disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {error && <div className="text-[#ff8c66] mt-3">{error}</div>}

          <div className="flex items-center justify-between mt-2.5">
            <button
              type="button"
              className="bg-transparent border-none p-0 text-blue-600 text-sm cursor-pointer hover:underline"
              onClick={() => navigate("/register")}
            >
              Create an account
            </button>
            <button
              type="button"
              className="bg-transparent border-none p-0 text-blue-600 text-sm cursor-pointer hover:underline"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-2.5 my-[18px]">
          <span className="flex-1 h-px bg-[#e5e7eb]" />
          <p className="m-0 text-xs text-[#6b7280]">or</p>
          <span className="flex-1 h-px bg-[#e5e7eb]" />
        </div>

        {/* Google */}
        <button
          type="button"
          className="w-full h-[46px] rounded-full border border-[#e5e7eb] bg-white flex items-center justify-center gap-2 text-sm cursor-pointer mb-2.5 transition hover:bg-[#f9fafb] hover:shadow-[0_6px_14px_rgba(15,23,42,0.1)] hover:-translate-y-[0.5px]"
          onClick={() => { window.location.href = authService.googleOAuthUrl(); }}
        >
          <span className="w-5 h-5 flex items-center justify-center" aria-hidden="true">
            <svg viewBox="0 0 48 48" className="w-5 h-5 block" role="img" aria-label="Google logo">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.2 1.54 7.63 2.83l5.54-5.54C33.64 3.6 29.2 1.5 24 1.5 14.85 1.5 7.05 6.76 3.2 14.4l6.7 5.2C11.5 13.16 17.27 9.5 24 9.5z" />
              <path fill="#34A853" d="M46.1 24.6c0-1.55-.14-3.04-.4-4.5H24v8.54h12.4c-.54 2.9-2.16 5.35-4.6 7.03l7.08 5.5c4.13-3.8 6.52-9.4 6.52-15.63z" />
              <path fill="#4285F4" d="M9.9 28.9a14.46 14.46 0 0 1-.77-4.9c0-1.7.28-3.35.77-4.9l-6.7-5.2A22.99 22.99 0 0 0 1 24c0 3.7.88 7.18 2.2 10.1l6.7-5.2z" />
              <path fill="#FBBC05" d="M24 46.5c6.2 0 11.4-2.06 15.2-5.56l-7.08-5.5c-1.96 1.32-4.5 2.1-8.12 2.1-6.73 0-12.5-3.66-14.1-8.9l-6.7 5.2C7.05 41.24 14.85 46.5 24 46.5z" />
            </svg>
          </span>
          <span>Sign in with Google</span>
        </button>

        {/* GitHub */}
        <button
          type="button"
          className="w-full h-[46px] rounded-full border border-[#e5e7eb] bg-white flex items-center justify-center gap-2 text-sm cursor-pointer mb-2.5 transition hover:bg-[#f9fafb] hover:shadow-[0_6px_14px_rgba(15,23,42,0.1)] hover:-translate-y-[0.5px]"
          onClick={() => { window.location.href = authService.githubOAuthUrl(); }}
        >
          <span className="w-5 h-5 flex items-center justify-center text-gray-900" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-5 h-5 block" role="img" aria-label="GitHub logo">
              <path fill="currentColor" d="M12 1.5c-5.8 0-10.5 4.7-10.5 10.5 0 4.64 3.04 8.57 7.26 9.96.53.1.73-.23.73-.52v-1.84c-2.95.64-3.57-1.24-3.57-1.24-.48-1.22-1.18-1.55-1.18-1.55-.97-.66.08-.65.08-.65 1.07.08 1.64 1.1 1.64 1.1.95 1.64 2.5 1.16 3.1.88.1-.7.37-1.16.67-1.42-2.36-.27-4.84-1.18-4.84-5.24 0-1.16.42-2.1 1.1-2.84-.1-.27-.48-1.36.1-2.84 0 0 .9-.3 2.96 1.08a10.2 10.2 0 0 1 5.4 0c2.06-1.38 2.96-1.08 2.96-1.08.58 1.48.2 2.57.1 2.84.68.74 1.1 1.68 1.1 2.84 0 4.08-2.48 4.96-4.86 5.22.38.33.72.98.72 1.98v2.94c0 .3.2.62.74.52A10.51 10.51 0 0 0 22.5 12c0-5.8-4.7-10.5-10.5-10.5z" />
            </svg>
          </span>
          <span>Sign in with GitHub</span>
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
