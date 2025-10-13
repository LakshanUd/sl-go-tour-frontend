// src/pages/Admin/AdminMeals.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCcw,
  Search,
  Tag as TagIcon,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  FileText,
  BarChart3,
  ChevronRight,
  ChevronUp,
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
import { NavLink, Link } from "react-router-dom";
import { confirmToast } from "../../components/ConfirmToast";
import MediaUpload from "../../utils/mediaUpload";

/* ===== Theme (same as AdminDashboard/TourPackageListAdmin) ===== */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ===== Persisted sidebar state key ===== */
const LS_KEY = "adminSidebarOpen";

/* ===== Backend base ===== */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

// Attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global errors
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Request failed";
    toast.error(msg);
    return Promise.reject(error);
  }
);

const MealsAPI = {
  list: () => api.get("/api/meals"),                       // { meals: [...] }
  get: (id) => api.get(`/api/meals/${id}`),                // { meals: {...} }
  create: (body) => api.post("/api/meals", body),
  update: (id, body) => api.put(`/api/meals/${id}`, body),
  remove: (id) => api.delete(`/api/meals/${id}`),
};

const EMPTY = {
  name: "",
  description: "",
  catogery: "",
  price: "",
  avalability: true,
  image: "",
};

export default function AdminMeals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // sidebar accordion state (persisted, user-controlled only)
  const [open, setOpen] = useState({
    overview: true,
    content: true, // we’re on a content page
    ops: true,
    reports: true,
    account: true,
  });
  // Load persisted accordion
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
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch { /* ignore */ }
  }, [open]);

  // search + filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await MealsAPI.list();
      setRows(Array.isArray(res?.data?.meals) ? res.data.meals : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // derive categories from data
  const categories = useMemo(() => {
    const s = new Set();
    rows.forEach((m) => m?.catogery && s.add(m.catogery));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // filter + search
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((m) => (!category ? true : m.catogery === category))
      .filter((m) => {
        if (!t) return true;
        const hay = `${m.name} ${m.catogery} ${m.description} ${m.price}`.toLowerCase();
        return hay.includes(t);
      });
  }, [rows, q, category]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(EMPTY);
    setFile(null);
    setModalOpen(true);
  }

  async function openEdit(id) {
    try {
      const res = await MealsAPI.get(id);
      const doc = res?.data?.meals || {};
      setForm({
        name: doc.name || "",
        description: doc.description || "",
        catogery: doc.catogery || "",
        price: doc.price ?? "",
        avalability: !!doc.avalability,
        image: doc.image || "",
      });
      setEditingId(id);
      setMode("edit");
      setFile(null);
      setModalOpen(true);
    } catch {
      /* errors toasted by interceptor */
    }
  }

  async function onDelete(id, name) {
    const ok = await confirmToast({
      title: "Delete Meal",
      message: `Are you sure you want to delete "${name || id}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await MealsAPI.remove(id);
      toast.success("Meal deleted");
      await load();
    } catch {
      /* handled globally */
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.catogery.trim() || !String(form.price).trim()) {
      toast.error("Name, Category and Price are required");
      return;
    }

    try {
      let imageUrl = form.image?.trim() || "";
      if (file) {
        const uploaded = await MediaUpload(file, { bucket: "images", prefix: "meals" });
        imageUrl = uploaded;
      }

      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || "",
        catogery: form.catogery.trim(),
        price: Number(form.price),
        avalability: !!form.avalability,
        image: imageUrl,
      };

      if (mode === "create") {
        await MealsAPI.create(payload);
        toast.success("Meal created");
      } else {
        await MealsAPI.update(editingId, payload);
        toast.success("Meal updated");
      }

      setModalOpen(false);
      setFile(null);
      await load();
    } catch {
      /* toasted globally */
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (matches AdminDashboard/Tours) ===== */}
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

        {/* ===== Main content (Meals list) ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Content</span> · Meals
              </h2>
              <p className="text-sm text-neutral-500">Manage meals: create, edit, or delete.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search name, category, description, price…"
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

              <Link
                to="/reports/meals"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="View meal reports"
              >
                <BarChart3 className="h-4 w-4" />
                Report
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <span className="text-xs text-neutral-500">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} shown`}
            </span>
          </div>

          {/* Grid (3 per row like Tours) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
            {!loading && filtered.map((m) => (
              <article
                key={m._id}
                className="group border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 rounded-none"
              >
                {/* Image */}
                <div className="relative h-44 bg-neutral-100">
                  {m.image ? (
                    <img
                      src={m.image}
                      alt={m.name}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/600x300?text=No+Image"; }}
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-neutral-400 text-sm">No Image</div>
                  )}

                  {/* Category tag */}
                  {m.catogery && (
                    <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 px-2 py-1 text-[11px] border border-neutral-200 rounded-none">
                      <TagIcon className="h-3.5 w-3.5" /> {m.catogery}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-3">
                  <h3 className="font-semibold text-neutral-900 line-clamp-1">{m.name}</h3>
                  <p className="text-xs text-neutral-600 line-clamp-2 h-8 mt-1">{m.description || "—"}</p>

                  {/* Price / Availability */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-neutral-900">LKR {Number(m.price ?? 0).toFixed(2)}</div>
                    <div className="inline-flex items-center gap-1 text-xs">
                      {m.avalability ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> <span className="text-neutral-700">Available</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-rose-600" /> <span className="text-neutral-700">Unavailable</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(m._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-neutral-900 hover:bg-neutral-800 rounded-none"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button
                      onClick={() => onDelete(m._id, m.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-none"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {!loading && filtered.length === 0 && (
              <div className="col-span-full text-center text-neutral-500 py-12">No meals found.</div>
            )}

            {loading && (
              <div className="col-span-full text-center text-neutral-500 py-12">Loading meals…</div>
            )}
          </div>
        </main>
      </div>

      {/* ===== Create / Edit Modal (kept from your version) ===== */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
            <div className="rounded-2xl bg-white max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white">
                <h3 className="font-semibold">{mode === "create" ? "Create Meal" : "Edit Meal"}</h3>
              </div>

              <form onSubmit={onSubmit} className="p-5 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Name *</label>
                    <input
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Chicken Kottu"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Category *</label>
                    <input
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                      value={form.catogery}
                      onChange={(e) => setForm((f) => ({ ...f, catogery: e.target.value }))}
                      placeholder="Sri Lankan / Drinks / …"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Price (LKR) *</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="1500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Availability</label>
                    <select
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                      value={form.avalability ? "true" : "false"}
                      onChange={(e) => setForm((f) => ({ ...f, avalability: e.target.value === "true" }))}
                    >
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Upload image (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    {file && <p className="text-[11px] text-neutral-500 mt-1">Selected: {file.name}</p>}
                  </div>

                  {mode === "edit" && form.image && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1.5">Current image</label>
                      <img
                        src={form.image}
                        alt="current"
                        className="w-full h-40 object-cover rounded-lg border"
                        onError={(e) => (e.currentTarget.src = "https://placehold.co/640x240?text=-")}
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Description</label>
                    <textarea
                      rows={4}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Short description…"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
                  >
                    {mode === "create" ? "Create" : "Update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Sidebar bits (same as AdminDashboard/Tours) ===== */

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
