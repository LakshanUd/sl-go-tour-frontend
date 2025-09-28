// src/pages/Admin/TourPackageListAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  RefreshCcw,
  Search,
  Hotel,
  Car,
  Utensils,
  Clock,
  Tag,
  Eye,
  Pencil,
  Trash2,
  FileDown,
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  FileText,
  BarChart3,
  Bell,
  ChevronRight,
  ChevronUp,
  Package,
  Settings,
} from "lucide-react";
import { confirmToast } from "../../components/ConfirmToast";

/* ===== Theme (green, same as AdminDashboard) ===== */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ===== Persisted sidebar state key (same pattern as AdminDashboard) ===== */
const LS_KEY = "adminSidebarOpen";

/* ===== API base ===== */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
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
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";
    toast.error(msg);
    return Promise.reject(err);
  }
);

const ToursAPI = {
  list: () => api.get("/api/tour-packages"),
  remove: (id) => api.delete(`/api/tour-packages/${encodeURIComponent(id)}`),
};

const TYPES = ["City Tour", "Village Tour", "Sea Tour", "Lagoon Tour"];

export default function TourPackageListAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  // --- sidebar accordion state; persisted; user-only toggles (no auto) ---
  const [open, setOpen] = useState({
    overview: true,
    content: true, // keep open for Tours
    ops: true,
    reports: true,
    account: true,
  });

  // Load persisted state once (same as AdminDashboard)
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
    } catch {/* ignore */}
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch {/* ignore */}
  }, [open]);

  async function load() {
    try {
      setLoading(true);
      const res = await ToursAPI.list();
      setRows(Array.isArray(res?.data) ? res.data : res?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => (!type ? true : r.type === type))
      .filter((r) => {
        if (!t) return true;
        const hay = [
          r.tourPakage_ID,
          r.name,
          r.type,
          r.description,
          r.duration,
          String(r.price),
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(t);
      });
  }, [rows, q, type]);

  async function onDelete(id, name) {
    const ok = await confirmToast({
      title: "Delete Tour Package",
      message: `Are you sure you want to delete "${name || id}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await ToursAPI.remove(id);
      toast.success("Tour package deleted");
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (matches AdminDashboard) ===== */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="rounded-xl border border-neutral-200 bg-white">
            {/* Overview */}
            <AccordionHeader
              title="Overview"
              isOpen={open.overview}
              onToggle={() => setOpen((s) => ({ ...s, overview: !s.overview }))}
            />
            {open.overview && (
              <div className="px-3 pb-2">
                <RailLink to="/admin/overview" icon={<LayoutDashboard className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Analytics</span>
                </RailLink>
              </div>
            )}

            {/* Content Management */}
            <AccordionHeader
              title="Content Management"
              isOpen={open.content}
              onToggle={() => setOpen((s) => ({ ...s, content: !s.content }))}
            />
            {open.content && (
              <div className="px-3 pb-2">
                <RailLink to="/admin/tour-packages" icon={<Package className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Tours</span>
                </RailLink>
                <RailLink to="/admin/manage-blogs" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Blogs</span>
                </RailLink>
                <RailLink to="/admin/manage-meals" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Meals</span>
                </RailLink>
                <RailLink to="/admin/manage-accommodations" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Accommodations</span>
                </RailLink>
                <RailLink to="/admin/manage-vehicles" icon={<BarChart3 className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Vehicles</span>
                </RailLink>
                <RailLink to="/admin/manage-inventory" icon={<Package className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Inventory</span>
                </RailLink>                
                <RailLink to="/admin/manage-feedbacks" icon={<Bell className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Feedback</span>
                </RailLink>
                <RailLink to="/admin/manage-complaints" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Complaints</span>
                </RailLink>
              </div>
            )}

            {/* Operations Management */}
            <AccordionHeader
              title="Operations Management"
              isOpen={open.ops}
              onToggle={() => setOpen((s) => ({ ...s, ops: !s.ops }))}
            />
            {open.ops && (
              <div className="px-3 pb-2">
                <RailLink to="/admin/manage-users" icon={<Users className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Users</span>
                </RailLink>
                <RailLink to="/admin/finance" icon={<Wallet className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Finance</span>
                </RailLink>
                <RailLink to="/admin/manage-bookings" icon={<CalendarDays className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Bookings</span>
                </RailLink>
              </div>
            )}

            {/* Reports */}
            <AccordionHeader
              title="Reports"
              isOpen={open.reports}
              onToggle={() => setOpen((s) => ({ ...s, reports: !s.reports }))}
            />
            {open.reports && (
              <div className="px-3 pb-2">
                <RailLink to="/admin/reports" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">All Reports</span>
                </RailLink>
              </div>
            )}

            {/* Account Settings */}
            <AccordionHeader
              title="Account Settings"
              isOpen={open.account}
              onToggle={() => setOpen((s) => ({ ...s, account: !s.account }))}
              last
            />
            {open.account && (
              <div className="px-3 pb-3">
                <RailLink to="/profile/settings" icon={<Settings className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Profile Settings</span>
                </RailLink>
              </div>
            )}
          </div>
        </aside>

        {/* ===== Main content (Tours list) ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Content</span> · Tours
              </h2>
              <p className="text-sm text-neutral-500">Manage your tour packages</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search id, name, type, description…"
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

              <Link
                to="/admin/tour-packages/new"
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
              >
                <Plus size={16} /> New
              </Link>

              <Link
                to="/reports/tour-packages"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="Download report"
              >
                <FileDown className="h-4 w-4" />
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
                {TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <span className="text-xs text-neutral-500">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} shown`}
            </span>
          </div>

          {/* Grid (3 in a row like you wanted) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
            {!loading && filtered.map((p) => (
              <article
                key={p._id || p.tourPakage_ID}
                className="group border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 rounded-none"
              >
                {/* Image */}
                <div className="relative h-44 bg-neutral-100">
                  {Array.isArray(p.images) && p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/600x300?text=No+Image'; }}
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-neutral-400 text-sm">No Image</div>
                  )}

                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 px-2 py-1 text-[11px] border border-neutral-200 rounded-none">
                    <Tag className="h-3.5 w-3.5" /> {p.type}
                  </div>
                </div>

                {/* Body */}
                <div className="p-3">
                  <h3 className="font-semibold text-neutral-900 line-clamp-1">{p.name}</h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 h-8 mt-1">{p.description || "—"}</p>

                  {/* Price / Duration */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-neutral-900">LKR {Number(p.price ?? 0).toFixed(2)}</div>
                    <div className="inline-flex items-center gap-1 text-xs text-neutral-600">
                      <Clock className="h-3.5 w-3.5" /> {p.duration || "—"}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-600">
                    <span className="inline-flex items-center gap-1"><Hotel className="h-3.5 w-3.5" /> {p.accommodations?.length || 0} acc</span>
                    <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {p.vehicles?.length || 0} veh</span>
                    <span className="inline-flex items-center gap-1"><Utensils className="h-3.5 w-3.5" /> {p.meals?.length || 0} meals</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between">
                    <Link
                      to={`/tour-packages/${encodeURIComponent(p.tourPakage_ID)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-200 hover:bg-neutral-50 rounded-none"
                      title="View"
                    >
                      <Eye className="h-4 w-4" /> View
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/tour-packages/${encodeURIComponent(p.tourPakage_ID)}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-neutral-900 hover:bg-neutral-800 rounded-none"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </Link>
                      <button
                        onClick={() => onDelete(p.tourPakage_ID, p.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-none"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {!loading && filtered.length === 0 && (
              <div className="col-span-full text-center text-neutral-500 py-12">No tour packages found.</div>
            )}

            {loading && (
              <div className="col-span-full text-center text-neutral-500 py-12">Loading packages…</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ===== Sidebar bits (same as AdminDashboard; cursor-pointer) ===== */

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
