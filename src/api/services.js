// src/api/services.js
import { api } from "./client";

// ============= AUTH =============
export const authService = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (payload) => api.post("/auth/register", payload),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  refresh: () => api.post("/auth/refresh"),
  updateProfile: (payload) => api.patch("/auth/me", payload),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, newPassword) =>
    api.post("/auth/reset-password", { token, new_password: newPassword }),
  validateResetToken: (token) => api.post("/auth/validate-reset-token", { token }),
  googleOAuthUrl: () => `${api.defaults.baseURL}/auth/oauth/google`,
  githubOAuthUrl: () => `${api.defaults.baseURL}/auth/oauth/github`,
};

// ============= DASHBOARD =============
export const dashboardService = {
  getSummary: () => api.get("/dashboard/summary"),
  getRecentScans: () => api.get("/dashboard/recent-scans"),
  getPatchStats: () => api.get("/dashboard/patch-stats"),
};

// ============= NOTIFICATIONS =============
export const notificationService = {
  getNotifications: (page = 1, size = 10) =>
    api.get("/notifications", { params: { page, size } }),
};

// ============= REPOSITORIES =============
export const repositoryService = {
  list: () => api.get("/repositories"),
  create: (data) => api.post("/repositories", data),
  get: (id) => api.get(`/repositories/${id}`),
  delete: (id) => api.delete(`/repositories/${id}`),
  getBranches: (id) => api.get(`/repositories/${id}/branches`),
  getFiles: (id, branch = "main") =>
    api.get(`/repositories/${id}/files`, { params: { branch } }),
  upload: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/repositories/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ============= SCANS =============
export const scanService = {
  list: () => api.get("/scans"),
  start: (data) => api.post("/scans/start", data),
  getStatus: (scanId) => api.get(`/scans/${scanId}/status`),
  getLogs: (scanId) => api.get(`/scans/${scanId}/logs`),
  getSummary: (scanId) => api.get(`/scans/${scanId}/summary`),
  cancel: (scanId) => api.post(`/scans/${scanId}/cancel`),
  // Export scan results
  exportPDF: (scanId) =>
    api.get(`/reports/${scanId}/export`, {
      params: { format: "pdf" },
      responseType: "blob", // CRITICAL for binary data
    }),
  exportJSON: (scanId) =>
    api.get(`/reports/${scanId}/export`, {
      params: { format: "json" },
    }),
};

// ============= GRAPHS =============
export const graphService = {
  getGraph: (scanId, fileId, type = "AST") =>
    api.get(`/graphs/${scanId}/file/${fileId}`, { params: { type } }),
  getNode: (scanId, nodeId) => api.get(`/graphs/${scanId}/nodes/${nodeId}`),
  getPath: (scanId, pathId) => api.get(`/graphs/${scanId}/paths/${pathId}`),
};

// ============= PATCHES =============
export const patchService = {
  generate: (data) => api.post("/patches/generate", data),
  validate: (patchId) => api.post(`/patches/${patchId}/validate`),
  apply: (patchId, repoId = null) =>
    api.post(`/patches/${patchId}/apply`, null, {
      params: repoId ? { repo_id: repoId } : {},
    }),
  export: (patchId) => api.get(`/patches/${patchId}/export`),
  // FR-M6.10: Review workflow
  approve: (patchId) => api.post(`/patches/${patchId}/approve`),
  reject: (patchId) => api.post(`/patches/${patchId}/reject`),
  // FE-5: Patch history / audit trail
  historyForVuln: (vulnerabilityId) =>
    api.get(`/patches/vulnerability/${vulnerabilityId}/history`),
};

// ============= REPORTS =============
export const reportService = {
  list: (params = {}) => api.get("/reports", { params }),
  get: (reportId) => api.get(`/reports/${reportId}`),
  export: (reportId, format = "json") =>
    api.get(`/reports/${reportId}/export`, { params: { format } }),
  compare: (reportId1, reportId2) =>
    api.post("/reports/compare", { report_id_1: reportId1, report_id_2: reportId2 }),
};

// ============= SEMANTIC ANALYSIS (NEW) =============
export const analysisService = {
  analyze: (code, language, filename = null) =>
    api.post("/analysis/analyze", { code, language, filename }),
  buildGraph: (code, language, filename = null) =>
    api.post("/analysis/graph", { code, language, filename }),
  getFindings: () => api.get("/analysis/findings"),
};

// ============= ADMIN =============
export const adminService = {
  listUsers: () => api.get("/admin/users"),
  updateUserRole: (userId, role) => api.patch(`/admin/users/${userId}`, { role }),
};
