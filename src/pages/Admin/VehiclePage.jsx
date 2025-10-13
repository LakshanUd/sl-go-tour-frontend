// src/pages/Admin/VehiclePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, NavLink } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  FileText,
  BarChart3,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  RefreshCcw,
  Fuel,
  Gauge,
  Car as CarIcon,
  Tag as TagIcon,
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
import { confirmToast } from "../../components/ConfirmToast";
import MediaUpload from "../../utils/mediaUpload";

/* ===== Theme (green, same as AccommodationAdmin) ===== */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ===== Persisted sidebar state key ===== */
const LS_KEY = "adminSidebarOpen";

/* ===== Vehicle dropdowns (defaults) ===== */
const VEHICLE_TYPES = ["car", "van", "bus", "suv", "jeep", "minibus"];
const VEHICLE_STATUSES = ["Available", "Unavailable", "under_maintenance"];

/* ---------- API helper (uses .env) ---------- */
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

// Global error toast (match AccommodationAdmin style)
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

const VehicleAPI = {
  list: () => api.get("/api/vehicles"),
  getByVehicleID: (vehicleID) => api.get(`/api/vehicles/${encodeURIComponent(vehicleID)}`),
  create: (data) => api.post("/api/vehicles", data),
  updateByVehicleID: (vehicleID, data) =>
    api.put(`/api/vehicles/${encodeURIComponent(vehicleID)}`, data),
  removeByVehicleID: (vehicleID) =>
    api.delete(`/api/vehicles/${encodeURIComponent(vehicleID)}`),
};

/* Helpers */
const getVehicleID = (v) => v?.vehicleID || v?.productID || v?._id;

// NEW: generator for auto Vehicle IDs (pattern similar to other IDs in your backend)
function generateVehicleID() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `V-${ymd}-${rand}`;
}

const EMPTY = {
  vehicleID: "",
  regNo: "",
  brand: "",
  type: "car",
  seatingCapacity: "",
  fuelType: "petrol",
  status: "Available",
  price: "",
  images: "", // CSV in the form; array when sending
};

