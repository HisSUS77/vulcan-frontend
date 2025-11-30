// src/api/client.js
import axios from "axios";

const baseURL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export const api = axios.create({ baseURL });

export const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

export const setAccessToken = (t) => {
  if (typeof window === "undefined") return;
  if (!t) localStorage.removeItem("access_token");
  else localStorage.setItem("access_token", t);
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      // Only clear token and logout if it's an auth endpoint or token is actually invalid
      const isAuthEndpoint = err.config?.url?.includes('/auth/');
      const hasToken = getAccessToken();
      
      // If we have a token and it's not an auth endpoint, don't auto-logout
      // The endpoint might just not be implemented yet
      if (isAuthEndpoint || !hasToken) {
        setAccessToken(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("vulcan:unauthorized"));
        }
      }
    }
    return Promise.reject(err);
  }
);
