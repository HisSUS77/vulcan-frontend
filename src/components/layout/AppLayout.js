// src/components/layout/AppLayout.js
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../../App.css";

const navItems = [
  { label: "Repository Integration", to: "/repositories", icon: "📁" },
  { label: "Scan", to: "/scan", icon: "🔍" },
  { label: "Graphs", to: "/graphs", icon: "📊" },
  { label: "Patch Generator", to: "/patch-generator", icon: "🧩" },
  { label: "Reports", to: "/reports", icon: "📄" },
];

const sampleRepos = ["frontend-app", "backend-service", "utility-lib"];

function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const suggestions =
    search.length >= 3
      ? sampleRepos.filter((r) =>
          r.toLowerCase().includes(search.toLowerCase())
        )
      : [];

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    // later: clear real tokens
    localStorage.removeItem("access_token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="v-layout">
      {/* Sidebar */}
      <aside className="v-sidebar">
        <div className="v-brand">
          <div className="v-brand-logo-circle">
            <img src="/vulcanlogo.png" alt="VULCAN" className="v-brand-logo-img" />
          </div>
          <span className="v-brand-text">VULCAN</span>
        </div>

        <nav className="v-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={
                "v-nav-item" +
                (location.pathname === item.to ? " v-nav-item-active" : "")
              }
            >
              <span className="v-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="v-main">
        <header className="v-topbar">
          <h1 className="v-topbar-title">Dashboard</h1>

          <div className="v-topbar-right">
            {/* Search bar */}
            <div className="v-search-wrap">
              <span className="v-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value.length >= 3) setShowSuggestions(true);
                  else setShowSuggestions(false);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                onFocus={() => {
                  if (search.length >= 3) setShowSuggestions(true);
                }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="v-search-suggestions">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSearch(item);
                        setShowSuggestions(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="v-profile-wrap" ref={profileRef}>
              <button
                type="button"
                className="v-profile-avatar"
                onClick={() => setProfileOpen((o) => !o)}
              >
                👤
              </button>
              {profileOpen && (
                <div className="v-profile-menu">
                  <div className="v-profile-menu-header">
                    <p className="v-profile-name">Agent Vulcan</p>
                    <p className="v-profile-email">agent@vulcan.ai</p>
                  </div>
                  <button type="button">Account settings</button>
                  <button type="button">API keys</button>
                  <button
                    type="button"
                    className="v-profile-logout"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="v-content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;
