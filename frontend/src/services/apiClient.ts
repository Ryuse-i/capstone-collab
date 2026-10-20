// src/services/apiClient.ts
import axios from "axios";
import API_BASE_URL from "./config";
import { getStoredToken, refreshAccessTokenOnce, forceLogout } from "./auth";

const apiClient = axios.create({
  // Uses VITE_API_URL, or falls back to localhost if missing
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach the current access token
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// URLs where a 401 is a normal answer (bad credentials, etc.) or would loop
const NO_REFRESH_URLS = [
  "/auth/jwt/login",
  "/auth/jwt/logout",
  "/auth/refresh-token",
  "/auth/register",
];

// Response interceptor: on 401, refresh once (shared with api.ts) and retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      NO_REFRESH_URLS.some((url) => originalRequest.url?.includes(url))
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Step 1: refresh. Only a failure HERE logs the user out.
    let newAccessToken: string | null = null;
    try {
      newAccessToken = await refreshAccessTokenOnce();
    } catch {
      newAccessToken = null;
    }

    if (!newAccessToken) {
      forceLogout();
      return Promise.reject(error);
    }

    // Step 2: retry with the new token. Errors from the retry (403, 404, 500,
    // network, ...) are passed to the caller and do NOT log the user out.
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return apiClient(originalRequest);
  },
);

export default apiClient;