// src/pages/RegisterPage.js
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../api/services";
import { setAccessToken, setCurrentUser } from "../api/client";

function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = { email: "", password: "", confirm: "" };
    if (form.password !== form.confirm) nextErrors.confirm = "Passwords do not match.";
    if (form.password.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    if (!form.email.includes("@")) nextErrors.email = "Please enter a valid email address.";
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password || nextErrors.confirm) return;
    setError("");
    setLoading(true);
    try {
      await authService.register({
        email: form.email.trim(),
        full_name: form.full_name.trim() || undefined,
        password: form.password,
      });
      const login = await authService.login(form.email.trim(), form.password);
      if (login.data?.access_token) {
        setAccessToken(login.data.access_token);
        try {
          const me = await authService.me();
          setCurrentUser(me.data);
        } catch {
          // not critical
        }
        navigate("/dashboard", { replace: true });
        return;
      }
      setError("Registration successful! Please login.");
      navigate("/login", { replace: true });
    } catch (err) {
      let msg = "Registration failed. Please check your details.";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === "string") msg = detail;
        else if (Array.isArray(detail)) msg = detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(", ");
        else msg = JSON.stringify(detail);
      } else if (err?.userMessage) {
        msg = err.userMessage;
      } else if (err?.message) {
        msg = err.message;
      }
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
        <h2 className="mt-0 mb-[18px] text-2xl font-semibold">Create Account</h2>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Full name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="full_name" className="text-sm text-[#111827]">Full name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="Full name"
              value={form.full_name}
              onChange={handleChange}
              className={inputCls}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-[#111827]">Email address</label>
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
            <label htmlFor="password" className="text-sm text-[#111827]">Password</label>
            <div className="relative flex items-center">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
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

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm text-[#111827]">Confirm password</label>
            <input
              id="confirm"
              name="confirm"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={form.confirm}
              onChange={handleChange}
              required
              minLength={6}
              className={inputCls}
            />
            {fieldErrors.confirm && (
              <div className="text-[#ff8c66] text-sm mt-1.5">{fieldErrors.confirm}</div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="mt-1.5 w-full h-[46px] rounded-full border-none bg-blue-600 text-white font-semibold text-[15px] cursor-pointer transition hover:bg-blue-700 hover:shadow-[0_10px_25px_rgba(37,99,235,0.35)] hover:-translate-y-px disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          {error && <div className="text-[#ff8c66] mt-3">{error}</div>}
        </form>

        <button
          type="button"
          className="mt-2.5 bg-transparent border-none p-0 text-blue-600 text-sm cursor-pointer hover:underline"
          onClick={() => navigate("/login")}
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

export default RegisterPage;
