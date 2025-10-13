// src/pages/MyBookings.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Search,
  RefreshCcw,
  Eye,
  CalendarDays,
  User,
  Mail,
  Phone,
  ClipboardList,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  Settings,
  CalendarCheck2,
  History,
  MessageSquareText,
  MessagesSquare,
  PhoneCall,
  AlertCircle,
  MapPin,
  UtensilsCrossed,
  Hotel,
  Truck,
  FileText,
  Download,
  Filter,
} from "lucide-react";
import { NavLink } from "react-router-dom";

/* ---- Theme tokens (green, same as other customer pages) ---- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ---- Persisted sidebar state key ---- */
const LS_KEY = "customerSidebarOpen";

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

/* ---- API ---- */
const BookingAPI = {
  list: () => api.get("/api/bookings"),
  get: (id) => api.get(`/api/bookings/${id}`),
  update: (id, payload) => api.put(`/api/bookings/${id}`, payload),
  remove: (id) => api.delete(`/api/bookings/${id}`),
};

/* ---- Helpers ---- */
function decodeJwt() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return {
      email: payload?.email || "",
      firstName: payload?.firstName || "",
      lastName: payload?.lastName || "",
    };
  } catch {
    return null;
  }
}

const STATUSES = ["pending", "confirmed", "cancelled", "completed"];

