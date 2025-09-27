// src/api/cart.js
import axios from "axios";
import toast from "react-hot-toast";

const RAW =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    toast.error(err?.response?.data?.message || err?.message || "Request failed");
    return Promise.reject(err);
  }
);

export const CartAPI = {
  get: () => api.get("/api/cart"),
  addItem: (payload) => api.post("/api/cart/items", payload),
  updateItem: (id, patch) => api.patch(`/api/cart/items/${encodeURIComponent(id)}`, patch),
  removeItem: (id) => api.delete(`/api/cart/items/${encodeURIComponent(id)}`),
  clear: () => api.delete("/api/cart"),
  checkout: () => api.post("/api/cart/checkout"),
};
