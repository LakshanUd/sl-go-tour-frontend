// src/pages/Admin/ManageInventoryAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Boxes,
  Search,
  Download,
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
  UserCog,
  Trash2,
  Bot,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { confirmToast } from "../../components/ConfirmToast";
import { getRole } from "../../utils/auth";

/* ---------- Theme (GREEN) ---------- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ---------- Persisted sidebar accordion ---------- */
const LS_KEY = "adminSidebarOpen";

/* ---------- Enums ---------- */
const STATUS_OPTS = ["in_stock", "out_of_stock", "expired"];

/* ---------- Activity storage ---------- */
const ACTIVITY_KEY = "inv_activity_logs";

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
    const s = err?.response?.status;
    if (s === 401 || s === 403) toast.error(err?.response?.data?.message || "Unauthorized.");
    return Promise.reject(err);
  }
);

const InvAPI = {
  list: () => api.get("/api/inventory"),
  get: (id) => api.get(`/api/inventory/${id}`),
  create: (payload) => api.post("/api/inventory", payload),
  update: (id, payload) => api.put(`/api/inventory/${id}`, payload),
  remove: (id) => api.delete(`/api/inventory/${id}`),
};

/* ---------- helpers ---------- */
function fmtNum(n, digits = 2) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(digits) : "0.00";
}
function fmtDate(d) {
  try {
    if (!d) return "—";
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}
function toISODateInput(d) {
  if (!d) return "";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
function toCSV(rows) {
  const cols = [
    "inventoryID",
    "name",
    "category",
    "quantity",
    "status(computed)",
    "location",
    "purchaseDate",
    "expiryDate",
    "createdAt",
  ];
  const header = cols.join(",");
  const lines = rows.map((r) =>
    cols
      .map((c) => {
        let val = "";
        if (c === "status(computed)") val = computeStatus(r);
        else if (["purchaseDate", "expiryDate", "createdAt"].includes(c)) {
          val = r[c] ? new Date(r[c]).toISOString() : "";
        } else {
          val = r[c] ?? "";
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

/** Compute status from quantity + expiry */
function computeStatus(row) {
  const qty = Number(row?.quantity || 0);
  const exp = row?.expiryDate ? new Date(row.expiryDate).getTime() : null;
  const now = Date.now();
  if (exp && !Number.isNaN(exp) && exp < now) return "expired";
  if (qty <= 0) return "out_of_stock";
  return "in_stock";
}

/** persist activity logs */
function readActivity() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
  } catch {
    return [];
  }
}
function pushActivity(entry) {
  const next = [{ ts: Date.now(), ...entry }, ...readActivity()].slice(0, 200);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  return next;
}

/* ---------- component ---------- */
export default function ManageInventoryAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Role-based permissions
  const userRole = getRole();
  const canAddStock = userRole === "Admin" || userRole === "IN-Manager";

  /* Sidebar */
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

  /* main page state */
  const [tab, setTab] = useState("Overview"); // Overview | Lists | Issue | Return | Activity

  /* search (Lists) */
  const [qList, setQList] = useState(localStorage.getItem("inv_q_list") || "");
  useEffect(() => {
    localStorage.setItem("inv_q_list", qList);
  }, [qList]);

  /* Issue state */
  const [qIssue, setQIssue] = useState("");
  const [issueMap, setIssueMap] = useState({}); // {id: qtyToIssue}
  const [issuing, setIssuing] = useState({}); // {id: boolean}

  /* Return state */
  const [qReturn, setQReturn] = useState("");
  const [returning, setReturning] = useState({}); // {id: boolean}

  /* Add Stock state */
  const [addStockForm, setAddStockForm] = useState({
    name: "",
    category: "General",
    description: "",
    location: "Main Warehouse",
    quantity: "",
    unitCost: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
  });
  const [submittingStock, setSubmittingStock] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);

  /* Activity (local) */
  const [activity, setActivity] = useState(readActivity());

  async function load() {
    try {
      setLoading(true);
      const res = await InvAPI.list();
      const list = Array.isArray(res?.data) ? res.data : [];
      setRows(list);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to load inventory");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  /* derived lists */
  const stats = useMemo(() => {
    const total = rows.length;
    const inStock = rows.filter((r) => computeStatus(r) === "in_stock").length;
    const outStock = rows.filter((r) => computeStatus(r) === "out_of_stock").length;
    const expired = rows.filter((r) => computeStatus(r) === "expired").length;
    const totalValue = rows.reduce(
      (acc, r) => acc + Number(r.unitCost || 0) * Math.max(0, Number(r.quantity || 0)),
      0
    );
    return { total, inStock, outStock, expired, totalValue };
  }, [rows]);

  /* Lists tab (read-only) */
  const listFiltered = useMemo(() => {
    const t = qList.trim().toLowerCase();
    let list = rows;
    if (t) {
      list = list.filter((r) => {
        const hay = [
          r.inventoryID,
          r.name,
          r.category,
          r.description,
          r.location,
          computeStatus(r),
          String(r.quantity),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(t);
      });
    }
    // order by status then name
    return [...list].sort((a, b) => {
      const sa = computeStatus(a);
      const sb = computeStatus(b);
      if (sa === sb) return (a.name || "").localeCompare(b.name || "");
      const order = { expired: 0, out_of_stock: 1, in_stock: 2 };
      return (order[sb] ?? 0) - (order[sa] ?? 0);
    });
  }, [rows, qList]);

  /* Issue tab: only available (in_stock) and not expired */
  const issueList = useMemo(() => {
    const t = qIssue.trim().toLowerCase();
    return rows
      .filter((r) => computeStatus(r) === "in_stock")
      .filter((r) => {
        if (!t) return true;
        const hay = [r.inventoryID, r.name, r.category, r.location].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(t);
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [rows, qIssue]);

  /* Return tab: show all available (any status) */
  const returnList = useMemo(() => {
    const t = qReturn.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (!t) return true;
        const hay = [r.inventoryID, r.name, r.category, r.location].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(t);
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [rows, qReturn]);

  /* export */
  function exportCSV(data) {
    if (!data.length) return toast.error("Nothing to export");
    const csv = toCSV(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- Issue actions ---------- */
  function onChangeIssueQty(id, value, maxQty) {
    const v = value.replace(/[^\d.]/g, "");
    let n = Number(v);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (maxQty != null && n > maxQty) n = maxQty;
    setIssueMap((m) => ({ ...m, [id]: n }));
  }

  async function onIssue(row) {
    const id = row._id;
    const available = Math.max(0, Number(row.quantity || 0));
    const qty = Math.max(0, Number(issueMap[id] || 0));
    if (qty <= 0) return toast.error("Enter a quantity to issue");
    if (qty > available) return toast.error("Issue quantity exceeds available stock");

    try {
      setIssuing((s) => ({ ...s, [id]: true }));

      const newQty = available - qty;
      const nextStatus = computeStatus({ ...row, quantity: newQty });

      await InvAPI.update(id, {
        quantity: newQty,
        status: nextStatus, // keep backend aligned, though UI computes anyway
      });

      // record activity
      const logs = pushActivity({
        action: "ISSUE",
        id,
        inventoryID: row.inventoryID || "",
        name: row.name || "",
        qty,
        prevQty: available,
        newQty,
      });
      setActivity(logs);

      toast.success(`Issued ${qty} ${qty === 1 ? "unit" : "units"}`);
      setIssueMap((m) => ({ ...m, [id]: 0 }));
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Issue failed");
    } finally {
      setIssuing((s) => ({ ...s, [id]: false }));
    }
  }

  /* ---------- Return actions ---------- */
  async function onReturn(row) {
    const id = row._id;
    const ok = await confirmToast({
      title: "Return stock",
      message: `Are you sure you want to return and remove "${row.name || "this item"}" from inventory?`,
      confirmText: "Return",
      cancelText: "Cancel",
      position: "top-right",
    });
    if (!ok) return;

    try {
      setReturning((s) => ({ ...s, [id]: true }));
      await InvAPI.remove(id);

      // record activity
      const logs = pushActivity({
        action: "RETURN",
        id,
        inventoryID: row.inventoryID || "",
        name: row.name || "",
        qty: Number(row.quantity || 0),
        removed: true,
      });
      setActivity(logs);

      toast.success("Stock returned and removed");
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Return failed");
    } finally {
      setReturning((s) => ({ ...s, [id]: false }));
    }
  }

  /* ---------- Add Stock actions ---------- */
  function onChangeAddStock(field, value) {
    setAddStockForm(prev => ({ ...prev, [field]: value }));
  }

  async function onSubmitAddStock(e) {
    e.preventDefault();
    
    // Validation
    if (!addStockForm.name.trim()) {
      return toast.error("Item name is required");
    }
    if (!addStockForm.quantity || Number(addStockForm.quantity) <= 0) {
      return toast.error("Valid quantity is required");
    }
    if (!addStockForm.unitCost || Number(addStockForm.unitCost) < 0) {
      return toast.error("Valid unit cost is required");
    }

    try {
      setSubmittingStock(true);
      
      const payload = {
        name: addStockForm.name.trim(),
        category: addStockForm.category,
        description: addStockForm.description.trim(),
        location: addStockForm.location.trim(),
        quantity: Number(addStockForm.quantity),
        unitCost: Number(addStockForm.unitCost),
        purchaseDate: addStockForm.purchaseDate,
        expiryDate: addStockForm.expiryDate || null,
        type: "RECEIVE", // This indicates it's a new stock addition
      };

      await InvAPI.create(payload);

      // Record activity
      const logs = pushActivity({
        action: "ADD_STOCK",
        name: addStockForm.name,
        qty: Number(addStockForm.quantity),
        unitCost: Number(addStockForm.unitCost),
        category: addStockForm.category,
        location: addStockForm.location,
      });
      setActivity(logs);

      toast.success("Stock added successfully");
      
      // Reset form and close modal
      setAddStockForm({
        name: "",
        category: "General",
        description: "",
        location: "Main Warehouse",
        quantity: "",
        unitCost: "",
        purchaseDate: new Date().toISOString().slice(0, 10),
        expiryDate: "",
      });
      setShowAddStockModal(false);
      
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to add stock");
    } finally {
      setSubmittingStock(false);
    }
  }

  async function onDelete(id, name) {
    const ok = await confirmToast({
      title: "Delete inventory?",
      message: `Delete “${name || "this item"}”? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await InvAPI.remove(id);
      toast.success("Inventory deleted");
      setRows((prev) => prev.filter((r) => r._id !== id));
      // Record activity
      const logs = pushActivity({
        action: "DELETE",
        id,
        name,
      });
      setActivity(logs);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Delete failed");
    }
  }

  /* ------------ Render ------------ */
  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar ===== */}
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
                <RailLink
                  to="/admin/overview"
                  icon={<LayoutDashboard className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Overview</span>
                </RailLink>
              </div>
            )}

            {/* Content */}
            <AccordionHeader
              title="Content Management"
              isOpen={open.content}
              onToggle={() => setOpen((s) => ({ ...s, content: !s.content }))}
            />
            {open.content && (
              <div className="px-3 pb-2">
                <RailLink to="/admin/tour-packages" icon={<MapPin className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Tours</span>
                </RailLink>
                <RailLink to="/admin/manage-blogs" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Blogs</span>
                </RailLink>
                <RailLink to="/admin/manage-meals" icon={<UtensilsCrossed className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Meals</span>
                </RailLink>
                <RailLink to="/admin/manage-accommodations" icon={<Hotel className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Accommodations</span>
                </RailLink>
                <RailLink to="/admin/manage-vehicles" icon={<Truck className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Vehicles</span>
                </RailLink>
                <RailLink to="/admin/manage-feedbacks" icon={<MessageSquare className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Feedback</span>
                </RailLink>
                <RailLink to="/admin/manage-complaints" icon={<AlertCircle className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Complaints</span>
                </RailLink>
                <RailLink to="/admin/manage-inventory" icon={<Boxes className={`h-4 w-4 ${ICON_COLOR}`} />}>
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

            {/* Operations */}
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
                <RailLink to="/admin/manage-finance" icon={<Wallet className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Finance</span>
                </RailLink>
                <RailLink to="/admin/manage-bookings" icon={<CalendarDays className={`h-4 w-4 ${ICON_COLOR}`} />}>
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
          {/* Header / Title row */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Admin</span> · Inventory
              </h2>
              <p className="text-sm text-neutral-500">
                Issue or return stock. Inventory status is calculated automatically.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canAddStock && (
                <button
                  onClick={() => setShowAddStockModal(true)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white ${GRAD_BG} hover:opacity-90 transition-opacity`}
                >
                  <Boxes className="h-4 w-4" />
                  Add Stock
                </button>
              )}

              {/* Report */}
              <Link
                to="/reports/inventory"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="View inventory reports"
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
              <TopTab active={tab === "Issue"} onClick={() => setTab("Issue")}>
                Issue
              </TopTab>
              <TopTab active={tab === "Return"} onClick={() => setTab("Return")}>
                Return
              </TopTab>
              <TopTab active={tab === "Activity"} onClick={() => setTab("Activity")}>
                Activity Logs
              </TopTab>
            </div>
          </div>

          {/* Overview */}
          {tab === "Overview" && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCardBig label="Total Records" value={stats.total} />
                <StatCardBig label="In Stock" value={stats.inStock} />
                <StatCardBig label="Out of Stock" value={stats.outStock} />
                <StatCardBig label="Expired" value={stats.expired} />
              </div>

              <div className={`${CARD} p-4`}>
                <div className="text-sm font-medium">Estimated Inventory Value</div>
                <div className="text-2xl font-semibold mt-1">LKR {fmtNum(stats.totalValue, 2)}</div>
                <div className="text-xs text-neutral-500 mt-1">
                  Sum of quantity × unitCost (computed on current rows)
                </div>
              </div>
            </>
          )}

          {/* Lists (read-only, auto status) */}
          {tab === "Lists" && (
            <>
              <div className={`${CARD} p-3`}>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                      <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                      <input
                        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                        placeholder="Search name / category / location…"
                        value={qList}
                        onChange={(e) => setQList(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => exportCSV(listFiltered)}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    <Download className="h-4 w-4" /> Export CSV
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-600">
                      <tr>
                        <th className="text-left p-3">Inventory</th>
                        <th className="text-left p-3">Quantity</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Dates</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading &&
                        listFiltered.map((r) => {
                          const status = computeStatus(r);
                          return (
                            <tr key={r._id} className="border-t">
                              <td className="p-3">
                                <div className="font-medium text-neutral-800">{r.name || "—"}</div>
                                <div className="text-xs text-neutral-500">
                                  {(r.inventoryID || r._id) || "—"} · {r.category || "—"} · {r.location || "—"}
                                </div>
                              </td>
                              <td className="p-3">{Math.max(0, Number(r.quantity || 0))}</td>
                              <td className="p-3">
                                <StatusPill value={status} />
                              </td>
                              <td className="p-3 text-xs">
                                <div>Purchased: {toISODateInput(r.purchaseDate) || "—"}</div>
                                <div>Expiry: {toISODateInput(r.expiryDate) || "—"}</div>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => onDelete(r._id, r.name)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                      {!loading && listFiltered.length === 0 && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={5}>
                            {rows.length === 0
                              ? "No inventory records."
                              : "No results match your search."}
                          </td>
                        </tr>
                      )}

                      {loading && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={5}>
                            Loading inventory…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Issue */}
          {tab === "Issue" && (
            <>
              <div className={`${CARD} p-3`}>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                      <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                      <input
                        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                        placeholder="Search available stock…"
                        value={qIssue}
                        onChange={(e) => setQIssue(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-600">
                      <tr>
                        <th className="text-left p-3">Inventory</th>
                        <th className="text-left p-3">Available</th>
                        <th className="text-left p-3">Issue Qty</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading &&
                        issueList.map((r) => {
                          const available = Math.max(0, Number(r.quantity || 0));
                          const val = issueMap[r._id] ?? 0;
                          const busy = !!issuing[r._id];
                          return (
                            <tr key={r._id} className="border-t">
                              <td className="p-3">
                                <div className="font-medium text-neutral-800">{r.name || "—"}</div>
                                <div className="text-xs text-neutral-500">
                                  {(r.inventoryID || r._id) || "—"} · {r.category || "—"} · {r.location || "—"}
                                </div>
                              </td>
                              <td className="p-3">{available}</td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min={0}
                                  max={available}
                                  value={val}
                                  onChange={(e) => onChangeIssueQty(r._id, e.target.value, available)}
                                  className="w-28 rounded-lg border border-neutral-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                                />
                                <div className="text-xs text-neutral-500 mt-1">Max {available}</div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-end">
                                  <button
                                    onClick={() => onIssue(r)}
                                    disabled={busy}
                                    className={`px-3 py-1.5 rounded-xl text-white ${GRAD_BG} disabled:opacity-60`}
                                  >
                                    {busy ? "Issuing…" : "Issue"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {!loading && issueList.length === 0 && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={4}>
                            {rows.length === 0 ? "No inventory records." : "No available stock to issue."}
                          </td>
                        </tr>
                      )}

                      {loading && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={4}>
                            Loading…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Return */}
          {tab === "Return" && (
            <>
              <div className={`${CARD} p-3`}>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                      <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                      <input
                        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                        placeholder="Search stocks to return…"
                        value={qReturn}
                        onChange={(e) => setQReturn(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-600">
                      <tr>
                        <th className="text-left p-3">Inventory</th>
                        <th className="text-left p-3">Quantity</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading &&
                        returnList
                          .filter((r) => Math.max(0, Number(r.quantity || 0)) > 0)
                          .map((r) => {
                            const status = computeStatus(r);
                            const busy = !!returning[r._id];
                            return (
                              <tr key={r._id} className="border-t">
                                <td className="p-3">
                                  <div className="font-medium text-neutral-800">{r.name || "—"}</div>
                                  <div className="text-xs text-neutral-500">
                                    {(r.inventoryID || r._id) || "—"} · {r.category || "—"} · {r.location || "—"}
                                  </div>
                                </td>
                                <td className="p-3">{Math.max(0, Number(r.quantity || 0))}</td>
                                <td className="p-3"><StatusPill value={status} /></td>
                                <td className="p-3">
                                  <div className="flex items-center justify-end">
                                    <button
                                      onClick={() => onReturn(r)}
                                      disabled={busy}
                                      className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                                    >
                                      {busy ? "Returning…" : "Return"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                      {!loading && returnList.filter((r) => Math.max(0, Number(r.quantity || 0)) > 0).length === 0 && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={4}>
                            {rows.length === 0 ? "No inventory records." : "Nothing matches your search."}
                          </td>
                        </tr>
                      )}

                      {loading && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={4}>
                            Loading…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Activity Logs */}
          {tab === "Activity" && (
            <div className={CARD}>
              <div className="p-4 border-b">
                <div className="font-medium">Activity Logs</div>
                <p className="text-xs text-neutral-500">
                  Local actions (Issue / Return) and system timestamps from rows.
                </p>
              </div>

              {/* Local actions */}
              <div className="p-4">
                <div className="text-sm font-medium mb-2">Your Actions</div>
                {activity.length === 0 ? (
                  <div className="text-sm text-neutral-500">No recent actions.</div>
                ) : (
                  <ul className="text-sm space-y-2">
                    {activity.slice(0, 50).map((e, i) => (
                      <li key={i} className="rounded border p-2">
                        <div className="text-neutral-700">
                          <b>{e.action}</b> — {e.name || e.inventoryID || e.id}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(e.ts).toLocaleString()}
                          {" · "}
                          {e.action === "ISSUE"
                            ? `qty ${e.qty} (from ${e.prevQty} → ${e.newQty})`
                            : e.action === "RETURN"
                            ? `removed qty ${e.qty ?? "—"}`
                            : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* System (from rows) */}
              <div className="px-4 pb-4">
                <div className="text-sm font-medium mb-2">System (Row Timestamps)</div>
                <ul className="divide-y">
                  {rows.slice(0, 50).map((r) => (
                    <li key={r._id} className="py-2 text-sm">
                      <span className="font-medium">{r.inventoryID || r._id}</span>
                      <span className="text-neutral-500"> — {r.name} </span>
                      <span className="text-neutral-500">· status </span>
                      <span>{computeStatus(r)}</span>
                      <span className="text-neutral-500"> · created </span>
                      <span>{fmtDate(r.createdAt)}</span>
                      <span className="text-neutral-500"> · updated </span>
                      <span>{fmtDate(r.updatedAt)}</span>
                    </li>
                  ))}
                  {rows.length === 0 && (
                    <li className="py-2 text-neutral-500 text-sm">No system rows.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-neutral-800">Add New Stock</h3>
                <button
                  onClick={() => setShowAddStockModal(false)}
                  className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <svg className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={onSubmitAddStock} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-neutral-700">Basic Information</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={addStockForm.name}
                        onChange={(e) => onChangeAddStock("name", e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                        placeholder="Enter item name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Category
                      </label>
                      <select
                        value={addStockForm.category}
                        onChange={(e) => onChangeAddStock("category", e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                      >
                        <option value="General">General</option>
                        <option value="Food">Food</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Supplies">Supplies</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Location
                      </label>
                      <select
                        type="text"
                        value={addStockForm.location}
                        onChange={(e) => onChangeAddStock("location", e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                        placeholder="Main Warehouse"
                      >
                        <option value="Floor 1">Floor 1</option>
                        <option value="Floor 2">Floor 2</option>
                        <option value="Shelf 1">Shelf 1</option>
                        <option value="Shelf 2">Shelf 2</option>
                        <option value="Rack 1">Rack 1</option>
                        <option value="Rack 2">Rack 2</option>
                      </select>
                    </div>
                  </div>

                  {/* Quantity and Cost */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-neutral-700">Quantity & Cost</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={addStockForm.quantity}
                        onChange={(e) => onChangeAddStock("quantity", e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                        placeholder="Enter quantity"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Unit Cost (LKR) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={addStockForm.unitCost}
                        onChange={(e) => onChangeAddStock("unitCost", e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        value={addStockForm.purchaseDate}
                        onChange={(e) => onChangeAddStock("purchaseDate", e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={addStockForm.expiryDate}
                        onChange={(e) => onChangeAddStock("expiryDate", e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={addStockForm.description}
                    onChange={(e) => onChangeAddStock("description", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                    placeholder="Optional description..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddStockModal(false)}
                    className="px-4 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStock}
                    className={`px-6 py-2 rounded-lg text-white font-medium ${
                      submittingStock 
                        ? "bg-neutral-400 cursor-not-allowed" 
                        : `${GRAD_BG} hover:opacity-90`
                    }`}
                  >
                    {submittingStock ? "Adding Stock..." : "Add Stock"}
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
        className={[
          "h-4 w-4 transition-transform text-neutral-500",
          isOpen ? "rotate-0" : "rotate-180",
        ].join(" ")}
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

/* ---------- small UI bits ---------- */
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
function StatusPill({ value }) {
  const v = (value || "in_stock").toLowerCase();
  let cls = "bg-neutral-100 text-neutral-700 ring-neutral-200"; // default
  if (v === "in_stock") cls = "bg-emerald-50 text-emerald-700 ring-emerald-200";
  else if (v === "out_of_stock") cls = "bg-amber-50 text-amber-700 ring-amber-200";
  else if (v === "expired") cls = "bg-rose-50 text-rose-700 ring-rose-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize ${cls}`}>
      {v.replaceAll("_", " ")}
    </span>
  );
}
