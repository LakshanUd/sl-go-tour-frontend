// src/pages/Admin/AccommodationAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FileDown,
  Tag as TagIcon,
  Users as UsersIcon,
  BedDouble,
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  FileText,
  BarChart3,
  ChevronRight,
  ChevronUp,
  RefreshCcw ,
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
import MediaUpload from "../../utils/mediaUpload.jsx";
import { confirmToast } from "../../components/ConfirmToast";

/* ===== Theme (green, same as AdminDashboard/Tours) ===== */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ===== Persisted sidebar state key ===== */
const LS_KEY = "adminSidebarOpen";

/* ---- Dropdown options (mirror your model) ---- */
const TYPES = ["Single Room", "Double Room", "Family Room"];
const STATUSES = ["Available", "Fully Booked", "Temporarily Closed"];

/* ---- Backend base ---- */
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

// Global error toast
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";
    toast.error(msg);
    return Promise.reject(err);
  }
);

/* ---- API helpers ---- */
const AccomAPI = {
  list: () => api.get("/api/accommodations"),
  get: (id) => api.get(`/api/accommodations/${id}`),
  create: (body) => api.post("/api/accommodations", body),
  update: (id, body) => api.put(`/api/accommodations/${id}`, body),
  remove: (id) => api.delete(`/api/accommodations/${id}`),
};

const EMPTY = {
  name: "",
  type: TYPES[0],
  pricePerNight: "",
  capacity: "",
  amenities: [], // array of strings
  description: "",
  imagesArr: [], // array of image URLs
  status: STATUSES[0],
};

