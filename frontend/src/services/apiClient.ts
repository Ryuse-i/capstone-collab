import axios from "axios";
const apiClient = axios.create({
  // Automatically uses your env URL, or falls back to localhost if missing
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});
export default apiClient;
