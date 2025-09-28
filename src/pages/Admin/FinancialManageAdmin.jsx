// src/pages/Admin/FinancialManageAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Search,
  RefreshCcw,
  Plus,
  Pencil,
  Trash2,
  Download,
  Calendar,
  Filter,
  Wallet,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  X,
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

/* Attach token for Admin actions */
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

/* ===== API (align with your financeRoutes/controllers) ===== */
const FinanceAPI = {
  list: () => api.get("/api/finance/transactions"),
  create: (payload) => api.post("/api/finance/transactions", payload),
  update: (id, payload) => api.put(`/api/finance/transactions/${id}`, payload),
  remove: (id) => api.delete(`/api/finance/transactions/${id}`),
  summary: (from, to) =>
    api.get("/api/finance/summary", { params: { from, to } }),
};

/* ===== Model shape (typical from our earlier schema) =====
   {
     _id,
     txnId,               // optional
     date,                // ISO string
     type,                // "income" | "expense"
     category,            // e.g. "Tour Package", "Vehicle", "Accommodation", "Meal", "Other"
     method,              // "cash" | "card" | "bank_transfer" | "online"
     amount,              // number
     currency,            // default "LKR"
     reference,           // optional string (e.g., invoice/receipt/bookingId)
     notes,               // optional
   }
*/
const TYPES = ["income", "expense"];
const METHODS = ["cash", "card", "bank_transfer", "online"];
const CATEGORIES = [
  "Tour Package",
  "Vehicle",
  "Accommodation",
  "Meal",
  "Misc",
];

const EMPTY = {
  date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
  type: "income",
  category: "Tour Package",
  method: "cash",
  amount: "",
  currency: "LKR",
  reference: "",
  notes: "",
};

