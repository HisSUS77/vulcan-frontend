// src/pages/PatchGeneratorPage.js
import React, { useState } from "react";
import "../App.css";

export default function PatchGeneratorPage() {
  const [vuln, setVuln] = useState("VUL-014");
  const [patch, setPatch] = useState("patch1");

  return (
    <div className="pg-wrapper">

      {/* Page Heading */}
      <div className="pg-heading-row">
        <h1 className="pg-title">AI-Based Patch Generation</h1>
        <button className="pg-generate-btn">Generate Patch</button>
      </div>

      {/* Main Card */}
      <div className="pg-card">

        {/* Dropdown Row */}
        <div className="pg-dropdown-row">
          <div className="pg-dropdown-group">
            <label>Select vulnerability</label>
            <select
              className="pg-select"
              value={vuln}
              onChange={(e) => setVuln(e.target.value)}
            >
              <option value="VUL-014">VUL-014</option>
              <option value="VUL-021">VUL-021</option>
              <option value="VUL-033">VUL-033</option>
            </select>
          </div>

          <div className="pg-dropdown-group">
            <label>AI-generated patch</label>
            <select
              className="pg-select"
              value={patch}
              onChange={(e) => setPatch(e.target.value)}
            >
              <option value="patch1">void log.info(const)::cpp</option>
              <option value="patch2">authenticate_user::cpp</option>
              <option value="patch3">connection_handler.cpp</option>
            </select>
          </div>
        </div>

        {/* Code Compare Row */}
        <div className="pg-code-compare">

          {/* Original Code */}
          <div className="pg-code-box">
            <pre className="pg-code">
{`1   void log_info(const std::string& msg);
2   void handle_connection(int sock);

3   bool authenticate_user(const std::string& a){
4   {
5       return buffer, password);
6   }`}
            </pre>

            <div className="pg-diff-red"></div>
          </div>

          {/* Patched Code */}
          <div className="pg-code-box">
            <pre className="pg-code pg-green">
{`1   void log_info(const std::string& msg);
2   void handle_connection(int sock);

3   bool authenticate_user(const std::string& a){
4
5       strncpy(buffer, password, sizeof(buffer)-1);
6       buffer[sizeof(buffer)-1] = '\\0';
7   }`}
            </pre>

            <div className="pg-diff-green"></div>
          </div>

        </div>

        {/* Explanation + Confidence Row */}
        <div className="pg-bottom-row">

          {/* Explanation */}
          <div className="pg-explain-card">
            <div className="pg-explain-header">
              <span>AI-generated explanation</span>
              <span className="pg-tag">CWE-121</span>
              <span className="pg-ai-tag">AI</span>
            </div>

            <p className="pg-explain-text">
              The patch alters <b>strcpy()</b> to <b>strncpy()</b>,
              ensuring the buffer is not overflowed by specifying
              the maximum number of bytes to copy. This prevents
              a stack-based buffer overflow vulnerability.
            </p>

            <div className="pg-btn-row">
              <button className="pg-secondary-btn">Re-generate</button>
              <button className="pg-secondary-btn">Export Patch</button>
              <button className="pg-secondary-btn">Apply Patch</button>
            </div>
          </div>

          {/* Confidence Meter */}
          <div className="pg-confidence-card">
            <div className="pg-conf-title">Confidence score</div>

            <div className="pg-ring-wrapper">
              <svg className="pg-ring" viewBox="0 0 36 36">
                <path
                  className="pg-ring-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="pg-ring-fg"
                  strokeDasharray="82, 100"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="pg-ring-text">82%</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
