// src/components/layout/AppLayout.js
import React, { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../api/services";
import { getAccessToken, getCurrentUser, setCurrentUser, setAccessToken } from "../../api/client";
import { useTheme } from "../../context/ThemeContext";

import {
  LayoutDashboard, FolderGit, ScanSearch, Share2, FileDiff,
  FileBarChart, Search, Users, FlaskConical, Crosshair, Skull, Sun, Moon,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",             to: "/dashboard",      icon: <LayoutDashboard size={20} />, roles: ["normal","premium","admin"] },
  { label: "Repository Integration",to: "/repositories",   icon: <FolderGit size={20} />,       roles: ["normal","premium","admin"] },
  { label: "Scan",                  to: "/scan",            icon: <ScanSearch size={20} />,      roles: ["normal","premium","admin"] },
  { label: "Attack Surface",        to: "/attack-surface", icon: <Crosshair size={20} />,       roles: ["normal","premium","admin"] },
  { label: "Kill Chain",            to: "/kill-chain",     icon: <Skull size={20} />,           roles: ["normal","premium","admin"] },
  { label: "Graphs",                to: "/graphs",          icon: <Share2 size={20} />,          roles: ["normal","premium","admin"] },
  { label: "Patch Generator",       to: "/patches",         icon: <FileDiff size={20} />,        roles: ["premium","admin"] },
  { label: "Reports",               to: "/reports",         icon: <FileBarChart size={20} />,    roles: ["normal","premium","admin"] },
  { label: "Benchmark",             to: "/benchmark",       icon: <FlaskConical size={20} />,    roles: ["admin"] },
  { label: "Users",                 to: "/admin/users",     icon: <Users size={20} />,           roles: ["admin"] },
];

const roleBadgeCls = {
  admin:   "bg-[rgba(255,120,80,0.25)] text-[#ff8c66]",
  premium: "bg-[rgba(91,198,124,0.2)] text-[#5bc67c]",
  normal:  "bg-[rgba(150,170,210,0.2)] text-[#9ab0e3]",
};

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(getCurrentUser());
  const [invalidToken, setInvalidToken] = useState(false);
  const profileRef = useRef(null);

  const sampleRepos = ["frontend-app", "backend-service", "utility-lib"];
  const suggestions =
    search.length >= 3
      ? sampleRepos.filter((r) => r.toLowerCase().includes(search.toLowerCase()))
      : [];

  useEffect(() => {
    const handler = (e) => {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const res = await authService.me();
        if (!mounted) return;
        setUser(res.data);
        setCurrentUser(res.data);
        setInvalidToken(false);
      } catch {
        if (!mounted) return;
        setUser(null);
        setCurrentUser(null);
        setInvalidToken(!!getAccessToken());
      }
    };
    if (!user) loadProfile();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const handler = () => setInvalidToken(true);
    window.addEventListener("vulcan:invalid-token", handler);
    return () => window.removeEventListener("vulcan:invalid-token", handler);
  }, []);

  useEffect(() => {
    if (!invalidToken || !getAccessToken()) return;
    let alive = true;
    const recheckSession = async () => {
      try {
        const res = await authService.me();
        if (!alive) return;
        setUser(res.data);
        setCurrentUser(res.data);
        setInvalidToken(false);
      } catch {
        if (!alive) return;
        setInvalidToken(true);
      }
    };
    recheckSession();
    return () => { alive = false; };
  }, [invalidToken, location.pathname]);

  const handleRetryToken = async () => {
    try {
      const res = await authService.me();
      setUser(res.data);
      setCurrentUser(res.data);
      setInvalidToken(false);
    } catch {
      setInvalidToken(true);
    }
  };

  const handleLogout = () => {
    setAccessToken(null);
    setCurrentUser(null);
    localStorage.removeItem("lastScanId");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-[#e5e7eb] overflow-hidden">
      {/* Decorative overlays — defined in index.css (pseudo-elements + animations) */}
      <div className="v-grid-overlay" aria-hidden="true" />
      <div className="v-scanline-overlay" aria-hidden="true" />

      {/* Invalid token modal */}
      {invalidToken && (
        <div
          className="fixed inset-0 bg-[radial-gradient(1200px_600px_at_50%_30%,rgba(20,30,60,0.6),rgba(8,12,26,0.9))] backdrop-blur-sm grid place-items-center z-[1000] pointer-events-none"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-[min(420px,90vw)] bg-[rgba(12,18,36,0.92)] border border-[rgba(90,110,180,0.35)] shadow-[0_20px_60px_rgba(0,0,0,0.45)] rounded-[18px] px-6 pt-7 pb-6 text-center pointer-events-auto">
            <div className="w-14 h-14 mx-auto mb-2.5 rounded-full grid place-items-center text-[26px] text-[#ffcc66] bg-[rgba(255,204,102,0.12)] border border-[rgba(255,204,102,0.35)]">
              ⚠
            </div>
            <div className="text-xl font-bold text-[#ff7b7b] tracking-[0.2px]">Invalid token</div>
            <div className="mt-1.5 text-[13.5px] text-[rgba(220,230,255,0.75)]">
              Your session token is invalid or expired. Please retry.
            </div>
            <button
              type="button"
              className="mt-4 bg-[linear-gradient(135deg,#2f6cff,#2b4bff)] text-white border-none rounded-xl px-[22px] py-2.5 font-bold cursor-pointer shadow-[0_10px_30px_rgba(46,108,255,0.35)] transition hover:brightness-105"
              onClick={handleRetryToken}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="relative z-[5] w-[300px] flex-shrink-0 flex flex-col gap-[30px] p-8 px-5 overflow-hidden border-r border-[rgba(34,211,238,0.12)] bg-[radial-gradient(circle_at_top,#0d1526,#020617_70%)]">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-[110px] h-[110px] rounded-full bg-[radial-gradient(circle_at_30%_0,#1f2937,#020617)] flex items-center justify-center overflow-hidden shadow-[0_0_28px_rgba(56,189,248,0.7)] mb-3">
            <img src="/vulcanlogo.png" alt="VULCAN" className="w-full h-full object-cover rounded-full" />
          </div>
          <span className="text-[26px] font-bold tracking-[0.28em] text-[#d8e0ef]">VULCAN</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          {navItems
            .filter((item) => (item.roles || []).includes(user?.role || "normal"))
            .map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-4 px-[14px] py-3 rounded-xl no-underline text-base transition-colors ${
                  location.pathname === item.to
                    ? "bg-[linear-gradient(135deg,#0f172a,#020617)] text-[#e5e7eb]"
                    : "text-[#9ca3af] hover:bg-[#111827] hover:text-[#e5e7eb]"
                }`}
              >
                <span className="w-5 text-center flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="relative flex-1 flex flex-col min-w-0 z-[1]">
        {/* Topbar */}
        <header className="h-[70px] border-b border-[rgba(31,41,55,0.9)] flex items-center justify-end px-[26px] bg-[#020617]">
          <div className="flex items-center gap-4">

            {/* Theme toggle */}
            <button
              type="button"
              className="flex items-center justify-center w-[34px] h-[34px] rounded-full border border-[rgba(148,163,184,0.4)] bg-transparent text-[#9ca3af] cursor-pointer transition hover:bg-[rgba(34,211,238,0.08)] hover:text-[#22d3ee] hover:border-[rgba(34,211,238,0.4)]"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Search */}
            <div className="relative flex items-center bg-[#020617] rounded-full border border-[rgba(148,163,184,0.5)] px-2.5 py-0.5">
              <span className="text-sm mr-1 text-[#9ca3af]">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(e.target.value.length >= 3);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => setShowSuggestions(search.length >= 3)}
                className="bg-transparent border-none outline-none text-[#e5e7eb] px-1.5 py-1 text-sm w-[220px] placeholder:text-[#6b7280]"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-[34px] left-0 right-0 bg-[#020617] rounded-[10px] border border-[rgba(148,163,184,0.6)] p-1 z-20">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setSearch(item); setShowSuggestions(false); }}
                      className="w-full text-left px-2 py-1.5 bg-transparent border-none text-[#e5e7eb] text-[13px] rounded-lg cursor-pointer hover:bg-[#111827]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="w-[34px] h-[34px] rounded-full border-none bg-[radial-gradient(circle_at_20%_0,#22d3ee,#0ea5e9)] flex items-center justify-center cursor-pointer"
                onClick={() => setProfileOpen((o) => !o)}
              >
                👤
              </button>

              {profileOpen && (
                <div className="fixed right-3 top-[70px] min-w-[210px] bg-[#020617] rounded-xl border border-[rgba(148,163,184,0.7)] shadow-[0_18px_45px_rgba(15,23,42,0.9)] overflow-hidden z-[9999]">
                  <div className="px-3 py-2.5 border-b border-[rgba(31,41,55,0.9)]">
                    <p className="m-0 text-sm">{user?.full_name || "Vulcan User"}</p>
                    <p className="mt-0.5 m-0 text-xs text-[#9ca3af]">{user?.email || "user@vulcan.ai"}</p>
                    <span className={`mt-2 inline-block px-2 py-1 rounded-full text-[10px] tracking-[0.08em] uppercase ${roleBadgeCls[user?.role || "normal"] || "bg-[rgba(255,255,255,0.1)] text-white"}`}>
                      {(user?.role || "normal").toUpperCase()}
                    </span>
                  </div>
                  <button type="button" onClick={() => navigate("/account")} className="w-full bg-transparent border-none text-left px-3 py-2 text-[13px] text-[#e5e7eb] cursor-pointer hover:bg-[#111827]">
                    Account settings
                  </button>
                  <button type="button" className="w-full bg-transparent border-none text-left px-3 py-2 text-[13px] text-[#e5e7eb] cursor-pointer hover:bg-[#111827]">
                    API keys
                  </button>
                  <button type="button" onClick={handleLogout} className="w-full bg-transparent border-none text-left px-3 py-2 text-[13px] text-[#f97373] cursor-pointer hover:bg-[#111827]">
                    Logout
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="flex-1 p-5 px-[22px] pb-6 overflow-y-auto overflow-x-hidden min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
