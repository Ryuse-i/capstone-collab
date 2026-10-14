import axios from "axios";
import { getStoredToken } from "./api";
import API_BASE_URL from "./api";
import { refreshAccessTokenOnce, forceLogout } from "./auth";

const apiClient = axios.create({
  // Automatically uses your env URL, or falls back to localhost if missing
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach token
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Define URLs that should not trigger refresh (to prevent infinite loops)
    // These are the actual auth endpoints used by the frontend
    const NO_REFRESH_URLS = [
      "/auth/jwt/login",
      "/auth/jwt/logout",
      "/auth/refresh-token",
      "/auth/register"
    ];

    // Check if we should attempt refresh
    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      NO_REFRESH_URLS.some((url) => originalRequest.url?.includes(url))
    ) {
      return Promise.reject(error);
    }

    // Mark that we've attempted a retry
    originalRequest._retry = true;

    try {
      // Attempt to refresh the access token
      const newAccessToken = await refreshAccessTokenOnce();

      if (!newAccessToken) {
        // Refresh failed - force logout
        forceLogout();
        return Promise.reject(error);
      }

      // Store the new token (so request interceptor will pick it up)
      // Note: refreshAccessTokenOnce already stores the token via refreshAccessToken
      // But we ensure it's stored before retrying

      // Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh threw an error - force logout
      forceLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;