// src/pages/Admin/BookingManageAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Search,
  RefreshCcw,
  Eye,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  CalendarDays as CalendarIcon,
  Calendar,
  User,
  Mail,
  Phone,
  ClipboardList,
  Wallet,
  Clock,
  ChevronRight,
  LayoutDashboard,
  Users,
  Wallet as WalletIcon,
  CalendarDays,
  FileText,
  BarChart3,
  Download,
  Filter,
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
import { NavLink } from "react-router-dom";
import { confirmToast } from "../../components/ConfirmToast";

/* ---------- Theme (GREEN like ManageInventoryAdmin) ---------- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ---------- Persisted sidebar accordion ---------- */
const LS_KEY = "adminSidebarOpen";

/* ---------- Backend base ---------- */
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

/* ---------- API helpers ---------- */
const BookingAPI = {
  list: () => api.get("/api/bookings"),
  get: (id) => api.get(`/api/bookings/${id}`),
  update: (id, payload) => api.put(`/api/bookings/${id}`, payload),
  remove: (id) => api.delete(`/api/bookings/${id}`),
};

/* ---------- Status helpers ---------- */
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

/* ---------- Page ---------- */
export default function BookingManageAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Sidebar accordions (persisted) */
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

  /* Tabs like ManageInventoryAdmin */
  const [tab, setTab] = useState("Overview"); // Overview | Lists | Activity | Settings

  /* filters (persisted) */
  const [q, setQ] = useState(localStorage.getItem("bk_q") || "");
  const [status, setStatus] = useState(localStorage.getItem("bk_status") || "All");
  const [from, setFrom] = useState(localStorage.getItem("bk_from") || "");
  const [to, setTo] = useState(localStorage.getItem("bk_to") || "");
  useEffect(() => {
    localStorage.setItem("bk_q", q);
    localStorage.setItem("bk_status", status);
    localStorage.setItem("bk_from", from);
    localStorage.setItem("bk_to", to);
  }, [q, status, from, to]);

  /* detail/edit modal */
  const [openModal, setOpenModal] = useState(false);
  const [active, setActive] = useState(null);
  const [editStatus, setEditStatus] = useState("pending");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await BookingAPI.list();
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.bookings || []);
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const withinRange = (createdAt) => {
    if (!createdAt) return true;
    const d = new Date(createdAt);
    if (from && d < new Date(from)) return false;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((b) => {
      const matchStatus = status === "All" || String(b.status || "").toLowerCase() === status;
      const hay = [b.bookingId, b.customer?.name, b.customer?.email, b.customer?.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchText = !t || hay.includes(t);
      const matchDate = withinRange(b.createdAt);
      return matchStatus && matchText && matchDate;
    });
  }, [rows, q, status, from, to]);

  const totalAmount = (b) =>
    (b?.grandTotal ??
      b?.totals?.grandTotal ??
      b?.total ??
      b?.amount ??
      (Array.isArray(b?.items)
        ? b.items.reduce((s, it) => s + Number(it.lineTotal || it.total || it.price || 0), 0)
        : 0));

  const sumGross = useMemo(
    () => filtered.reduce((s, b) => s + Number(totalAmount(b) || 0), 0),
    [filtered]
  );

  const statusCounts = useMemo(() => {
    const c = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
    rows.forEach((r) => (c[String(r.status || "pending").toLowerCase()] += 1));
    return c;
  }, [rows]);

  const openDrawer = async (row) => {
    try {
      const res = await BookingAPI.get(row._id || row.bookingID || row.bookingId);
      const doc = res?.data?.booking || res?.data || row;
      setActive(doc);
      setEditStatus(String(doc?.status || "pending"));
      setAdminNote(doc?.adminNote || "");
      setOpenModal(true);
    } catch {
      setActive(row);
      setEditStatus(String(row?.status || "pending"));
      setAdminNote(row?.adminNote || "");
      setOpenModal(true);
    }
  };

  async function save() {
    if (!active?._id && !active?.bookingID && !active?.bookingId) return;
    try {
      setSaving(true);
      await BookingAPI.update(active._id || active.bookingID || active.bookingId, { status: editStatus, adminNote });
      toast.success("Booking updated");
      setOpenModal(false);
      await load();
    } catch {
      /* handled by interceptor */
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row) {
    const code = row.bookingID || row.bookingId || row._id;
    const ok = await confirmToast({
      title: "Delete Booking",
      message: `Delete booking ${code}? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      position: "top-right",
    });
    if (!ok) return;
    try {
      await BookingAPI.remove(row._id || row.bookingID || row.bookingId);
      toast.success("Booking deleted");
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  function exportCSV() {
    if (!filtered.length) return toast.error("Nothing to export");
    const cols = [
      "bookingId",
      "customerName",
      "customerEmail",
      "customerPhone",
      "status",
      "amount",
      "createdAt",
      "updatedAt",
      "_id",
      "itemsCount",
    ];
    const header = cols.join(",");
    const lines = filtered.map((b) => {
      const vals = [
        b.bookingId || "",
        b.customer?.name || "",
        b.customer?.email || "",
        b.customer?.phone || "",
        b.status || "",
        Number(totalAmount(b) || 0).toFixed(2),
        b.createdAt ? new Date(b.createdAt).toISOString() : "",
        b.updatedAt ? new Date(b.updatedAt).toISOString() : "",
        b._id || "",
        Array.isArray(b.items) ? b.items.length : 0,
      ];
      return vals.map(csvEsc).join(",");
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (VehiclePage-style) ===== */}
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

        {/* ===== Main content (right column) ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Admin</span> · Bookings
              </h2>
              <p className="text-sm text-neutral-500">Review bookings, update status, export CSV.</p>
              <p className="text-[10px] text-neutral-400 mt-1">
                API: <span className="font-mono">{BASE}/api/bookings</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search bookingId, name, email…"
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

              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              {/* Report */}
              <Link
                to="/reports/bookings"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="View booking reports"
              >
                <BarChart3 className="h-4 w-4" />
                Report
              </Link>
            </div>
          </div>

          {/* Top tabs */}
          <div className={`${CARD} p-3`}>
            <div className="flex flex-wrap gap-2">
              <TopTab active={tab === "Overview"} onClick={() => setTab("Overview")}>
                Overview
              </TopTab>
              <TopTab active={tab === "Lists"} onClick={() => setTab("Lists")}>
                Lists
              </TopTab>
              <TopTab active={tab === "Activity"} onClick={() => setTab("Activity")}>
                Activity Logs
              </TopTab>
              <TopTab active={tab === "Settings"} onClick={() => setTab("Settings")}>
                Settings
              </TopTab>
            </div>
          </div>

          {/* ===== Overview ===== */}
          {tab === "Overview" && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCardBig label="Total Bookings" value={rows.length} />
                <StatCardBig label="Pending" value={statusCounts.pending} />
                <StatCardBig label="Confirmed" value={statusCounts.confirmed} />
                <StatCardBig label="Cancelled" value={statusCounts.cancelled} />
                <StatCardBig label="Completed" value={statusCounts.completed} />
              </div>

              <div className={`${CARD} p-4`}>
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium mb-2">By Status (count)</div>
                    <BookingStatusBars rows={rows} />
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium">Gross Revenue (filtered)</div>
                    <div className="text-2xl font-semibold mt-1">LKR {sumGross.toFixed(2)}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Adjust filters in Lists to recalc gross.
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border p-3 grid sm:grid-cols-2 gap-3">
                  <DateInput label="From" value={from} onChange={setFrom} />
                  <DateInput label="To" value={to} onChange={setTo} />
                </div>
              </div>
            </>
          )}

          {/* ===== Lists (table) ===== */}
          {tab === "Lists" && (
            <>
              {/* Controls */}
              <div className={`${CARD} p-3`}>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                      <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                      <input
                        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                        placeholder="Search bookingId, name, email…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <FilterChip
                      label="Status"
                      value={status}
                      onChange={setStatus}
                      options={["All", ...STATUSES]}
                    />
                    <DateInput label="From" value={from} onChange={setFrom} />
                    <DateInput label="To" value={to} onChange={setTo} />
                    <button
                      onClick={exportCSV}
                      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
                    >
                      <Download className="h-4 w-4" /> Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                  <span className="text-sm font-medium text-neutral-700">
                    {loading ? "Loading…" : `${filtered.length} of ${rows.length} bookings`}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full border px-3 py-1.5 text-xs bg-neutral-50">
                      Gross: <span className="font-semibold">LKR {sumGross.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-600">
                      <tr>
                        <th className="text-left p-3">Booking</th>
                        <th className="text-left p-3">Customer</th>
                        <th className="text-left p-3">Items</th>
                        <th className="text-left p-3">Amount</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Created</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading &&
                        filtered.map((b) => {
                          const id = b._id || b.bookingId;
                          const amt = totalAmount(b);
                          const items = Array.isArray(b.items) ? b.items : [];
                          const itemSummary = summarizeItems(items);
                          return (
                            <tr key={id} className="border-t hover:bg-neutral-50/60">
                              <td className="p-3">
                                <div className="font-medium text-neutral-800">{b.bookingID || b.bookingId || "—"}</div>
                              </td>
                              <td className="p-3">
                                <div className="text-neutral-800">
                                  {b.customer?.firstName && b.customer?.lastName 
                                    ? `${b.customer.firstName} ${b.customer.lastName}`
                                    : b.customer?.name || "—"}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {b.customer?.email || "—"} · {b.customer?.phone || "—"}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="text-neutral-700">{itemSummary}</div>
                              </td>
                              <td className="p-3">LKR {Number(amt || 0).toFixed(2)}</td>
                              <td className="p-3">
                                <StatusBadge value={b.status} />
                              </td>
                              <td className="p-3">
                                {b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    className="px-2 py-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"
                                    onClick={() => openDrawer(b)}
                                    title="View / Edit"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="px-3 py-1.5 rounded-full border border-rose-200 text-rose-600 bg-white hover:bg-rose-50"
                                    onClick={() => removeRow(b)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4 inline-block mr-1" />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {!loading && filtered.length === 0 && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={7}>
                            No bookings found.
                          </td>
                        </tr>
                      )}

                      {loading && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={7}>
                            Loading bookings…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ===== Activity ===== */}
          {tab === "Activity" && (
            <div className={CARD}>
              <div className="p-4 border-b">
                <div className="font-medium">Recent Activity</div>
                <p className="text-xs text-neutral-500">Created & updated timestamps.</p>
              </div>
              <ul className="divide-y">
                {rows.slice(0, 25).map((b) => (
                  <li key={b._id || b.bookingID || b.bookingId} className="p-4 text-sm">
                    <span className="font-medium">{b.bookingID || b.bookingId || b._id}</span>
                    <span className="text-neutral-500"> — {
                      b.customer?.firstName && b.customer?.lastName 
                        ? `${b.customer.firstName} ${b.customer.lastName}`
                        : b.customer?.name || "—"
                    } </span>
                    <span className="text-neutral-500">· status </span>
                    <span className="inline-flex items-center gap-1"><StatusBadge value={b.status} /></span>
                    <span className="text-neutral-500"> · created </span>
                    <span>{b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}</span>
                    <span className="text-neutral-500"> · updated </span>
                    <span>{b.updatedAt ? new Date(b.updatedAt).toLocaleString() : "—"}</span>
                  </li>
                ))}
                {rows.length === 0 && <li className="p-4 text-neutral-500 text-sm">No activity.</li>}
              </ul>
            </div>
          )}

          {/* ===== Settings ===== */}
          {tab === "Settings" && (
            <div className={CARD}>
              <div className="p-4 border-b">
                <div className="font-medium">Booking Settings</div>
                <p className="text-xs text-neutral-500">Display hints—wire to backend if needed.</p>
              </div>
              <div className="p-4 grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium">Cancellation Policy</div>
                  <p className="mt-2 text-sm text-neutral-600">Manage content elsewhere; shown here for context.</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium">Notifications</div>
                  <p className="mt-2 text-sm text-neutral-600">Send email updates on status changes.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* View / Edit modal (green styling) */}
      {openModal && active && (
        <Modal title="Booking Details" onClose={() => setOpenModal(false)}>
          <div className="space-y-5">
            {/* Basic */}
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow icon={<ClipboardList className="h-4 w-4" />} label="Booking">
                {active.bookingID || active.bookingId || active._id || "—"}
              </InfoRow>
              <InfoRow icon={<Wallet className="h-4 w-4" />} label="Amount">
                LKR {Number(totalAmount(active) || 0).toFixed(2)}
              </InfoRow>
              <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Created">
                {active.createdAt ? new Date(active.createdAt).toLocaleString() : "—"}
              </InfoRow>
              <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Updated">
                {active.updatedAt ? new Date(active.updatedAt).toLocaleString() : "—"}
              </InfoRow>
            </div>

            {/* Customer */}
            <div className="rounded-xl border p-3">
              <div className="text-sm font-medium mb-2">Customer</div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <InfoRow icon={<User className="h-4 w-4" />} label="Name">
                  {active.customer?.firstName && active.customer?.lastName 
                    ? `${active.customer.firstName} ${active.customer.lastName}`
                    : active.customer?.name || "—"}
                </InfoRow>
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email">
                  {active.customer?.email || "—"}
                </InfoRow>
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone">
                  {active.customer?.phone || "—"}
                </InfoRow>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-xl border p-3">
              <div className="text-sm font-medium mb-2">Items</div>
              <div className="space-y-2">
                {(active.items || []).map((it, i) => (
                  <div key={i} className="rounded-lg border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {capitalize(it.serviceType || it.type)} · {it.name || it.refName || it.refId}
                      </div>
                      <div>LKR {Number(it.lineTotal || it.total || it.price || 0).toFixed(2)}</div>
                    </div>
                    
                    {/* Tour Package Details */}
                    {it.serviceType === "TourPackage" && (
                      <div className="mt-2 space-y-1">
                        {it.duration && (
                          <div className="text-xs text-blue-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration: {it.duration}
                          </div>
                        )}
                        {it.startDate && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Start: {new Date(it.startDate).toLocaleDateString()}
                          </div>
                        )}
                        {it.endDate && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            End: {new Date(it.endDate).toLocaleDateString()}
                          </div>
                        )}
                        {it.qty && (
                          <div className="text-xs text-purple-600 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Passengers: {it.qty}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-neutral-600 mt-1">
                      {(it.meta && Object.keys(it.meta).length > 0) ? (
                        <pre className="whitespace-pre-wrap text-xs bg-neutral-50 border rounded p-2">
                          {JSON.stringify(it.meta, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs">No extra details</span>
                      )}
                    </div>
                  </div>
                ))}
                {(active.items || []).length === 0 && (
                  <div className="text-sm text-neutral-500">No items.</div>
                )}
              </div>
            </div>

            {/* Status & note */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-neutral-600">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-600">Admin note</label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                  placeholder="Internal note…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                onClick={() => setOpenModal(false)}
              >
                Close
              </button>
              <button
                onClick={save}
                disabled={saving}
                className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} disabled:opacity-60`}
              >
                {saving ? "Saving…" : "Save"}
              </button>
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
      <svg
        viewBox="0 0 24 24"
        className={["h-4 w-4 transition-transform text-neutral-500", isOpen ? "rotate-0" : "rotate-180"].join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
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

/* ---------- Small UI bits (green focus) ---------- */
function TopTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-1.5 text-sm border",
        active ? "bg-white shadow-sm border-transparent" : "bg-white hover:bg-neutral-50 border-neutral-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
function StatCardBig({ label, value }) {
  return (
    <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
      <div className="rounded-xl bg-white p-4 text-center">
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-neutral-500 mt-1">{label}</div>
      </div>
    </div>
  );
}
function FilterChip({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-neutral-600 inline-flex items-center gap-1">
        <Filter className="h-4 w-4" /> {label}
      </span>
      <select
        className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
function DateInput({ label, value, onChange }) {
  return (
    <div>
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="relative">
        <CalendarIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
        />
      </div>
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Frame */}
      <div
        className={`relative z-[1001] w-full max-w-3xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card */}
        <div className="rounded-2xl bg-white max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
            <div className="font-semibold">{title}</div>
            <button type="button" onClick={onClose} className="p-2 rounded-md hover:bg-neutral-100" aria-label="Close">
              <X className="h-5 w-5 text-neutral-700" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto overscroll-contain">{children}</div>
        </div>
      </div>
    </div>
  );
}
function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-neutral-600 inline-flex items-center gap-1 min-w-[88px]">
        {icon}
        {label}
      </span>
      <span className="text-neutral-800">{children}</span>
    </div>
  );
}

/* ---------- Bars ---------- */
function BookingStatusBars({ rows }) {
  const counts = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
  rows.forEach((r) => {
    const k = String(r.status || "pending").toLowerCase();
    counts[k] = (counts[k] || 0) + 1;
  });
  const order = ["pending", "confirmed", "cancelled", "completed"];
  const data = order.map((k) => ({ name: k, value: counts[k] || 0 }));
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2">
          <div className="w-28 text-xs text-neutral-600 capitalize">{d.name}</div>
          <div className="flex-1 h-3 bg-neutral-100 rounded">
            <div
              className="h-3 rounded"
              style={{ width: `${(d.value / max) * 100}%`, background: "linear-gradient(90deg,#09E65A,#16A34A)" }}
            />
          </div>
          <div className="w-8 text-right text-xs text-neutral-700">{d.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- helpers ---------- */
function capitalize(s = "") {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function summarizeItems(items = []) {
  if (!items.length) return "—";
  
  const tourItems = items.filter(it => it.serviceType === "TourPackage");
  const otherItems = items.filter(it => it.serviceType !== "TourPackage");
  
  let summary = [];
  
  // Add tour package details with duration
  if (tourItems.length > 0) {
    tourItems.forEach(tour => {
      const duration = tour.duration ? ` (${tour.duration})` : "";
      summary.push(`Tour Package${duration} × ${tour.qty || 1}`);
    });
  }
  
  // Add other items
  if (otherItems.length > 0) {
    const counts = otherItems.reduce((acc, it) => {
      const t = String(it.serviceType || it.type || "item");
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(counts).forEach(([k, v]) => {
      summary.push(`${capitalize(k)} × ${v}`);
    });
  }
  
  return summary.join(", ");
}
function csvEsc(s) {
  const q = String(s ?? "");
  return /[,"\n]/.test(q) ? `"${q.replace(/"/g, '""')}"` : q;
}
