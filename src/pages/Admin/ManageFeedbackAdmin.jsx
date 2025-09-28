// src/pages/Admin/ManageFeedbackAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Search,
  RefreshCcw,
  Eye,
  Trash2,
  X,
  Mail,
  User,
  Star,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  FileText,
  BarChart3,
  Bell,
  Package,
  Settings,
} from "lucide-react";
import { confirmToast } from "../../components/ConfirmToast";

/* ===== Theme (green, match other admin pages) ===== */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ===== Persisted sidebar state key ===== */
const LS_KEY = "adminSidebarOpen";

/* ---- Backend base ---- */
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

/* -------- API helpers -------- */
const FeedbackAPI = {
  list: () => api.get("/api/feedbacks"),
  get: (id) => api.get(`/api/feedbacks/${id}`),
  remove: (id) => api.delete(`/api/feedbacks/${id}`),
};

/* ---------- Page ---------- */
export default function ManageFeedbackAdmin() {
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
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch {}
  }, [open]);

  // filters/search
  const [q, setQ] = useState("");
  const [ratingFilter, setRatingFilter] = useState(""); // "", "1"..."5"

  // view modal (read-only)
  const [openView, setOpenView] = useState(false);
  const [active, setActive] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await FeedbackAPI.list();
      const arr = Array.isArray(res?.data) ? res.data : res?.data?.feedbacks || [];
      setRows(arr);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((f) => {
      const matchText =
        !t ||
        [f.name, f.email, f.message]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(t);
      const matchRating = !ratingFilter || String(f.rating) === String(ratingFilter);
      return matchText && matchRating;
    });
  }, [rows, q, ratingFilter]);

  const avgRating = useMemo(() => {
    if (!rows.length) return 0;
    const sum = rows.reduce((s, r) => s + Number(r.rating || 0), 0);
    return (sum / rows.length).toFixed(2);
  }, [rows]);

  function openViewModal(doc) {
    setActive(doc);
    setOpenView(true);
  }

  // UPDATED: use confirmToast for deletion
  async function remove(id) {
    const ok = await confirmToast({
      title: "Delete this feedback?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await FeedbackAPI.remove(id);
      toast.success("Feedback deleted");
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (same pattern as other pages) ===== */}
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

        {/* ===== Main content ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Admin</span> · Feedback
              </h2>
              <p className="text-sm text-neutral-500">
                Review customer feedback, compute averages, and maintain quality.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search name/email/message…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>

              {/* Refresh */}
              <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="Refresh"
                disabled={loading}
              >
                <RefreshCcw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat title="Total feedback" value={rows.length} />
            <Stat title="Average rating" value={rows.length ? `${avgRating} / 5` : "—"} />
            <Stat title="5★ share" value={`${share(rows, 5)}%`} />
            <Stat title="1★ share" value={`${share(rows, 1)}%`} />
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
            >
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>

            <span className="text-xs text-neutral-500">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} feedback`}
            </span>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">
                {loading ? "Loading…" : `${filtered.length} of ${rows.length} feedback`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Message</th>
                    <th className="text-left p-3">Rating</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    filtered.map((f) => (
                      <tr key={f._id} className="border-t">
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-neutral-800">{f.name || "—"}</span>
                            <span className="text-xs text-neutral-500">{f.email || "—"}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="line-clamp-2 max-w-[46ch] text-neutral-700">{f.message || "—"}</div>
                        </td>
                        <td className="p-3">
                          <StarRow value={Number(f.rating) || 0} />
                        </td>
                        <td className="p-3">
                          {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                              onClick={() => openViewModal(f)}
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                              onClick={() => remove(f._id)}
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td className="p-8 text-center text-neutral-500" colSpan={5}>
                        No feedback found.
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td className="p-8 text-center text-neutral-500" colSpan={5}>
                        Loading feedback…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* View modal (read-only) */}
      {openView && active && (
        <Modal onClose={() => setOpenView(false)}>
          <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <div className="font-semibold">Feedback Details</div>
                <button
                  className="p-2 rounded-lg hover:bg-neutral-100"
                  onClick={() => setOpenView(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <Row label="Name" icon={<User className="h-4 w-4" />}>
                  {active.name || "—"}
                </Row>
                <Row label="Email" icon={<Mail className="h-4 w-4" />}>
                  {active.email || "—"}
                </Row>

                <div>
                  <label className="text-sm text-neutral-600">Message (read-only)</label>
                  <Textarea rows={5} value={active.message || ""} readOnly disabled />
                </div>

                <div>
                  <label className="text-sm text-neutral-600">Rating</label>
                  <div className="mt-1">
                    <StarRow value={Number(active.rating) || 0} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-neutral-600">Created</label>
                    <input
                      readOnly
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50"
                      value={active.createdAt ? new Date(active.createdAt).toLocaleString() : "—"}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-neutral-600">Updated</label>
                    <input
                      readOnly
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50"
                      value={active.updatedAt ? new Date(active.updatedAt).toLocaleString() : "—"}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                    onClick={() => setOpenView(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Sidebar bits ---------- */
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

/* ---------- Small UI helpers ---------- */
function Textarea(props) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "placeholder:text-neutral-400 text-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30",
        props.disabled ? "bg-neutral-50 text-neutral-600" : "",
      ].join(" ")}
    />
  );
}
function Modal({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-[1001] w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
function Row({ label, icon, children }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-1 text-sm text-neutral-600 inline-flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="col-span-2 text-sm">{children}</div>
    </div>
  );
}
function StarRow({ value = 0 }) {
  const n = Math.max(0, Math.min(5, Number(value)));
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={"h-4 w-4 " + (i < n ? "fill-current" : "")} />
      ))}
      <span className="ml-1 text-xs text-neutral-700">{n}/5</span>
    </div>
  );
}
function Stat({ title, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-neutral-500">{title}</div>
      <div className={`mt-1 text-lg font-semibold ${gradText}`.replace("text-transparent ", "")}>
        <span className={gradText}>{value}</span>
      </div>
    </div>
  );
}

/* ---------- tiny util ---------- */
function share(rows, stars) {
  const n = rows.length;
  if (!n) return 0;
  const count = rows.filter((r) => Number(r.rating) === Number(stars)).length;
  return Math.round((count / n) * 100);
}
