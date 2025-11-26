import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import LoginPage from "./pages/loginPage";
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
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected area (wrapped by layout) */}
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
          path="/patch-generator"
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

        {/* Default redirect: go to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
