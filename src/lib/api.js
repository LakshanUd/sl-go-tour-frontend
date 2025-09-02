import axios from "axios";

// Use only Vite-style environment variables
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Meals endpoints
export const MealsAPI = {
  list: () => api.get("/meals"),                     // { meals: [...] }
  get: (id) => api.get(`/meals/${id}`),              // { meals: {...} }
  create: (payload) => api.post("/meals", payload),
  update: (id, payload) => api.put(`/meals/${id}`, payload),
  remove: (id) => api.delete(`/meals/${id}`),
};
