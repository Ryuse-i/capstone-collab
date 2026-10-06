import axios from "axios";
import { getStoredToken } from "./api";
import API_BASE_URL from "./api";

const apiClient = axios.create({
  // Automatically uses your env URL, or falls back to localhost if missing
  baseURL: API_BASE_URL,
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
