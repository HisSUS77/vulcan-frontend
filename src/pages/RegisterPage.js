// src/pages/RegisterPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../api/services";
import { setAccessToken, setCurrentUser } from "../api/client";
import "../App.css";

function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
    confirm: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      alert("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (!form.email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    try {
      console.log("[Register] Sending registration request...");
      await authService.register({
        email: form.email.trim(),
        full_name: form.full_name.trim() || undefined,
        password: form.password,
      });
      console.log("[Register] Registration successful, logging in...");
      const login = await authService.login(form.email.trim(), form.password);
      if (login.data?.access_token) {
        setAccessToken(login.data.access_token);
        try {
          const me = await authService.me();
          setCurrentUser(me.data);
        } catch {
          // User info not critical
        }
        navigate("/dashboard", { replace: true });
        return;
      }
      // If no token but registration succeeded, go to login
      alert("Registration successful! Please login.");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("[Register] Error:", err);
      console.error("[Register] Response:", err?.response?.data);
      
      // Extract error message
      let msg = "Registration failed. Please check your details.";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        // Handle both string and array formats
        if (typeof detail === "string") {
          msg = detail;
        } else if (Array.isArray(detail)) {
          msg = detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(", ");
        } else {
          msg = JSON.stringify(detail);
        }
      } else if (err?.userMessage) {
        msg = err.userMessage;
      } else if (err?.message) {
        msg = err.message;
      }
      alert(msg);
    }
  };

  return (
    <div className="lp-page">
      <div className="lp-logo-wrap">
        <div className="lp-logo-circle">
          <img src="/logo.jpg" alt="VULCAN logo" className="lp-logo-img" />
        </div>
        <div className="lp-logo-text">VULCAN</div>
      </div>

      <div className="lp-card">
        <h2 className="lp-card-title">Create Account</h2>

        <form className="lp-form" onSubmit={handleSubmit}>
          <div className="lp-field">
            <label htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="Full name"
              value={form.full_name}
              onChange={handleChange}
            />
          </div>

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
                minLength={6}
              />
              <button
                type="button"
                className="lp-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="lp-field">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              name="confirm"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={form.confirm}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="lp-primary-btn">
            Create account
          </button>
        </form>

        <button
          type="button"
          className="lp-link-btn"
          onClick={() => navigate("/login")}
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

export default RegisterPage;
