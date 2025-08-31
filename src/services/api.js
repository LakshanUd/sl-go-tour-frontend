import axios from "axios";

const baseURL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Optional: central error logging
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API error:", err?.response?.data || err.message);
    return Promise.reject(err);
  }
);
