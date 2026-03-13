import axios from "axios";
import { appConfig } from "@/lib/config";

// Prefer explicit env, but fall back to the same origin (works on Vercel and other hosts).
const fallbackApi =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "http://localhost:4000/api";

const api = axios.create({
  baseURL: appConfig.apiUrl || fallbackApi,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    const requestId = response.headers?.["x-request-id"];
    if (requestId) {
      // surface request id for debugging
      (response.data ??= {}).requestId = requestId;
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = (error.config?.url || "").toLowerCase();
    const requestId = error.response?.headers?.["x-request-id"];

    if (requestId) {
      error.requestId = requestId;
    }

    const skipRedirect = ["/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password"].some(
      (path) => url.includes(path)
    );

    if (status === 401 && !skipRedirect) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
