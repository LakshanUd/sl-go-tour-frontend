import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  RefreshCcw,
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  FileText,
  BarChart3,
  ChevronRight,
  ChevronUp,
  Tag as TagIcon,
  FileDown,
  MapPin,
  UtensilsCrossed,
  Hotel,
  Truck,
  MessageSquare,
  AlertCircle,
  Boxes,
  UserCog,
  Bot,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { confirmToast } from "../../components/ConfirmToast";
import { NavLink, Link } from "react-router-dom";
import MediaUpload from "../../utils/mediaUpload";

/* ===== Theme (green, same as AdminDashboard/Tours) ===== */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ===== Persisted sidebar state key (match Tours) ===== */
const LS_KEY = "adminSidebarOpen";

/* ===== Backend base ===== */
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
    }
    return Promise.reject(err);
  }
);

/* API helpers matching BlogController responses */
const BlogAPI = {
  list: () => api.get("/api/blogs"),                 // { blogs: [...] }
  get: (id) => api.get(`/api/blogs/${id}`),          // { blog: {...} }
  create: (body) => api.post("/api/blogs", body),    // { message, blog }
  update: (id, body) => api.put(`/api/blogs/${id}`, body),
  remove: (id) => api.delete(`/api/blogs/${id}`),
};

export default function BlogsAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit modal state
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    author: "",
    content: "",
    image: "",
    tags: "",
    publishedDate: "",
  });
  const [file, setFile] = useState(null);

  // Search + Tag filter (to mirror Tours Type filter)
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");

  // --- sidebar accordion state; persisted; user-only toggles (no auto) ---
  const [open, setOpen] = useState({
    overview: true,
    content: true, // keep open for Blogs
    ops: true,
    reports: true,
    account: true,
  });

  // Load persisted state once (same as Tours)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setOpen((s) => ({
          overview: typeof parsed.overview === "boolean" ? parsed.overview : s.overview,
          content: typeof parsed.content === "boolean" ? parsed.content : s.content,
          ops: typeof parsed.ops === "boolean" ? parsed.ops : s.ops,
          reports: typeof parsed.reports === "boolean" ? parsed.reports : s.reports,
          account: typeof parsed.account === "boolean" ? parsed.account : s.account,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch { /* ignore */ }
  }, [open]);

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

  // All unique tags (for dropdown)
  const allTags = useMemo(() => {
    const s = new Set();
    rows.forEach((b) => (b.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

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
          : new Date().toISOString().slice(0, 10), // fallback to today
      });
      setEditingId(id);
      setFile(null);
      setOpenModal(true);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open blog");
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      title: "",
      author: "",
      content: "",
      image: "",
      tags: "",
      publishedDate: new Date().toISOString().slice(0, 10), // always today
    });
    setFile(null);
    setOpenModal(true);
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
        publishedDate: form.publishedDate ? new Date(form.publishedDate) : new Date(), // always today
      };

      if (editingId) {
        await BlogAPI.update(editingId, payload);
        toast.success("Blog updated");
      } else {
        await BlogAPI.create(payload);
        toast.success("Blog created");
      }
      setOpenModal(false);
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
      if (tag && !(r.tags || []).includes(tag)) return false;
      if (!q) return true;
      const hay = `${r.title} ${r.author} ${(r.tags || []).join(", ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    return filtered.map((r) => ({
      ...r,
      date: r.publishedDate ? new Date(r.publishedDate).toLocaleDateString() : "-",
      tagsCSV: (r.tags || []).join(", "),
      excerpt: (r.content || "").replace(/\s+/g, " ").slice(0, 140),
    }));
  }, [rows, q, tag]);

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (matches Tours) ===== */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="rounded-xl border border-neutral-200 bg-white">
            {/* 01. Overview */}
            <AccordionHeader
              title="Overview"
              isOpen={open.overview}
              onToggle={() => setOpen((s) => ({ ...s, overview: !s.overview }))}
            />
            {open.overview && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/overview"
                  icon={<LayoutDashboard className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Overview</span>
                </RailLink>
              </div>
            )}

            {/* 02. Content Management */}
            <AccordionHeader
              title="Content Management"
              isOpen={open.content}
              onToggle={() => setOpen((s) => ({ ...s, content: !s.content }))}
            />
            {open.content && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/tour-packages"
                  icon={<MapPin className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Tours</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-blogs"
                  icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Blogs</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-meals"
                  icon={<UtensilsCrossed className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Meals</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-accommodations"
                  icon={<Hotel className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Accommodations</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-vehicles"
                  icon={<Truck className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Vehicles</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-feedbacks"
                  icon={<MessageSquare className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Feedback</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-complaints"
                  icon={<AlertCircle className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Complaints</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-inventory"
                  icon={<Boxes className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Inventory</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-chatbot"
                  icon={<Bot className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Manage Chatbot</span>
                </RailLink>
              </div>
            )}

            {/* 03. Operations Management */}
            <AccordionHeader
              title="Operations Management"
              isOpen={open.ops}
              onToggle={() => setOpen((s) => ({ ...s, ops: !s.ops }))}
            />
            {open.ops && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/manage-users"
                  icon={<Users className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Users</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-finance"
                  icon={<Wallet className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Finance</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-bookings"
                  icon={<CalendarDays className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Bookings</span>
                </RailLink>
              </div>
            )}

            {/* 04. Profile */}
                        <AccordionHeader
                          title="Account Settings"
                          isOpen={open.reports}
                          onToggle={() => setOpen((s) => ({ ...s, reports: !s.reports }))}
                        />
                        {open.account && (
                          <div className="px-3 pb-3">
                            <RailLink
                              to="/profile/settings"
                              icon={<UserCog className={`h-4 w-4 ${ICON_COLOR}`} />}
                            >
                              <span className="whitespace-nowrap">Profile Settings</span>
                            </RailLink>
                          </div>
                        )}
          </div>
        </aside>

        {/* ===== Main content (Blogs grid) ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header row: title + search + actions (mirrors Tours) */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Content</span> · Blogs
              </h2>
              <p className="text-sm text-neutral-500">Create, edit, and delete blog posts.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
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

              <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="Refresh"
              >
                <RefreshCcw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
                Refresh
              </button>

              <button
                onClick={openCreate}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
              >
                <Plus className="h-4 w-4" />
                New
              </button>

              {/* Report button (same style/placement as Tours) */}
              <Link
                to="/reports/blogs"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="View blog reports"
              >
                <BarChart3 className="h-4 w-4" />
                Report
              </Link>
            </div>
          </div>

          {/* Filters (dropdown + count like Tours) */}
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Tag</span>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              >
                <option value="">All</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-neutral-500">
              {loading ? "Loading…" : `${prettyRows.length} of ${rows.length} shown`}
            </span>
          </div>

          {/* Grid (3 per row like Tours) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
            {!loading &&
              prettyRows.map((b) => (
                <article
                  key={b._id}
                  className="group border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 rounded-none"
                >
                  {/* Image */}
                  <div className="relative h-44 bg-neutral-100">
                    {b.image ? (
                      <img
                        src={b.image}
                        alt={b.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/800x450?text=Blog";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-neutral-400 text-sm">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-3 space-y-2">
                    <h3 className="font-semibold text-neutral-900 line-clamp-1">{b.title}</h3>
                    <div className="text-xs text-neutral-600">
                      {b.author} · {b.date}
                    </div>
                    <p className="text-xs text-neutral-600 line-clamp-2 h-8">{b.excerpt || "—"}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(b.tags || []).slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-700 rounded-none"
                        >
                          <TagIcon className="h-3 w-3" />
                          {t}
                        </span>
                      ))}
                      {Array.isArray(b.tags) && b.tags.length > 4 && (
                        <span className="text-[11px] text-neutral-500">+{b.tags.length - 4} more</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(b)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-neutral-900 hover:bg-neutral-800 rounded-none"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(b._id, b.title)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-none"
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}

            {!loading && prettyRows.length === 0 && (
              <div className="col-span-full text-center text-neutral-500 py-12">No blogs found.</div>
            )}

            {loading && (
              <div className="col-span-full text-center text-neutral-500 py-12">Loading blogs…</div>
            )}
          </div>
        </main>
      </div>

      {/* Create / Edit Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <div className={`w-full max-w-xl rounded-2xl p-[1px] ${GRAD_BG} shadow-xl`}>
          <div className="rounded-2xl bg-white max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white">
              <div className="font-semibold">{editingId ? "Edit Blog" : "Create Blog"}</div>
              <button onClick={() => setOpenModal(false)} className="p-2 rounded-md hover:bg-neutral-100" aria-label="Close">
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
                  <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
                    disabled // Make it not changable
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
                  onClick={() => setOpenModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                >
                  Cancel
                </button>
                <button type="submit" className={`px-4 py-2 rounded-xl text-white ${GRAD_BG}`}>
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

/* ---------- Sidebar bits (same as Tours/AdminDashboard) ---------- */
function AccordionHeader({ title, isOpen, onToggle, last = false }) {
  return (
    <button
      onClick={onToggle}
      className={[
        "w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium uppercase tracking-wide",
        "cursor-pointer",
        last ? "" : "border-b border-neutral-200",
      ].join(" ")}
    >
      <span className="text-neutral-500">{title}</span>
      <ChevronUp
        className={[
          "h-4 w-4 transition-transform text-neutral-500",
          isOpen ? "rotate-0" : "rotate-180",
        ].join(" ")}
      />
    </button>
  );
}

function RailLink({ to, icon, children }) {
  return (
    <NavLink to={to} className="block group">
      {({ isActive }) => (
        <div
          className={[
            "rounded-lg p-[1px] my-1",
            isActive
              ? "bg-gradient-to-r from-[#09E65A] to-[#16A34A]"
              : "bg-gradient-to-r from-transparent to-transparent group-hover:from-[#09E65A1A] group-hover:to-[#16A34A1A]",
          ].join(" ")}
        >
          <span
            className={[
              "flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm transition",
              "hover:bg-neutral-50",
              isActive ? "shadow-sm" : "",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2 text-neutral-800 overflow-hidden">
              {icon}
              <span className="whitespace-nowrap">{children}</span>
            </span>
            <ChevronRight className={`h-4 w-4 ${ICON_COLOR}`} />
          </span>
        </div>
      )}
    </NavLink>
  );
}

/* ---------- small UI helpers ---------- */
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
        "focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30",
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
        "focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30",
      ].join(" ")}
    />
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
          className="inline-flex items-center border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700 rounded-full"
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