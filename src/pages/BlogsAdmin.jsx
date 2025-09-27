// src/pages/BlogsAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X, Search, RefreshCcw, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { confirmToast } from "../components/ConfirmToast";
import { useNavigate, Link } from "react-router-dom";
import MediaUpload from "../utils/mediaUpload";

/* Theme tokens */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* Backend base */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

// Attach token (if any)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional: handle 401/403 globally
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const s = err?.response?.status;
    if (s === 401 || s === 403) {
      toast.error(err?.response?.data?.message || "Please log in to continue.");
      // window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/* API helpers matching BlogController responses */
const BlogAPI = {
  list: () => api.get("/api/blogs"),                 // { blogs: [...] }
  get: (id) => api.get(`/api/blogs/${id}`),          // { blog: {...} }
  create: (body) => api.post("/api/blogs", body),    // { message, blog }
  update: (id, body) => api.put(`/api/blogs/${id}`, body), // { message, blog }
  remove: (id) => api.delete(`/api/blogs/${id}`),    // { message, blog }
};

export default function BlogsAdmin() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    author: "",
    content: "",
    image: "",           // stored URL (after upload)
    tags: "",
    publishedDate: "",
  });

  // file input (upload like VehiclePage)
  const [file, setFile] = useState(null);

  const [q, setQ] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await BlogAPI.list();
      setRows(Array.isArray(res?.data?.blogs) ? res.data.blogs : []);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({
      title: "",
      author: "",
      content: "",
      image: "",
      tags: "",
      publishedDate: "",
    });
    setFile(null);
    setOpen(true);
  }

  async function openEdit(row) {
    try {
      const id = row?._id;
      if (!id) return;
      const res = await BlogAPI.get(id);
      const b = res?.data?.blog || row;
      setForm({
        title: b.title || "",
        author: b.author || "",
        content: b.content || "",
        image: b.image || "",
        tags: Array.isArray(b.tags) ? b.tags.join(", ") : "",
        publishedDate: b.publishedDate
          ? new Date(b.publishedDate).toISOString().slice(0, 10)
          : "",
      });
      setEditingId(id);
      setFile(null);
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open blog");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.content.trim()) {
      toast.error("Title, Author, and Content are required");
      return;
    }

    try {
      // Upload image first if a new file was selected
      let imageUrl = form.image?.trim() || "";
      if (file) {
        const uploaded = await MediaUpload(file, { bucket: "images", prefix: "blogs" });
        imageUrl = uploaded;
      }

      const payload = {
        title: form.title.trim(),
        author: form.author.trim(),
        content: form.content,
        image: imageUrl,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        publishedDate: form.publishedDate ? new Date(form.publishedDate) : undefined,
      };

      if (editingId) {
        await BlogAPI.update(editingId, payload);
        toast.success("Blog updated");
      } else {
        await BlogAPI.create(payload);
        toast.success("Blog created");
      }
      setOpen(false);
      setFile(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Save failed");
    }
  }

  async function onDelete(id, title) {
    const ok = await confirmToast({
      title: "Delete blog?",
      message: `Delete “${title || "this blog"}”? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await BlogAPI.remove(id);
      toast.success("Blog deleted");
      setRows((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  const prettyRows = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (!q) return true;
      const hay = `${r.title} ${r.author} ${(r.tags || []).join(", ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    return filtered.map((r) => ({
      ...r,
      date: r.publishedDate ? new Date(r.publishedDate).toLocaleDateString() : "-",
      tagsCSV: (r.tags || []).join(", "),
    }));
  }, [rows, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Back button ABOVE the title (like VehiclePage) */}
      <div className="mb-2">
        <button
          onClick={() => nav(-1)}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Manage <span className={gradText}>Blogs</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Create, edit, and delete blog posts.</p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Backend: <span className="font-mono">{BASE}/api/blogs</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="group">
            <div
              className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-64
                         border border-neutral-200 transition-colors
                         focus-within:border-[#9733EE] focus-within:ring-2 focus-within:ring-[#9733EE]/20"
            >
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                type="text"
                placeholder="Search title, author, tag"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                aria-label="Search blogs"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Reload */}
          <button
            onClick={load}
            className="cursor-pointer group inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Reload"
          >
            <RefreshCcw className={["h-4 w-4", loading ? "animate-spin" : "group-hover:rotate-180"].join(" ")} />
            Reload
          </button>

          {/* New Blog */}
          <button
            onClick={openCreate}
            className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-90 active:opacity-80`}
          >
            <Plus className="h-4 w-4" />
            New Blog
          </button>

          <Link
            to="/reports/blogs"
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Download report"
          >
            Report
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-neutral-600">Loading…</div>
        ) : prettyRows.length === 0 ? (
          <div className="p-6 text-neutral-500">No blogs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50">
                <tr className="text-left text-neutral-600">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {prettyRows.map((r) => (
                  <tr key={r._id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-3 max-w-[420px]">
                      <div className="truncate font-medium text-neutral-800">{r.title}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{r.author}</td>
                    <td className="px-4 py-3">
                      <TagRow tagsCSV={r.tagsCSV} />
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{r.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 shadow-sm"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(r._id, r.title)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 shadow-sm"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal: smaller & scrollable; file input; preview current image */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className={`w-full max-w-xl rounded-2xl p-[1px] ${gradBG} shadow-xl`}>
          <div className="rounded-2xl bg-white max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white">
              <div className="font-semibold">{editingId ? "Edit Blog" : "Create Blog"}</div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-neutral-100" aria-label="Close">
                <X className="h-5 w-5 text-neutral-700" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Enter blog title"
                    required
                  />
                </div>
                <div className="md:col-span-1">
                  <Label>Author *</Label>
                  <Input
                    value={form.author}
                    onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                    placeholder="Author name"
                    required
                  />
                </div>

                <div className="md:col-span-3">
                  <Label>Content *</Label>
                  <Textarea
                    rows={8}
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder="Write your post..."
                    required
                  />
                </div>

                {/* File input like VehiclePage */}
                <div className="md:col-span-3">
                  <Label>Upload cover image (optional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file && <p className="text-[11px] text-neutral-500 mt-1">Selected: {file.name}</p>}
                </div>

                {/* Show current image in EDIT */}
                {editingId && form.image && (
                  <div className="md:col-span-3">
                    <Label>Current image</Label>
                    <img
                      src={form.image}
                      alt="current"
                      className="w-full h-44 object-cover rounded-lg border"
                      onError={(e) => (e.currentTarget.src = "https://placehold.co/800x176?text=-")}
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <Label>Published Date</Label>
                  <Input
                    type="date"
                    value={form.publishedDate}
                    onChange={(e) => setForm((f) => ({ ...f, publishedDate: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-3">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="travel, sri lanka, tips"
                  />
                  <TagPreview csv={form.tags} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                >
                  Cancel
                </button>
                <button type="submit" className={`px-4 py-2 rounded-xl text-white ${gradBG}`}>
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---- small UI helpers ---- */
function Label({ children }) {
  return <label className="block text-sm font-medium mb-1.5">{children}</label>;
}
function Input(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "placeholder:text-neutral-400 text-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
      ].join(" ")}
    />
  );
}
function Textarea(props) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "placeholder:text-neutral-400 text-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
      ].join(" ")}
    />
  );
}
function TagRow({ tagsCSV }) {
  const tags = (tagsCSV || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (tags.length === 0) return <span className="text-neutral-500">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
function TagPreview({ csv }) {
  const arr = (csv || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (arr.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {arr.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-2 sm:p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-[1001]" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