function StatusBadge({ value }) {
  const v = String(value || "").toLowerCase();
  const cls =
    v === "confirmed"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : v === "cancelled"
      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
      : v === "completed"
      ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  const Icon =
    v === "confirmed" ? CheckCircle2 : v === "cancelled" ? AlertTriangle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${cls}`}>
      <Icon className="h-4 w-4" />
      {v || "pending"}
    </span>
  );
}

/* ---- Page ---- */
export default function MyBookings() {
  // Sidebar accordions (persisted)
  const [open, setOpen] = useState({
    overview: true,
    bookings: true,
    payments: true,
    support: true,
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setOpen((s) => ({
          overview: typeof parsed.overview === "boolean" ? parsed.overview : s.overview,
          bookings: typeof parsed.bookings === "boolean" ? parsed.bookings : s.bookings,
          payments: typeof parsed.payments === "boolean" ? parsed.payments : s.payments,
          support: typeof parsed.support === "boolean" ? parsed.support : s.support,
        }));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch {}
  }, [open]);

  const user = decodeJwt();
  const myEmail = user?.email || "";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // search & filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // view modal
  const [openView, setOpenView] = useState(false);
  const [active, setActive] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await BookingAPI.list();
      const arr = Array.isArray(res?.data) ? res.data : res?.data?.bookings || [];
      setRows(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load bookings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // only my bookings (client-side filter)
  const mine = useMemo(
    () => rows.filter((b) => (b.customer?.email || "").toLowerCase() === myEmail.toLowerCase()),
    [rows, myEmail]
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return mine
      .filter((b) => (!statusFilter ? true : String(b.status || "").toLowerCase() === statusFilter))
      .filter((b) => {
        if (!dateFrom && !dateTo) return true;
        const created = new Date(b.createdAt || 0);
        if (dateFrom && created < new Date(dateFrom)) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (created > end) return false;
        }
        return true;
      })
      .filter((b) => {
        if (!t) return true;
        const hay = [
          b.bookingId,
          b.customer?.name,
          b.customer?.email,
          b.customer?.phone,
          b.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(t);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [mine, q, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = mine.length;
    const confirmed = mine.filter((b) => String(b.status || "").toLowerCase() === "confirmed").length;
    const pending = mine.filter((b) => String(b.status || "").toLowerCase() === "pending").length;
    const cancelled = mine.filter((b) => String(b.status || "").toLowerCase() === "cancelled").length;
    const completed = mine.filter((b) => String(b.status || "").toLowerCase() === "completed").length;
    return { total, confirmed, pending, cancelled, completed };
  }, [mine]);

  const totalAmount = (b) =>
    (b?.totals?.grandTotal ??
      b?.total ??
      b?.amount ??
      (Array.isArray(b?.items)
        ? b.items.reduce((s, it) => s + Number(it.total || it.price || 0), 0)
        : 0));

  const totalSpent = useMemo(
    () => mine.reduce((s, b) => s + Number(totalAmount(b) || 0), 0),
    [mine]
  );

  function openViewModal(booking) {
    setActive(booking);
    setOpenView(true);
  }

  if (!user?.email) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <Toaster position="top-right" />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="rounded-xl border bg-white p-6 text-center">
            <h2 className="text-lg font-semibold mb-1">Sign in required</h2>
            <p className="text-sm text-neutral-600">Please sign in to view your bookings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (same style as other customer pages) ===== */}
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
                <RailLink to="/customer" icon={<LayoutDashboard className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Dashboard</span>
                </RailLink>
                <RailLink to="/profile/settings-cus" icon={<Settings className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Account Settings</span>
                </RailLink>
              </div>
            )}

            {/* Feedbacks & Complaints */}
            <AccordionHeader
              title="Feedbacks & Complaints"
              isOpen={open.payments}
              onToggle={() => setOpen((s) => ({ ...s, payments: !s.payments }))}
            />
            {open.payments && (
              <div className="px-3 pb-2">
                <RailLink to="/account/feedbacks" icon={<MessageSquareText className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">My Feedbacks</span>
                </RailLink>
                <RailLink to="/account/complaints" icon={<AlertCircle className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">My Complaints</span>
                </RailLink>
              </div>
            )}

            {/* Bookings */}
            <AccordionHeader
              title="Bookings"
              isOpen={open.bookings}
              onToggle={() => setOpen((s) => ({ ...s, bookings: !s.bookings }))}
            />
            {open.bookings && (
              <div className="px-3 pb-2">
                <RailLink to="/bookings" icon={<CalendarCheck2 className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">My Bookings</span>
                </RailLink>
              </div>
            )}

            {/* Support */}
            <AccordionHeader
              title="Support"
              isOpen={open.support}
              onToggle={() => setOpen((s) => ({ ...s, support: !s.support }))}
              last
            />
            {open.support && (
              <div className="px-3 pb-3">
                <RailLink to="/support/chat" icon={<MessagesSquare className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Chat with Support</span>
                </RailLink>
                <RailLink to="/support/emergency" icon={<PhoneCall className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Emergency Contacts</span>
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
                <span className={gradText}>My</span> Bookings
              </h2>
              <p className="text-sm text-neutral-500">
                View and manage your tour bookings and reservations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search my bookings…"
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
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat title="Total bookings" value={stats.total} />
            <Stat title="Confirmed" value={stats.confirmed} />
            <Stat title="Pending" value={stats.pending} />
            <Stat title="Total spent" value={`LKR ${totalSpent.toLocaleString()}`} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
            >
              <option value="">All status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              placeholder="From date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
              placeholder="To date"
            />
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">
                {loading ? "Loading…" : `${filtered.length} of ${mine.length} bookings`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="text-left p-3">Booking ID</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Amount</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    filtered.map((b) => (
                      <tr key={b._id} className="border-t hover:bg-neutral-50/60">
                        <td className="p-3">
                          <div className="font-medium text-neutral-800">
                            {b.bookingId || b._id || "—"}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="font-medium text-neutral-800">
                              {b.customer?.name || "—"}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {b.customer?.email || "—"}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <StatusBadge value={b.status} />
                        </td>
                        <td className="p-3">
                          <div className="font-medium">
                            LKR {Number(totalAmount(b)).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-3">
                          {b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                              onClick={() => openViewModal(b)}
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td className="p-8 text-center text-neutral-500" colSpan={6}>
                        {mine.length
                          ? "No bookings match your search/filters."
                          : "You haven't made any bookings yet."}
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td className="p-8 text-center text-neutral-500" colSpan={6}>
                        Loading…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* View modal */}
          {openView && active && (
            <Modal onClose={() => setOpenView(false)}>
              <div className={`w-full max-w-4xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
                <div className="rounded-2xl bg-white">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                    <div className="font-semibold">Booking Details</div>
                    <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpenView(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-4 space-y-6">
                    {/* Customer Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Row label="Booking ID" icon={<FileText className="h-4 w-4" />}>
                        {active.bookingId || active._id || "—"}
                      </Row>
                      <Row label="Status" icon={<Clock className="h-4 w-4" />}>
                        <StatusBadge value={active.status} />
                      </Row>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Row label="Name" icon={<User className="h-4 w-4" />}>
                        {active.customer?.name || "—"}
                      </Row>
                      <Row label="Email" icon={<Mail className="h-4 w-4" />}>
                        {active.customer?.email || "—"}
                      </Row>
                      <Row label="Phone" icon={<Phone className="h-4 w-4" />}>
                        {active.customer?.phone || "—"}
                      </Row>
                    </div>

                    {/* Booking Items */}
                    {Array.isArray(active.items) && active.items.length > 0 && (
                      <div>
                        <label className="text-sm text-neutral-600 mb-2 block">Booking Items</label>
                        <div className="space-y-2">
                          {active.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                              <div>
                                <div className="font-medium">{item.name || item.title || "Item"}</div>
                                <div className="text-sm text-neutral-600">
                                  {item.quantity && `Qty: ${item.quantity}`}
                                  {item.type && ` • ${item.type}`}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  LKR {Number(item.total || item.price || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-neutral-600">Total Amount</label>
                        <div className="mt-1 text-lg font-semibold">
                          LKR {Number(totalAmount(active)).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-neutral-600">Created</label>
                        <div className="mt-1">
                          {active.createdAt ? new Date(active.createdAt).toLocaleString() : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Admin Note */}
                    {active.adminNote && (
                      <div>
                        <label className="text-sm text-neutral-600">Admin Note</label>
                        <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                          {active.adminNote}
                        </div>
                      </div>
                    )}

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
        </main>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */
function Modal({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-[1001] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
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

function Stat({ title, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-neutral-500">{title}</div>
      <div className="mt-1 text-lg font-semibold">
        <span className={gradText}>{value}</span>
      </div>
    </div>
  );
}

/* ===== Sidebar bits (shared style) ===== */
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
