// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AccountPage from "./pages/AccountPage";
import DashboardPage from "./pages/DashboardPage";
import ScanPage from "./pages/ScanPage";
import RepoIntegrationPage from "./pages/RepoIntegrationPage";
import GraphsPage from "./pages/GraphsPage";
import PatchGeneratorPage from "./pages/PatchGeneratorPage";
import ReportsPage from "./pages/ReportsPage";
import AppLayout from "./components/layout/AppLayout";
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Layout-wrapped routes (later we can add auth guard) */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/scan"
          element={
            <RequireAuth>
              <AppLayout>
                <ScanPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/repositories"
          element={
            <RequireAuth>
              <AppLayout>
                <RepoIntegrationPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/graphs"
          element={
            <RequireAuth>
              <AppLayout>
                <GraphsPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/patches"
          element={
            <RequireAuth>
              <AppLayout>
                <PatchGeneratorPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAuth>
              <AppLayout>
                <ReportsPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AppLayout>
                <AccountPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        {/* Default redirect: go to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