export default function AccommodationAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- sidebar accordion state; persisted; user-only toggles (no auto) ---
  const [open, setOpen] = useState({
    overview: true,
    content: true, // we’re in a content page
    ops: true,
    reports: true,
    account: true,
  });

  // Load persisted sidebar state once
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

  // filters/search
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await AccomAPI.list();
      const list = Array.isArray(res?.data) ? res.data : res?.data?.accommodations || [];
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // derive unique types/statuses from data (in case backend differs)
  const typesFromData = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => r?.type && s.add(r.type));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const statusesFromData = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => r?.status && s.add(r.status));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => (!type ? true : r.type === type))
      .filter((r) => (!status ? true : r.status === status))
      .filter((r) => {
        if (!t) return true;
        const hay = [
          r.name,
          r.type,
          r.status,
          Array.isArray(r.amenities) ? r.amenities.join(",") : "",
          String(r.pricePerNight),
          String(r.capacity),
          r.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(t);
      });
  }, [rows, q, type, status]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(EMPTY);
    setFile(null);
    setModalOpen(true);
  }

  async function openEdit(row) {
    try {
      const id = row?._id;
      if (!id) return;
      const res = await AccomAPI.get(id);
      const a = res?.data || row;

      const imgs =
        Array.isArray(a.images) ? a.images :
        typeof a.images === "string" && a.images
          ? a.images.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

      setForm({
        name: a.name || "",
        type: a.type || TYPES[0],
        pricePerNight: a.pricePerNight ?? "",
        capacity: a.capacity ?? "",
        amenities: Array.isArray(a.amenities) ? a.amenities : [],
        description: a.description || "",
        imagesArr: imgs,
        status: a.status || STATUSES[0],
      });
      setEditingId(id);
      setMode("edit");
      setFile(null);
      setModalOpen(true);
    } catch {
      /* toasted globally */
    }
  }

  async function onDelete(id, name) {
    const ok = await confirmToast({
      title: "Delete Accommodation",
      message: `Are you sure you want to delete "${name || id}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await AccomAPI.remove(id);
      toast.success("Accommodation deleted");
      setRows((prev) => prev.filter((x) => x._id !== id));
    } catch {
      /* toasted globally */
    }
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.type) return toast.error("Type is required");
    if (String(form.pricePerNight).trim() === "") return toast.error("Price per night is required");
    if (String(form.capacity).trim() === "") return toast.error("Capacity is required");

    try {
      let imageUrls = Array.isArray(form.imagesArr) ? [...form.imagesArr] : [];

      if (file) {
        const url = await MediaUpload(file, { bucket: "images", prefix: "accommodations" });
        imageUrls = [url, ...imageUrls];
      }

      const payload = {
        name: form.name.trim(),
        type: form.type,
        pricePerNight: Number(form.pricePerNight),
        capacity: Number(form.capacity),
        amenities: Array.isArray(form.amenities) ? form.amenities : [],
        description: form.description || "",
        images: imageUrls, // array
        status: form.status,
      };

      if (mode === "create") {
        await AccomAPI.create(payload);
        toast.success("Accommodation created");
      } else {
        await AccomAPI.update(editingId, payload);
        toast.success("Accommodation updated");
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

            {/* 04. Reports */}
            <AccordionHeader
              title="Reports"
              isOpen={open.reports}
              onToggle={() => setOpen((s) => ({ ...s, reports: !s.reports }))}
            />
            {open.reports && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/reports"
                  icon={<BarChart3 className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">All Reports</span>
                </RailLink>
              </div>
            )}

            {/* 05. Account Settings */}
            <AccordionHeader
              title="Account Settings"
              isOpen={open.account}
              onToggle={() => setOpen((s) => ({ ...s, account: !s.account }))}
              last
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

        {/* ===== Main content (grid like Tours) ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Content</span> · Accommodations
              </h2>
              <p className="text-sm text-neutral-500">Create, edit, and delete accommodations.</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search name, type, status, amenities…"
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

              {/* New */}
              <button
                onClick={openCreate}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
              >
                <Plus size={16} />
                New
              </button>

              {/* Report */}
              <Link
                to="/reports/accommodations"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="View accommodation reports"
              >
                <BarChart3 className="h-4 w-4" />
                Report
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              >
                <option value="">All</option>
                {(typesFromData.length ? typesFromData : TYPES).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              >
                <option value="">All</option>
                {(statusesFromData.length ? statusesFromData : STATUSES).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <span className="text-xs text-neutral-500">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} shown`}
            </span>
          </div>

          {/* Grid (3 per row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
            {!loading && filtered.map((a) => {
              const firstImg =
                Array.isArray(a.images) && a.images.length
                  ? a.images[0]
                  : typeof a.images === "string" && a.images
                  ? a.images
                  : "";

              return (
                <article
                  key={a._id}
                  className="group border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 rounded-none"
                >
                  {/* Image */}
                  <div className="relative h-44 bg-neutral-100">
                    {firstImg ? (
                      <img
                        src={firstImg}
                        alt={a.name}
                        className="h-full w-full object-cover"
                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/600x300?text=No+Image"; }}
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-neutral-400 text-sm">No Image</div>
                    )}

                    {/* Type tag */}
                    {a.type && (
                      <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 px-2 py-1 text-[11px] border border-neutral-200 rounded-none">
                        <TagIcon className="h-3.5 w-3.5" /> {a.type}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-3">
                    <h3 className="font-semibold text-neutral-900 line-clamp-1">{a.name}</h3>
                    <p className="text-xs text-neutral-600 line-clamp-2 h-8 mt-1">{a.description || "—"}</p>

                    {/* Price / Capacity / Status */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm font-medium text-neutral-900">
                        LKR {Number(a.pricePerNight ?? 0).toFixed(2)} <span className="text-xs text-neutral-500">/night</span>
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs text-neutral-700">
                        <UsersIcon className="h-3.5 w-3.5" /> {a.capacity || 0}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 text-neutral-600">
                        <BedDouble className="h-3.5 w-3.5" />
                        {(a.amenities || []).length} amenities
                      </span>
                      <StatusPill status={a.status} />
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-neutral-900 hover:bg-neutral-800 rounded-none"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button
                        onClick={() => onDelete(a._id, a.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-none"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!loading && filtered.length === 0 && (
              <div className="col-span-full text-center text-neutral-500 py-12">No accommodations found.</div>
            )}

            {loading && (
              <div className="col-span-full text-center text-neutral-500 py-12">Loading accommodations…</div>
            )}
          </div>
        </main>
      </div>

      {/* ===== Create/Edit Modal (kept; adapted to green focus) ===== */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
            <div className="rounded-2xl bg-white max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white">
                <div className="font-semibold">{mode === "create" ? "Create Accommodation" : "Edit Accommodation"}</div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-md hover:bg-neutral-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={onSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>Room Number *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Sunny Beach Resort"
                      required
                    />
                  </div>
                  <div>
                    <Label>Type *</Label>
                    <Select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      options={TYPES}
                    />
                  </div>

                  <div>
                    <Label>Price / Night (LKR) *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.pricePerNight}
                      onChange={(e) => setForm((f) => ({ ...f, pricePerNight: e.target.value }))}
                      placeholder="20000"
                      required
                    />
                  </div>
                  <div>
                    <Label>No. of Person *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                      placeholder="4"
                      required
                    />
                  </div>
                  <div>
                    <Label>Status *</Label>
                    <Select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      options={STATUSES}
                    />
                  </div>

                  {/* Upload (create + edit) */}
                  <div className="md:col-span-3">
                    <Label>Upload image (optional)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    {file && <p className="text-[11px] text-neutral-500 mt-1">Selected: {file.name}</p>}
                  </div>

                  {/* Current images preview in EDIT */}
                  {mode === "edit" && form.imagesArr?.length > 0 && (
                    <div className="md:col-span-3">
                      <Label>Current images</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {form.imagesArr.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={`accom-${i}`}
                            className="w-full h-24 object-cover rounded-lg border"
                            onError={(e) => (e.currentTarget.src = "https://placehold.co/160x96?text=-")}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <Label>Description</Label>
                    <Textarea
                      rows={5}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Short description…"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`px-4 py-2 rounded-xl text-white ${GRAD_BG}`}>
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

/* ===== Sidebar bits (same as AdminDashboard/Tours; cursor-pointer) ===== */

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

/* ===== Small UI helpers (green focus) ===== */
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
function Select({ value, onChange, options = [] }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "text-neutral-800 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30",
      ].join(" ")}
    >
      {options.map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
    </select>
  );
}
function StatusPill({ status }) {
  let cls =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ";
  switch (status) {
    case "Available":
      cls += "bg-emerald-50 text-emerald-700 ring-emerald-200";
      break;
    case "Fully Booked":
      cls += "bg-amber-50 text-amber-700 ring-amber-200";
      break;
    case "Temporarily Closed":
    default:
      cls += "bg-rose-50 text-rose-700 ring-rose-200";
      break;
  }
  return <span className={cls}>{status || "—"}</span>;
}
