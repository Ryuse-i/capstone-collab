import axios from "axios";
import { getStoredToken } from "./api";

const apiClient = axios.create({
  // Automatically uses your env URL, or falls back to localhost if missing
  baseURL: import.meta.env.VITE_APP_URL || "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
