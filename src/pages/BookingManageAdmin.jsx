// src/pages/BookingManageAdmin.jsx
import { useEffect, useMemo, useState } from "react";
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
  Calendar,
  User,
  Mail,
  Phone,
  ClipboardList,
  Wallet,
  Clock,
} from "lucide-react";

/* ===== Theme tokens (match your app) ===== */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ===== Backend base ===== */
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

/* ===== API helpers ===== */
const BookingAPI = {
  list: () => api.get("/api/bookings"),
  get: (id) => api.get(`/api/bookings/${id}`),
  update: (id, payload) => api.put(`/api/bookings/${id}`, payload),
  remove: (id) => api.delete(`/api/bookings/${id}`),
};

/* ===== Booking status helpers ===== */
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

/* ===== Page ===== */
export default function BookingManageAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState(""); // search text
  const [status, setStatus] = useState(""); // '', 'pending', 'confirmed'...
  const [from, setFrom] = useState(""); // ISO date string
  const [to, setTo] = useState("");   // ISO date string

  // detail/edit modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [editStatus, setEditStatus] = useState("pending");
  const [adminNote, setAdminNote] = useState("");

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

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();

    const inDateRange = (createdAt) => {
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

    return rows.filter((b) => {
      const matchStatus = !status || String(b.status || "").toLowerCase() === status;
      const hay = [
        b.bookingId,
        b.customer?.name,
        b.customer?.email,
        b.customer?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchText = !t || hay.includes(t);
      const matchDate = inDateRange(b.createdAt);
      return matchStatus && matchText && matchDate;
    });
  }, [rows, q, status, from, to]);

  const totalAmount = (b) =>
    (b?.totals?.grandTotal ??
      b?.total ??
      b?.amount ??
      (Array.isArray(b?.items)
        ? b.items.reduce((s, it) => s + Number(it.total || it.price || 0), 0)
        : 0));

  const openModal = async (row) => {
    try {
      // refresh one (in case it changed)
      const res = await BookingAPI.get(row._id || row.bookingId);
      const doc = res?.data?.booking || res?.data || row;
      setActive(doc);
      setEditStatus(String(doc?.status || "pending"));
      setAdminNote(doc?.adminNote || "");
      setOpen(true);
    } catch {
      setActive(row);
      setEditStatus(String(row?.status || "pending"));
      setAdminNote(row?.adminNote || "");
      setOpen(true);
    }
  };

  async function save() {
    if (!active?._id && !active?.bookingId) return;
    try {
      await BookingAPI.update(active._id || active.bookingId, {
        status: editStatus,
        adminNote,
      });
      toast.success("Booking updated");
      setOpen(false);
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  async function remove(id, code) {
    if (!window.confirm(`Delete booking ${code || id}? This cannot be undone.`)) return;
    try {
      await BookingAPI.remove(id);
      toast.success("Booking deleted");
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  const sumGross = useMemo(
    () => filtered.reduce((s, b) => s + Number(totalAmount(b)), 0),
    [filtered]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight">
            <span className={gradText}>Admin</span> · Bookings
          </h2>
          <p className="text-sm text-neutral-500">
            Review bookings, update status, and monitor revenue.
          </p>
          <p className="text-[10px] text-neutral-400 mt-1">
            API: <span className="font-mono">{BASE}/api/bookings</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
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
        </div>
      </div>

      {/* Filters & stats */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600 w-16">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600 w-16">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600 w-16">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          />
        </div>

        <div className="rounded-xl border bg-white p-3 flex items-center justify-between">
          <div className="text-xs text-neutral-500">Gross (filtered)</div>
          <div className="text-sm font-semibold">LKR {Number(sumGross || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <span className="text-sm font-medium text-neutral-700">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} bookings`}
          </span>
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
                    <tr key={id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium text-neutral-800">{b.bookingId || "—"}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-neutral-800">
                          {b.customer?.name || "—"}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {b.customer?.email || "—"} · {b.customer?.phone || "—"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-neutral-700">{itemSummary}</div>
                      </td>
                      <td className="p-3">LKR {Number(amt).toFixed(2)}</td>
                      <td className="p-3">
                        <StatusBadge value={b.status} />
                      </td>
                      <td className="p-3">
                        {b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                            onClick={() => openModal(b)}
                            title="View / Edit"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                            onClick={() => remove(b._id || b.bookingId, b.bookingId)}
                            title="Delete"
                          >
                            <Trash2 size={18} />
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

      {/* View / Edit modal */}
      {open && active && (
        <Modal onClose={() => setOpen(false)}>
          <div className={`w-full max-w-3xl rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <div className="font-semibold">Booking Details</div>
                <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Basic */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoRow icon={<ClipboardList className="h-4 w-4" />} label="Booking">
                    {active.bookingId || active._id || "—"}
                  </InfoRow>
                  <InfoRow icon={<Wallet className="h-4 w-4" />} label="Amount">
                    LKR {Number(totalAmount(active)).toFixed(2)}
                  </InfoRow>
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Created">
                    {active.createdAt ? new Date(active.createdAt).toLocaleString() : "—"}
                  </InfoRow>
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Updated">
                    {active.updatedAt ? new Date(active.updatedAt).toLocaleString() : "—"}
                  </InfoRow>
                </div>

                {/* Customer */}
                <div className="rounded-xl border p-3">
                  <div className="text-sm font-medium mb-2">Customer</div>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <InfoRow icon={<User className="h-4 w-4" />} label="Name">
                      {active.customer?.name || "—"}
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
                            {capitalize(it.type)} · {it.name || it.refName || it.refId}
                          </div>
                          <div>LKR {Number(it.total || it.price || 0).toFixed(2)}</div>
                        </div>
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
                      className="w-full mt-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
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
                      className="w-full mt-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      placeholder="Internal note…"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    onClick={save}
                    className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90`}
                  >
                    Save
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

/* ===== UI bits ===== */
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

/* ===== helpers ===== */
function capitalize(s = "") {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function summarizeItems(items = []) {
  if (!items.length) return "—";
  const counts = items.reduce((acc, it) => {
    const t = String(it.type || "item");
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([k, v]) => `${capitalize(k)} × ${v}`)
    .join(", ");
}
