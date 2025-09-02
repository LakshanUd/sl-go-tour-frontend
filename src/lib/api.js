// src/lib/api.js
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:5000"; // CHANGE if needed
export const BLOGS_URL = `${API_BASE}/blogs`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// READ all
export async function fetchBlogs() {
  try {
    const { data } = await api.get(BLOGS_URL);
    return data.blogs || [];
  } catch (e) {
    if (e?.response?.status === 404) return [];
    toast.error(e?.response?.data?.message || "Failed to load blogs");
    throw e;
  }
}

// CREATE
export async function createBlog(payload) {
  try {
    const { data } = await api.post(BLOGS_URL, payload);
    toast.success("Blog created");
    return data.blog;
  } catch (e) {
    toast.error(e?.response?.data?.message || "Create failed");
    throw e;
  }
}

// UPDATE
export async function updateBlog(id, payload) {
  try {
    const { data } = await api.put(`${BLOGS_URL}/${id}`, payload);
    toast.success("Blog updated");
    return data.blog;
  } catch (e) {
    toast.error(e?.response?.data?.message || "Update failed");
    throw e;
  }
}

// DELETE
export async function deleteBlog(id) {
  try {
    const { data } = await api.delete(`${BLOGS_URL}/${id}`);
    toast.success("Blog deleted");
    return data.blog;
  } catch (e) {
    toast.error(e?.response?.data?.message || "Delete failed");
    throw e;
  }
}
