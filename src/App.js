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
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
        <Route
          path="/scan"
          element={
            <AppLayout>
              <ScanPage />
            </AppLayout>
          }
        />
        <Route
          path="/repositories"
          element={
            <AppLayout>
              <RepoIntegrationPage />
            </AppLayout>
          }
        />
        <Route
          path="/graphs"
          element={
            <AppLayout>
              <GraphsPage />
            </AppLayout>
          }
        />
        <Route
          path="/patch-generator"
          element={
            <AppLayout>
              <PatchGeneratorPage />
            </AppLayout>
          }
        />
        <Route
          path="/reports"
          element={
            <AppLayout>
              <ReportsPage />
            </AppLayout>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
