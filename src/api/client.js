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
      setAccessToken(null);
      // Optionally dispatch a global event for redirect handling
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vulcan:unauthorized"));
      }
    }
    return Promise.reject(err);
  }
);