export default function VehiclePage() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // sidebar accordions (persisted)
  const [open, setOpen] = useState({
    overview: true,
    content: true,
    ops: true,
    reports: true,
    account: true,
  });

  // filters/search (like AccommodationAdmin)
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // modal
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [editingVehicleID, setEditingVehicleID] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch { /* ignore */ }
  }, [open]);

  async function load() {
    try {
      setLoading(true);
      const res = await VehicleAPI.list();
      const body = res?.data ?? [];
      const items = Array.isArray(body) ? body : body.vehicles || body.items || body.data || [];
      setRows(items);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // derive unique types/statuses from data (so UI reflects backend)
  const typesFromData = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => r?.type && s.add(String(r.type)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const statusesFromData = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => r?.status && s.add(String(r.status)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((v) => (!typeFilter ? true : String(v.type) === typeFilter))
      .filter((v) => (!statusFilter ? true : String(v.status) === statusFilter))
      .filter((v) => {
        if (!t) return true;
        const hay = [
          v.vehicleID, v.productID, v._id,
          v.regNo, v.brand, v.type, v.fuelType, v.status,
          String(v.seatingCapacity), String(v.price),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(t);
      });
  }, [rows, q, typeFilter, statusFilter]);

  function openCreate() {
    setMode("create");
    setEditingVehicleID(null);
    // NEW: auto-generate ID for create
    setForm({ ...EMPTY, vehicleID: generateVehicleID() });
    setFile(null);
    setOpenModal(true);
  }

  async function openEdit(row) {
    try {
      const id = getVehicleID(row);
      let doc = row;

      if (row?.vehicleID) {
        try {
          const res = await VehicleAPI.getByVehicleID(row.vehicleID);
          doc = res.data || row;
        } catch { /* ignore */ }
      }

      setForm({
        vehicleID: doc.vehicleID || "",
        regNo: doc.regNo || "",
        brand: doc.brand || "",
        type: doc.type || "car",
        seatingCapacity: doc.seatingCapacity ?? "",
        fuelType: doc.fuelType || "petrol",
        status: doc.status || "Available",
        price: doc.price ?? "",
        images: Array.isArray(doc.images) ? doc.images.join(", ") : doc.images || "",
      });
      setEditingVehicleID(doc.vehicleID || id);
      setMode("edit");
      setFile(null);
      setOpenModal(true);
    } catch { /* toasted globally */ }
  }

  async function onDelete(row) {
    const vehicleID = row?.vehicleID || getVehicleID(row);
    const ok = await confirmToast({
      title: "Delete Vehicle",
      message: `Are you sure you want to delete "${row.regNo || vehicleID || "this vehicle"}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await VehicleAPI.removeByVehicleID(vehicleID);
      toast.success("Vehicle deleted");
      load();
    } catch { /* toasted globally */ }
  }

  function isNumber(n) {
    return Number.isFinite(Number(n));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!form.vehicleID.trim() || !form.regNo.trim() || !form.brand.trim()) {
      toast.error("vehicleID, regNo, brand are required");
      return;
    }
    if (!form.seatingCapacity || Number(form.seatingCapacity) < 1) {
      toast.error("seatingCapacity must be at least 1");
      return;
    }
    if (form.price === "" || !isNumber(form.price) || Number(form.price) < 0) {
      toast.error("Price must be a number ≥ 0");
      return;
    }

    try {
      setSubmitting(true);
      let imageUrls = (form.images || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (file) {
        const url = await MediaUpload(file, { bucket: "images", prefix: "vehicles" });
        imageUrls = [url, ...imageUrls];
      }

      const payload = {
        vehicleID: form.vehicleID.trim(),
        regNo: form.regNo.trim().toUpperCase(),
        brand: form.brand.trim(),
        type: form.type,
        seatingCapacity: Number(form.seatingCapacity),
        fuelType: form.fuelType,
        status: form.status,
        price: Number(form.price),
        images: imageUrls,
      };

      if (mode === "create") {
        await VehicleAPI.create(payload);
        toast.success("Vehicle created");
      } else {
        await VehicleAPI.updateByVehicleID(editingVehicleID, payload);
        toast.success("Vehicle updated");
      }
      setOpenModal(false);
      setFile(null);
      await load();
    } catch { /* toasted globally */ }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (same pattern as AccommodationAdmin) ===== */}
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

        {/* ===== Main content (grid like AccommodationAdmin) ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Content</span> · Vehicles
              </h2>
              <p className="text-sm text-neutral-500">Create, edit, and delete vehicles.</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search reg no, brand, type, price…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>

              {/* Refresh */}
              <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer"
                title="Refresh"
              >
                <RefreshCcw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
                Refresh
              </button>

              {/* New */}
              <button
                onClick={openCreate}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90 cursor-pointer`}
              >
                <Plus size={16} />
                New
              </button>

              {/* Report */}
              <Link
                to="/reports/vehicles"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="View vehicle reports"
              >
                <BarChart3 className="h-4 w-4" />
                Report
              </Link>
            </div>
          </div>

          {/* Filters (Type / Status) */}
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              >
                <option value="">All</option>
                {(typesFromData.length ? typesFromData : VEHICLE_TYPES).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              >
                <option value="">All</option>
                {(statusesFromData.length ? statusesFromData : VEHICLE_STATUSES).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <span className="text-xs text-neutral-500">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} shown`}
            </span>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
            {!loading &&
              filtered.map((v) => {
                const vehId = getVehicleID(v);
                const img =
                  Array.isArray(v.images) && v.images.length
                    ? v.images[0]
                    : typeof v.images === "string" && v.images
                    ? v.images
                    : "";

                return (
                  <article
                    key={vehId}
                    className="group border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 rounded-none"
                  >
                    {/* Image */}
                    <div className="relative h-44 bg-neutral-100">
                      {img ? (
                        <img
                          src={img}
                          alt={v.brand || v.regNo || vehId}
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/600x300?text=No+Image"; }}
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-neutral-400 text-sm">No Image</div>
                      )}

                      {/* Type tag */}
                      {v.type && (
                        <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 px-2 py-1 text-[11px] border border-neutral-200 rounded-none">
                          <TagIcon className="h-3.5 w-3.5" /> {v.type}
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-3">
                      <h3 className="font-semibold text-neutral-900 line-clamp-1 flex items-center gap-2">
                        <CarIcon className={`h-4 w-4 ${ICON_COLOR}`} />
                        {v.brand || "—"}
                      </h3>
                      <p className="text-xs text-neutral-600 mt-0.5">Reg No: <span className="font-medium">{v.regNo || "—"}</span></p>

                      {/* Meta */}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-neutral-700">
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="h-3.5 w-3.5" /> {v.seatingCapacity ?? "—"} seats
                        </span>
                        <span className="inline-flex items-center gap-1 capitalize">
                          <Fuel className="h-3.5 w-3.5" /> {v.fuelType || "—"}
                        </span>
                        <StatusPill status={v.status} />
                      </div>

                      {/* Price */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-sm font-medium text-neutral-900">
                          {typeof v.price === "number" ? `LKR ${v.price.toFixed(2)}` : "—"}
                        </div>
                        <div className="text-[11px] text-neutral-500">ID: {v.vehicleID || vehId}</div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-neutral-900 hover:bg-neutral-800 rounded-none cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => onDelete(v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-none cursor-pointer"
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
              <div className="col-span-full text-center text-neutral-500 py-12">No vehicles found.</div>
            )}

            {loading && (
              <div className="col-span-full text-center text-neutral-500 py-12">Loading vehicles…</div>
            )}
          </div>
        </main>
      </div>

      {/* ===== Create/Edit Modal (kept; adapted to green focus) ===== */}
      {openModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
            <div className="rounded-2xl bg-white max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white">
                <div className="font-semibold">{mode === "create" ? "Create Vehicle" : "Edit Vehicle"}</div>
                <button
                  onClick={() => setOpenModal(false)}
                  className="p-2 rounded-md hover:bg-neutral-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-neutral-700" />
                </button>
              </div>

              <form onSubmit={onSubmit} className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Reg No *</Label>
                    <Input
                      value={form.regNo}
                      onChange={(e) => setForm((f) => ({ ...f, regNo: e.target.value.toUpperCase() }))}
                      placeholder="ABC-1234"
                      required
                    />
                  </div>
                  <div>
                    <Label>Brand *</Label>
                    <Input
                      value={form.brand}
                      onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                      placeholder="Toyota"
                      required
                    />
                  </div>

                  <div>
                    <Label>Type *</Label>
                    <Select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      options={VEHICLE_TYPES}
                    />
                  </div>
                  <div>
                    <Label>Seats *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.seatingCapacity}
                      onChange={(e) => setForm((f) => ({ ...f, seatingCapacity: e.target.value }))}
                      placeholder="4"
                      required
                    />
                  </div>
                  <div>
                    <Label>Fuel Type *</Label>
                    <Select
                      value={form.fuelType}
                      onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
                      options={["petrol", "diesel", "hybrid", "electric"]}
                    />
                  </div>

                  <div>
                    <Label>Status *</Label>
                    <Select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      options={VEHICLE_STATUSES}
                    />
                  </div>

                  <div>
                    <Label>Price (LKR) *</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="12000"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Upload image (optional)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    {file && <p className="text-xs text-neutral-500 mt-1">Selected: {file.name}</p>}
                  </div>

                  {/* Current images preview in EDIT */}
                  {mode === "edit" && (
                    <div className="md:col-span-3">
                      <Label>Current images</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(form.images || "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt={`vehicle-${i}`}
                              className="w-full h-24 object-cover rounded-lg border"
                              onError={(e) => (e.currentTarget.src = "https://placehold.co/160x96?text=-")}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setOpenModal(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} ${submitting ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {mode === "create"
                      ? (submitting ? "Creating…" : "Create")
                      : (submitting ? "Updating…" : "Update")}
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

/* ===== Sidebar bits (same as AccommodationAdmin) ===== */
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
        <option key={op} value={op} className="capitalize">
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
    case "under_maintenance":
      cls += "bg-amber-50 text-amber-700 ring-amber-200";
      break;
    case "Unavailable":
    default:
      cls += "bg-rose-50 text-rose-700 ring-rose-200";
      break;
  }
  return <span className={cls}>{(status || "—").toString().replace("_", " ")}</span>;
}