export default function FinancialManageAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all"); // all | income | expense
  const [from, setFrom] = useState(() => firstDayOfMonth());
  const [to, setTo] = useState(() => todayStr());
  const [cat, setCat] = useState("");

  // modal / form
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  // server summary (optional)
  const [serverSum, setServerSum] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await FinanceAPI.list();
      const list = Array.isArray(res?.data) ? res.data : res?.data || [];
      setRows(list);
      // try fetch summary (optional)
      try {
        const sres = await FinanceAPI.summary(from, to);
        if (sres?.data && typeof sres.data === "object") setServerSum(sres.data);
        else setServerSum(null);
      } catch {
        setServerSum(null);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-fetch summary when date range changes
  useEffect(() => {
    (async () => {
      try {
        const sres = await FinanceAPI.summary(from, to);
        setServerSum(sres?.data || null);
      } catch {
        setServerSum(null);
      }
    })();
  }, [from, to]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => (tab === "all" ? true : r.type === tab))
      .filter((r) => (!cat ? true : r.category === cat))
      .filter((r) => {
        // date range
        const d = (r.date || "").slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .filter((r) => {
        if (!t) return true;
        const hay = [
          r.txnId,
          r.type,
          r.category,
          r.method,
          r.currency,
          r.reference,
          r.notes,
          String(r.amount),
          (r.date || "").slice(0, 10),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(t);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [rows, q, tab, cat, from, to]);

  const totals = useMemo(() => {
    const income = filtered
      .filter((r) => r.type === "income")
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const expense = filtered
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const net = income - expense;
    return { income, expense, net };
  }, [filtered]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm({
      ...EMPTY,
      date: clampDate(new Date().toISOString().slice(0, 10), from, to),
    });
    setOpen(true);
  }

  function openEdit(doc) {
    setMode("edit");
    setEditingId(doc._id);
    setForm({
      date: (doc.date || "").slice(0, 10),
      type: TYPES.includes(doc.type) ? doc.type : "income",
      category: CATEGORIES.includes(doc.category) ? doc.category : "Misc",
      method: METHODS.includes(doc.method) ? doc.method : "cash",
      amount: doc.amount ?? "",
      currency: doc.currency || "LKR",
      reference: doc.reference || "",
      notes: doc.notes || "",
    });
    setOpen(true);
  }

  async function onDelete(doc) {
    if (!window.confirm(`Delete this ${doc.type} of LKR ${doc.amount}?`)) return;
    try {
      await FinanceAPI.remove(doc._id);
      toast.success("Transaction deleted");
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  function onChange(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  function validate() {
    if (!form.date) return "Date is required";
    if (!TYPES.includes(form.type)) return "Invalid type";
    if (!form.amount || isNaN(Number(form.amount))) return "Valid amount required";
    if (!form.currency) return "Currency is required";
    if (!CATEGORIES.includes(form.category)) return "Select a category";
    if (!METHODS.includes(form.method)) return "Select a method";
    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    const payload = {
      date: new Date(form.date).toISOString(),
      type: form.type,
      category: form.category,
      method: form.method,
      amount: Number(form.amount),
      currency: form.currency || "LKR",
      reference: form.reference || "",
      notes: form.notes || "",
    };

    try {
      setSubmitting(true);
      if (mode === "create") {
        await FinanceAPI.create(payload);
        toast.success("Transaction created");
      } else {
        await FinanceAPI.update(editingId, payload);
        toast.success("Transaction updated");
      }
      setOpen(false);
      await load();
    } catch {
      /* handled by interceptor */
    } finally {
      setSubmitting(false);
    }
  }

  function exportCSV() {
    const headers = [
      "date",
      "type",
      "category",
      "method",
      "amount",
      "currency",
      "reference",
      "notes",
      "txnId",
      "_id",
    ];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      const row = [
        (r.date || "").slice(0, 10),
        r.type || "",
        r.category || "",
        r.method || "",
        Number(r.amount ?? 0),
        r.currency || "LKR",
        esc(r.reference || ""),
        esc(r.notes || ""),
        esc(r.txnId || ""),
        esc(r._id || ""),
      ];
      lines.push(row.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_${from || "all"}_${to || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sumDisplay = serverSum || totals;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight">
            <span className={gradText}>Admin</span> · Finance
          </h2>
          <p className="text-sm text-neutral-500">
            Track income & expenses, filter by type/date/category, export CSV.
          </p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Base: <span className="font-mono">{BASE}/api/finance</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                placeholder="Search amount, ref, notes…"
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

          <button
            onClick={openCreate}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-95 active:opacity-90`}
          >
            <Plus size={16} />
            New
          </button>
        </div>
      </div>

      {/* Filters + Summary */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Tabs */}
        <div className="rounded-2xl border bg-white p-3">
          <div className="flex items-center gap-2">
            {[
              { key: "all", label: "All" },
              { key: "income", label: "Income" },
              { key: "expense", label: "Expense" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  tab === t.key
                    ? "border-transparent text-white " + gradBG
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                ].join(" ")}
              >
                <Filter className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
            <DateInput label="From" value={from} onChange={setFrom} />
            <DateInput label="To" value={to} onChange={setTo} />
          </div>
        </div>

        {/* Date range */}
        <div className="rounded-2xl border bg-white p-3 hidden lg:block">
          <div className="grid grid-cols-2 gap-3">
            <DateInput label="From" value={from} onChange={setFrom} />
            <DateInput label="To" value={to} onChange={setTo} />
          </div>
        </div>

        {/* Category filter */}
        <div className="rounded-2xl border bg-white p-3">
          <Label>Category</Label>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Stat
            icon={<ArrowUpRight className="h-4 w-4" />}
            label="Income"
            value={`LKR ${fmt(sumDisplay.income || 0)}`}
          />
          <Stat
            icon={<ArrowDownRight className="h-4 w-4" />}
            label="Expense"
            value={`LKR ${fmt(sumDisplay.expense || 0)}`}
          />
          <Stat
            icon={<Wallet className="h-4 w-4" />}
            label="Net"
            value={`LKR ${fmt(sumDisplay.net || 0)}`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <span className="text-sm font-medium text-neutral-700">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} transactions`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Method</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Currency</th>
                <th className="text-left p-3">Reference</th>
                <th className="text-left p-3">Notes</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                filtered.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-3">{(r.date || "").slice(0, 10)}</td>
                    <td className="p-3">
                      <TypePill type={r.type} />
                    </td>
                    <td className="p-3">{r.category || "—"}</td>
                    <td className="p-3 capitalize">{r.method || "—"}</td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-neutral-500" />
                        {fmt(Number(r.amount || 0))}
                      </div>
                    </td>
                    <td className="p-3">{r.currency || "LKR"}</td>
                    <td className="p-3">{r.reference || "—"}</td>
                    <td className="p-3 max-w-[26ch] truncate" title={r.notes || ""}>
                      {r.notes || "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                          onClick={() => openEdit(r)}
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                          onClick={() => onDelete(r)}
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
                  <td className="p-8 text-center text-neutral-500" colSpan={9}>
                    No transactions found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td className="p-8 text-center text-neutral-500" colSpan={9}>
                    Loading finance…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-[1001] w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
              <div className="rounded-2xl bg-white">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                  <div className="font-semibold">
                    {mode === "create" ? "New Transaction" : "Edit Transaction"}
                  </div>
                  <button
                    className="p-2 rounded-lg hover:bg-neutral-100"
                    onClick={() => setOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={onSubmit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={onChange("date")}
                      required
                    />
                  </div>

                  <div>
                    <Label>Type *</Label>
                    <select
                      value={form.type}
                      onChange={onChange("type")}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Category *</Label>
                    <select
                      value={form.category}
                      onChange={onChange("category")}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Method *</Label>
                    <select
                      value={form.method}
                      onChange={onChange("method")}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                    >
                      {METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Amount (LKR) *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.amount}
                      onChange={onChange("amount")}
                      placeholder="2500"
                      required
                    />
                  </div>

                  <div>
                    <Label>Currency *</Label>
                    <Input
                      value={form.currency}
                      onChange={onChange("currency")}
                      placeholder="LKR"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Reference</Label>
                    <Input
                      value={form.reference}
                      onChange={onChange("reference")}
                      placeholder="INV-001 / BK-2024-09-08 / POS123…"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      rows={4}
                      value={form.notes}
                      onChange={onChange("notes")}
                      placeholder="Optional details…"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`px-4 py-2 rounded-xl text-white ${gradBG} disabled:opacity-60`}
                    >
                      {submitting ? "Saving…" : mode === "create" ? "Create" : "Update"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Small UI bits ===== */
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
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30",
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
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30",
      ].join(" ")}
    />
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
        />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100">
          {icon}
        </span>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function TypePill({ type }) {
  const isIncome = type === "income";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        isIncome
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-rose-50 text-rose-700 ring-rose-200",
      ].join(" ")}
    >
      {isIncome ? "Income" : "Expense"}
    </span>
  );
}

/* ===== Helpers ===== */
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function clampDate(v, min, max) {
  if (min && v < min) return min;
  if (max && v > max) return max;
  return v;
}
function fmt(n) {
  return (n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function esc(s) {
  const q = String(s ?? "");
  if (/[,"\n]/.test(q)) return `"${q.replace(/"/g, '""')}"`;
  return q;
}
