// src/pages/Admin/FinancialManageAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Search,
  RefreshCcw,
  Plus,
  Pencil,
  Trash2,
  Download,
  Filter,
  ChevronRight,
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  FileText,
  BarChart3,
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

/* ---------- Theme (GREEN, same as ManageInventoryAdmin) ---------- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ---------- Persisted sidebar accordion ---------- */
const LS_KEY = "adminSidebarOpen";

/* ---------- Finance constants (align with your backend) ---------- */
const TYPES = ["income", "expense"];
const METHODS = ["cash", "card", "bank_transfer", "online"];
const CATEGORIES = ["Tour Package", "Vehicle", "Accommodation", "Meal", "Misc"];

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

/* ---------- API base ---------- */
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

const FinanceAPI = {
  list: () => api.get("/api/simple-finance/transactions"),
  summary: () => api.get("/api/simple-finance/summary"),
  bookings: () => api.get("/api/simple-finance/bookings"),
  inventoryExpenses: () => api.get("/api/simple-finance/inventory-expenses"),
  create: (payload) => api.post("/api/simple-finance/transactions", payload),
  update: (id, payload) => api.put(`/api/simple-finance/transactions/${id}`, payload),
  remove: (id) => api.delete(`/api/simple-finance/transactions/${id}`),
};

/* ---------- Helpers ---------- */
function fmtAmount(n) {
  return (Number(n) || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function toCSV(rows) {
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
  rows.forEach((r) => {
    const row = [
      (r.date || "").slice(0, 10),
      r.type || "",
      r.category || "",
      r.method || "",
      Number(r.amount ?? 0), // keep raw number in CSV
      r.currency || "LKR",
      esc(r.reference || ""),
      esc(r.notes || ""),
      esc(r.txnId || ""),
      esc(r._id || ""),
    ];
    lines.push(row.join(","));
  });
  return lines.join("\n");
}
function esc(s) {
  const q = String(s ?? "");
  if (/[,"\n]/.test(q)) return `"${q.replace(/"/g, '""')}"`;
  return q;
}

/* ---------- Component ---------- */
export default function FinancialManageAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Sidebar accordions (persisted like ManageInventoryAdmin) */
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

  /* Tabs (Incomes | Expenses | Overall Summary | Other) */
  const [tab, setTab] = useState("Overall Summary");

  /* Filters/search (no charts/summaries/date-range) */
  const [q, setQ] = useState(localStorage.getItem("fin_q") || "");
  const [typeTab, setTypeTab] = useState(localStorage.getItem("fin_type") || "all"); // all|income|expense
  const [cat, setCat] = useState(localStorage.getItem("fin_cat") || "");

  useEffect(() => {
    localStorage.setItem("fin_q", q);
    localStorage.setItem("fin_type", typeTab);
    localStorage.setItem("fin_cat", cat);
  }, [q, typeTab, cat]);

  /* Modal */
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setLoading(true);

      // Fetch all data sources in parallel
      const [manualRes, bookingsRes, inventoryRes] = await Promise.all([
        FinanceAPI.list(),
        FinanceAPI.bookings(),
        FinanceAPI.inventoryExpenses()
      ]);

      // Combine all transactions
      const manualTransactions = Array.isArray(manualRes?.data) ? manualRes.data : [];
      const bookingTransactions = Array.isArray(bookingsRes?.data) ? bookingsRes.data : [];
      const inventoryTransactions = Array.isArray(inventoryRes?.data) ? inventoryRes.data : [];

      const allTransactions = [
        ...manualTransactions,
        ...bookingTransactions,
        ...inventoryTransactions
      ];

      setRows(allTransactions);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const derivedCategories = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.category && set.add(r.category));
    const arr = Array.from(set);
    return arr.length ? arr : CATEGORIES;
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => (typeTab === "all" ? true : r.type === typeTab))
      .filter((r) => (!cat ? true : r.category === cat))
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
  }, [rows, q, typeTab, cat]);

  const counts = useMemo(() => {
    const total = rows.length;
    const incomeRows = rows.filter((r) => r.type === "income");
    const expenseRows = rows.filter((r) => r.type === "expense");

    const inc = incomeRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const exp = expenseRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const incCount = incomeRows.length;
    const expCount = expenseRows.length;

    return { total, inc, exp, incCount, expCount };
  }, [rows]);

  const monthlyIncome = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return rows
      .filter(r => r.type === "income" && r.date?.slice(0, 7) === currentMonth)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [rows]);

  const monthlyExpense = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return rows
      .filter(r => r.type === "expense" && r.date?.slice(0, 7) === currentMonth)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [rows]);

  const categorySummary = useMemo(() => {
    const summary = {};
    rows.forEach(r => {
      const category = r.category || "Other";
      if (!summary[category]) {
        summary[category] = { income: 0, expense: 0 };
      }
      if (r.type === "income") {
        summary[category].income += Number(r.amount || 0);
      } else if (r.type === "expense") {
        summary[category].expense += Number(r.amount || 0);
      }
    });
    return summary;
  }, [rows]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
    setOpenModal(true);
  }
  function openEdit(doc) {
    setMode("edit");
    setEditingId(doc._id);
    setForm({
      date: (doc.date || "").slice(0, 10),
      type: TYPES.includes(doc.type) ? doc.type : "income",
      category: (derivedCategories.includes(doc.category) ? doc.category : derivedCategories[0]) || "Misc",
      method: METHODS.includes(doc.method) ? doc.method : "cash",
      amount: doc.amount ?? "",
      currency: doc.currency || "LKR",
      reference: doc.reference || "",
      notes: doc.notes || "",
    });
    setOpenModal(true);
  }

  async function onDelete(doc) {
    const ok = await confirmToast({
      title: "Delete Transaction",
      message: `Delete this ${doc.type} of LKR ${fmtAmount(doc.amount)}?\nThis cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      position: "top-right",
    });
    if (!ok) return;
    try {
      await FinanceAPI.remove(doc._id);
      toast.success("Transaction deleted");
      await load();
    } catch {
      /* interceptor handles toast */
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
    if (!form.category) return "Select a category";
    if (!form.method) return "Select a method";
    return "";
  }
  async function onSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    // Auto-generate booking ID for income transactions
    let bookingID = null;
    if (form.type === "income") {
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
      const randomStr = Math.random().toString(36).slice(2, 6).toUpperCase();
      bookingID = `BK-${dateStr}-${randomStr}`;
    }

    const payload = {
      date: new Date(form.date).toISOString(),
      type: form.type,
      category: form.category,
      method: form.method,
      amount: Number(form.amount),
      currency: form.currency || "LKR",
      reference: form.reference || "",
      notes: form.notes || "",
      bookingID: bookingID,
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
      setOpenModal(false);
      await load();
    } catch {
      /* interceptor handles toast */
    } finally {
      setSubmitting(false);
    }
  }

  function exportCSV() {
    if (!filtered.length) return toast.error("Nothing to export");
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (same pattern as ManageInventoryAdmin) ===== */}
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

        {/* ===== Main content ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Admin</span> · Finance
              </h2>
              <p className="text-sm text-neutral-500">Track income & expenses, filter and export.</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
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
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>

              <button
                onClick={openCreate}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
              >
                <Plus size={16} />
                New
              </button>

              {/* Report */}
              <Link
                to="/reports/finance"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="View finance reports"
              >
                <BarChart3 className="h-4 w-4" />
                Report
              </Link>
            </div>
          </div>

          {/* Top tabs (Incomes | Expenses | Overall Summary | Other) */}
          <div className={`${CARD} p-3`}>
            <div className="flex flex-wrap gap-2">
              <TopTab active={tab === "Overall Summary"} onClick={() => setTab("Overall Summary")}>
                Overall Summary
              </TopTab>
              <TopTab active={tab === "Incomes"} onClick={() => setTab("Incomes")}>
                Incomes
              </TopTab>
              <TopTab active={tab === "Expenses"} onClick={() => setTab("Expenses")}>
                Expenses
              </TopTab>
              <TopTab active={tab === "Other"} onClick={() => setTab("Other")}>
                Other
              </TopTab>
            </div>
          </div>

          {/* ===== Overall Summary ===== */}
          {tab === "Overall Summary" && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCardBig label="Total Transactions" value={counts.total} />
                <StatCardBig label="Total Income" value={`LKR ${fmtAmount(counts.inc)}`} />
                <StatCardBig label="Total Expense" value={`LKR ${fmtAmount(counts.exp)}`} />
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCardBig label="Net Profit" value={`LKR ${fmtAmount(counts.inc - counts.exp)}`} />
                <StatCardBig label="Income Transactions" value={counts.incCount} />
                <StatCardBig label="Expense Transactions" value={counts.expCount} />
                <StatCardBig
                  label="Average Income"
                  value={`LKR ${fmtAmount(counts.incCount > 0 ? counts.inc / counts.incCount : 0)}`}
                />
              </div>

              {/* Summary by Category */}
              <div className={`${CARD} p-4`}>
                <h3 className="text-lg font-semibold mb-4">Summary by Category</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(categorySummary).map(([category, data]) => (
                    <div key={category} className="border border-neutral-200 rounded-lg p-3">
                      <h4 className="font-medium text-neutral-800">{category}</h4>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Income:</span>
                          <span className="text-green-600 font-medium">LKR {fmtAmount(data.income)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Expense:</span>
                          <span className="text-red-600 font-medium">LKR {fmtAmount(data.expense)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t pt-1">
                          <span>Net:</span>
                          <span className={data.income - data.expense >= 0 ? "text-green-600" : "text-red-600"}>
                            LKR {fmtAmount(data.income - data.expense)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===== Incomes ===== */}
          {tab === "Incomes" && (
            <>
              {/* Income Summary */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCardBig label="Total Income" value={`LKR ${fmtAmount(counts.inc)}`} />
                <StatCardBig label="Income Transactions" value={counts.incCount} />
                <StatCardBig
                  label="Average Income"
                  value={`LKR ${fmtAmount(counts.incCount > 0 ? counts.inc / counts.incCount : 0)}`}
                />
                <StatCardBig label="This Month" value={`LKR ${fmtAmount(monthlyIncome)}`} />
              </div>

              {/* Income Table */}
              <div className={`${CARD} overflow-hidden`}>
                <div className="p-3 border-b border-neutral-200">
                  <h3 className="text-lg font-semibold">Income Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-600">
                      <tr>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-left p-3">Method</th>
                        <th className="text-left p-3">Amount</th>
                        <th className="text-left p-3">Booking ID</th>
                        <th className="text-left p-3">Notes</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.filter(r => r.type === "income").map((r) => (
                        <tr key={r._id} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="p-3">{r.date?.slice(0, 10) || "—"}</td>
                          <td className="p-3">{r.category || "—"}</td>
                          <td className="p-3">{r.method || "—"}</td>
                          <td className="p-3 font-medium text-green-600">LKR {fmtAmount(r.amount)}</td>
                          <td className="p-3">{r.bookingID || r.reference || "—"}</td>
                          <td className="p-3">{r.notes || "—"}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(r)}
                                className="p-1 rounded hover:bg-neutral-100"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4 text-neutral-600" />
                              </button>
                              <button
                                onClick={() => /* was remove(r._id) */ onDelete(r)}
                                className="p-1 rounded hover:bg-neutral-100"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ===== Expenses ===== */}
          {tab === "Expenses" && (
            <>
              {/* Expense Summary */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCardBig label="Total Expense" value={`LKR ${fmtAmount(counts.exp)}`} />
                <StatCardBig label="Expense Transactions" value={counts.expCount} />
                <StatCardBig
                  label="Average Expense"
                  value={`LKR ${fmtAmount(counts.expCount > 0 ? counts.exp / counts.expCount : 0)}`}
                />
                <StatCardBig label="This Month" value={`LKR ${fmtAmount(monthlyExpense)}`} />
              </div>

              {/* Expense Table */}
              <div className={`${CARD} overflow-hidden`}>
                <div className="p-3 border-b border-neutral-200">
                  <h3 className="text-lg font-semibold">Expense Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-600">
                      <tr>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-left p-3">Method</th>
                        <th className="text-left p-3">Amount</th>
                        <th className="text-left p-3">Booking ID</th>
                        <th className="text-left p-3">Notes</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.filter(r => r.type === "expense").map((r) => (
                        <tr key={r._id} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="p-3">{r.date?.slice(0, 10) || "—"}</td>
                          <td className="p-3">{r.category || "—"}</td>
                          <td className="p-3">{r.method || "—"}</td>
                          <td className="p-3 font-medium text-red-600">LKR {fmtAmount(r.amount)}</td>
                          <td className="p-3">{r.bookingID || r.reference || "—"}</td>
                          <td className="p-3">{r.notes || "—"}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(r)}
                                className="p-1 rounded hover:bg-neutral-100"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4 text-neutral-600" />
                              </button>
                              <button
                                onClick={() => /* was remove(r._id) */ onDelete(r)}
                                className="p-1 rounded hover:bg-neutral-100"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ===== Other (Manual Management) ===== */}
          {tab === "Other" && (
            <>
              {/* Controls */}
              <div className={`${CARD} p-3`}>
                <div className="flex flex-wrap gap-2 items-center">
                  {/* quick search */}
                  <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                      <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                      <input
                        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                        placeholder="Search amount, ref, notes…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {/* type chip */}
                    <FilterChip
                      label="Type"
                      value={typeTab}
                      onChange={setTypeTab}
                      options={["all", ...TYPES]}
                    />
                    {/* category chip */}
                    <FilterChip
                      label="Category"
                      value={cat || "All"}
                      onChange={(v) => setCat(v === "All" ? "" : v)}
                      options={["All", ...derivedCategories]}
                    />
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
                          <tr key={r._id} className="border-t hover:bg-neutral-50/60">
                            <td className="p-3">{(r.date || "").slice(0, 10)}</td>
                            <td className="p-3"><TypePill type={r.type} /></td>
                            <td className="p-3">{r.category || "—"}</td>
                            <td className="p-3 capitalize">{r.method || "—"}</td>
                            <td className="p-3">LKR {fmtAmount(r.amount)}</td>
                            <td className="p-3">{r.currency || "LKR"}</td>
                            <td className="p-3">{r.bookingID || r.reference || "—"}</td>
                            <td className="p-3 max-w-[28ch] truncate" title={r.notes || ""}>
                              {r.notes || "—"}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  className="px-2 py-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"
                                  onClick={() => openEdit(r)}
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  className="px-3 py-1.5 rounded-full border border-rose-200 text-rose-600 bg-white hover:bg-rose-50"
                                  onClick={() => onDelete(r)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 inline-block mr-1" />
                                  Delete
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
                {rows.slice(0, 25).map((r) => (
                  <li key={r._id} className="p-4 text-sm">
                    <span className="font-medium">{(r.date || "").slice(0, 10)}</span>
                    <span className="text-neutral-500"> — {r.category}</span>
                    <span className="text-neutral-500"> · {r.type} </span>
                    <span>· LKR {fmtAmount(r.amount)}</span>
                    <span className="text-neutral-500"> · updated </span>
                    <span>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}</span>
                  </li>
                ))}
                {rows.length === 0 && <li className="p-4 text-neutral-500 text-sm">No activity.</li>}
              </ul>
            </div>
          )}
        </main>
      </div>

      {/* Create/Edit Modal (green styling like ManageInventoryAdmin) */}
      {openModal && (
        <Modal title={mode === "create" ? "New Transaction" : "Edit Transaction"} onClose={() => setOpenModal(false)}>
          <form onSubmit={onSubmit} className="space-y-5">
            <Section title="Core">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Date *">
                  <Input type="date" value={form.date} onChange={onChange("date")} required />
                </Field>
                <Field label="Type *">
                  <Select value={form.type} onChange={onChange("type")} options={TYPES} />
                </Field>
                <Field label="Category *">
                  <Select value={form.category} onChange={onChange("category")} options={derivedCategories} />
                </Field>
              </div>
            </Section>

            <Section title="Payment">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Method *">
                  <Select value={form.method} onChange={onChange("method")} options={METHODS} />
                </Field>
                <Field label="Amount (LKR) *">
                  <Input type="number" min={0} value={form.amount} onChange={onChange("amount")} required />
                </Field>
                <Field label="Currency *">
                  <Input value={form.currency} onChange={onChange("currency")} required />
                </Field>
              </div>
            </Section>

            <Section title="Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Reference (Optional)">
                  <Input value={form.reference} onChange={onChange("reference")} placeholder="INV-001 / POS123…" />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <Textarea rows={4} value={form.notes} onChange={onChange("notes")} placeholder="Optional details…" />
                </Field>
              </div>
              {form.type === "income" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <span className="text-sm font-medium">ℹ️ Booking ID will be auto-generated for income transactions</span>
                  </div>
                </div>
              )}
            </Section>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} disabled:opacity-60`}>
                {submitting ? "Saving…" : mode === "create" ? "Create" : "Update"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Sidebar bits (same as ManageInventoryAdmin) ---------- */
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
function Section({ title, children }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-medium mb-2">{title}</div>
      {children}
    </div>
  );
}
function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}
function Input(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "placeholder:text-neutral-400 text-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30",
        props.disabled ? "bg-neutral-100 text-neutral-500" : "",
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
function TypePill({ type }) {
  const isIncome = type === "income";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        isIncome
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-rose-50 text-rose-700 ring-rose-200",
      ].join(" ")}
    >
      {isIncome ? "Income" : "Expense"}
    </span>
  );
}

/* ---------- Modal (same pattern as ManageInventoryAdmin) ---------- */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative z-[1001] w-full max-w-2xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-white max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
            <div className="font-semibold">{title}</div>
            <button type="button" onClick={onClose} className="p-2 rounded-md hover:bg-neutral-100" aria-label="Close">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-neutral-700" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18"></path>
                <path d="M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div className="p-5 overflow-y-auto overscroll-contain">{children}</div>
        </div>
      </div>
    </div>
  );
}
