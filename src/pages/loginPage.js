// src/pages/LoginPage.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, setAccessToken } from "../api/client";
import "../App.css";

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const location = useLocation();

  // Production: no default credentials, only real backend auth

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Try real backend login first
      const { data } = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      if (data?.access_token) {
        setAccessToken(data.access_token);
        const dest = location.state?.from?.pathname || "/dashboard";
        navigate(dest, { replace: true });
        return;
      }
      throw new Error("No token in response");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Login failed. Please check your credentials.";
      alert(msg);
    }
  };

  return (
    <div className="lp-page">
      {/* Top logo + title */}
      <div className="lp-logo-wrap">
        <div className="lp-logo-circle">
          <img src="/logo.jpg" alt="VULCAN logo" className="lp-logo-img" />
        </div>
        <div className="lp-logo-text">VULCAN</div>
      </div>


      {/* Card */}
      <div className="lp-card">
        <h2 className="lp-card-title">Login</h2>

        <form className="lp-form" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="lp-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password */}
          <div className="lp-field">
            <label htmlFor="password">Password</label>
            <div className="lp-password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="lp-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button type="submit" className="lp-primary-btn">
            Login
          </button>
          {/* No default credential bypass in production */}
        </form>

        {/* Forgot password */}
        <button type="button" className="lp-link-btn">
          Forgot password?
        </button>

        {/* Divider */}
        <div className="lp-divider">
          <span></span>
          <p>or</p>
          <span></span>
        </div>

        {/* Social buttons */}
        <button type="button" className="lp-oauth-btn lp-google-btn">
          <span className="lp-oauth-icon">G</span>
          <span>Sign in with Google</span>
        </button>

        <button type="button" className="lp-oauth-btn lp-github-btn">
          <span className="lp-oauth-icon">🐱</span>
          <span>Sign in with Github</span>
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
