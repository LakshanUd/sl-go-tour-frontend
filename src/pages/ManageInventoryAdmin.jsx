// src/pages/ManageInventoryAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Boxes,
  Plus,
  Search,
  Trash2,
  X,
  Filter,
  Download,
  ChevronRight,
  ListOrdered,
  Settings,
  BadgeDollarSign,
  ClipboardList,
  Layers3,
  Warehouse,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pencil,
} from "lucide-react";

/* ---------- Theme (match ManageUserAdmin) ---------- */
const GRAD_FROM = "from-[#DA22FF]";
const GRAD_TO = "to-[#9733EE]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#9733EE]";
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";

/* ---------- Enums ---------- */
const TYPE_OPTS = ["RECEIVE", "ISSUE", "ADJUSTMENT", "TRANSFER"];
const STATUS_OPTS = ["in_stock", "out_of_stock", "expired"];

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
const EMPTY = {
  item: "",              // ObjectId string
  type: "RECEIVE",
  quantity: "",
  unitCost: "",
  name: "",
  category: "General",
  description: "",
  location: "Main Warehouse",
  purchaseDate: "",      // yyyy-mm-dd
  expiryDate: "",        // yyyy-mm-dd
  status: "in_stock",
};

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
    "inventoryID","name","category","type","quantity","unitCost","status",
    "location","purchaseDate","expiryDate","createdAt"
  ];
  const header = cols.join(",");
  const lines = rows.map((r) =>
    cols
      .map((c) => {
        const val =
          c === "purchaseDate" || c === "expiryDate" || c === "createdAt"
            ? (r[c] ? new Date(r[c]).toISOString() : "")
            : r[c] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

/* ---------- component ---------- */
export default function ManageInventoryAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* left dashboard tabs */
  const [tab, setTab] = useState("Overview"); // Overview | Activity | Settings | Lists

  /* search + filters */
  const [q, setQ] = useState(localStorage.getItem("inv_q") || "");
  const [filterType, setFilterType] = useState(localStorage.getItem("inv_type") || "All");
  const [filterStatus, setFilterStatus] = useState(localStorage.getItem("inv_status") || "All");
  const [filterCategory, setFilterCategory] = useState(localStorage.getItem("inv_cat") || "All");

  /* create modal */
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);

  /* edit/view drawer */
  const [drawer, setDrawer] = useState(null); // item object or null
  const [savingDrawer, setSavingDrawer] = useState(false);

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
  useEffect(() => { load(); }, []);

  useEffect(() => {
    localStorage.setItem("inv_q", q);
    localStorage.setItem("inv_type", filterType);
    localStorage.setItem("inv_status", filterStatus);
    localStorage.setItem("inv_cat", filterCategory);
  }, [q, filterType, filterStatus, filterCategory]);

  /* derived lists */
  const categories = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => r.category && s.add(r.category));
    return ["All", ...Array.from(s).sort()];
  }, [rows]);

  /* stats */
  const stats = useMemo(() => {
    const total = rows.length;
    const inStock = rows.filter((r) => r.status === "in_stock").length;
    const outStock = rows.filter((r) => r.status === "out_of_stock").length;
    const expired = rows.filter((r) => r.status === "expired").length;
    const totalValue = rows.reduce((acc, r) => acc + Number(r.unitCost || 0) * Number(r.quantity || 0), 0);
    return { total, inStock, outStock, expired, totalValue };
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = rows;

    if (filterType !== "All") list = list.filter((r) => r.type === filterType);
    if (filterStatus !== "All") list = list.filter((r) => r.status === filterStatus);
    if (filterCategory !== "All") list = list.filter((r) => (r.category || "") === filterCategory);

    if (t) {
      list = list.filter((r) => {
        const hay = [
          r.inventoryID, r.name, r.category, r.description, r.location, r.type, r.status,
          String(r.quantity), String(r.unitCost)
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(t);
      });
    }
    return list;
  }, [rows, q, filterType, filterStatus, filterCategory]);

  /* create */
  function openCreateModal() {
    setForm({
      ...EMPTY,
      purchaseDate: new Date().toISOString().slice(0, 10),
    });
    setOpenCreate(true);
  }
  function closeCreateModal() {
    setOpenCreate(false);
  }
  async function submitCreate(e) {
    e.preventDefault();
    const f = form;
    // validations
    if (!f.item.trim()) return toast.error("Item (ObjectId) is required");
    if (!TYPE_OPTS.includes(f.type)) return toast.error("Invalid type");
    if (String(f.quantity).trim() === "") return toast.error("Quantity is required");
    if (Number(f.quantity) < 0) return toast.error("Quantity must be >= 0");
    if (Number(f.unitCost) < 0) return toast.error("Unit cost must be >= 0");
    if (!f.name.trim()) return toast.error("Name is required");
    if (!STATUS_OPTS.includes(f.status)) return toast.error("Invalid status");

    try {
      setCreating(true);
      const payload = {
        item: f.item.trim(),
        type: f.type,
        quantity: Number(f.quantity),
        unitCost: Number(f.unitCost || 0),
        name: f.name.trim(),
        category: f.category?.trim() || "General",
        description: f.description || "",
        location: f.location?.trim() || "Main Warehouse",
        purchaseDate: f.purchaseDate ? new Date(f.purchaseDate) : undefined,
        expiryDate: f.expiryDate ? new Date(f.expiryDate) : undefined,
        status: f.status,
      };
      await InvAPI.create(payload);
      toast.success("Inventory record created");
      setOpenCreate(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || e?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  }

  /* drawer open/close */
  async function openDrawer(row) {
    try {
      const id = row?._id;
      if (!id) return;
      const res = await InvAPI.get(id);
      setDrawer(res?.data || row);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Open failed");
    }
  }
  function closeDrawer() {
    setDrawer(null);
  }
  async function saveDrawer() {
    if (!drawer?._id) return;
    // minimal validation
    if (!drawer.name?.trim()) return toast.error("Name is required");
    if (!STATUS_OPTS.includes(drawer.status)) return toast.error("Invalid status");
    try {
      setSavingDrawer(true);
      const payload = {
        ...drawer,
        purchaseDate: drawer.purchaseDate ? new Date(drawer.purchaseDate) : undefined,
        expiryDate: drawer.expiryDate ? new Date(drawer.expiryDate) : undefined,
      };
      await InvAPI.update(drawer._id, payload);
      toast.success("Inventory updated");
      setSavingDrawer(false);
      setDrawer(null);
      await load();
    } catch (e) {
      console.error(e);
      setSavingDrawer(false);
      toast.error(e?.response?.data?.error || e?.message || "Update failed");
    }
  }

  /* inline status change */
  async function changeStatusInline(row, status) {
    if (!STATUS_OPTS.includes(status)) return toast.error("Invalid status");
    try {
      await InvAPI.update(row._id, { status });
      toast.success("Status updated");
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Update failed");
    }
  }

  /* delete */
  async function onDelete(row) {
    const ok = confirm(`Delete record ${row.inventoryID || row._id}? This cannot be undone.`);
    if (!ok) return;
    try {
      await InvAPI.remove(row._id);
      toast.success("Deleted");
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Delete failed");
    }
  }

  /* export */
  function exportCSV() {
    if (!filtered.length) return toast.error("Nothing to export");
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ------------ Render ------------ */
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Mini dashboard */}
        <aside className="lg:col-span-1">
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                <Boxes className={`h-5 w-5 ${ICON_COLOR}`} />
                Inventory Dashboard
              </h2>

              {/* Nav */}
              <div className="space-y-2">
                <SideTab active={tab === "Overview"} icon={<ClipboardList className={`h-4 w-4 ${ICON_COLOR}`} />} onClick={() => setTab("Overview")}>
                  Overview
                </SideTab>
                <SideTab active={tab === "Activity"} icon={<ListOrdered className={`h-4 w-4 ${ICON_COLOR}`} />} onClick={() => setTab("Activity")}>
                  Activity Logs
                </SideTab>
                <SideTab active={tab === "Settings"} icon={<Settings className={`h-4 w-4 ${ICON_COLOR}`} />} onClick={() => setTab("Settings")}>
                  Settings
                </SideTab>
                <SideTab active={tab === "Lists"} icon={<Layers3 className={`h-4 w-4 ${ICON_COLOR}`} />} onClick={() => setTab("Lists")}>
                  Lists
                </SideTab>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
                  >
                    <Plus size={16} />
                    New Record
                  </button>
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* RIGHT: Content */}
        <main className="lg:col-span-2 space-y-6">
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
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium mb-2">By Type</div>
                    <TypeBars rows={rows} />
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium mb-2">By Status</div>
                    <StatusBars rows={rows} />
                  </div>
                </div>
                <div className="mt-4 rounded-lg border p-3">
                  <div className="text-sm font-medium">Estimated Inventory Value</div>
                  <div className="text-2xl font-semibold mt-1">LKR {fmtNum(stats.totalValue, 2)}</div>
                  <div className="text-xs text-neutral-500 mt-1">Sum of quantity × unitCost (all rows)</div>
                </div>
              </div>
            </>
          )}

          {/* Activity */}
          {tab === "Activity" && (
            <div className={CARD}>
              <div className="p-4 border-b">
                <div className="font-medium">Recent Activity</div>
                <p className="text-xs text-neutral-500">Created & updated timestamps.</p>
              </div>
              <ul className="divide-y">
                {rows.slice(0, 25).map((r) => (
                  <li key={r._id} className="p-4 text-sm">
                    <span className="font-medium">{r.inventoryID || r._id}</span>
                    <span className="text-neutral-500"> — {r.name} </span>
                    <span className="text-neutral-500">· type </span>
                    <span>{r.type}</span>
                    <span className="text-neutral-500"> · created </span>
                    <span>{fmtDate(r.createdAt)}</span>
                    <span className="text-neutral-500"> · updated </span>
                    <span>{fmtDate(r.updatedAt)}</span>
                  </li>
                ))}
                {rows.length === 0 && <li className="p-4 text-neutral-500 text-sm">No activity.</li>}
              </ul>
            </div>
          )}

          {/* Settings (placeholder like ManageUserAdmin) */}
          {tab === "Settings" && (
            <div className={CARD}>
              <div className="p-4 border-b">
                <div className="font-medium">Inventory Settings</div>
                <p className="text-xs text-neutral-500">Display hints—wire to backend if needed.</p>
              </div>
              <div className="p-4 grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium">Reorder Thresholds</div>
                  <p className="mt-2 text-sm text-neutral-600">Configure per category from backend as needed.</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium">Warehouse Locations</div>
                  <p className="mt-2 text-sm text-neutral-600">Manage locations table elsewhere.</p>
                </div>
              </div>
            </div>
          )}

          {/* Lists (table) */}
          {tab === "Lists" && (
            <>
              {/* Controls */}
              <div className={`${CARD} p-3`}>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                      <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
                      <input
                        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                        placeholder="Search ID / name / category / location…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <FilterChip label="Type" value={filterType} onChange={setFilterType} options={["All", ...TYPE_OPTS]} />
                    <FilterChip label="Status" value={filterStatus} onChange={setFilterStatus} options={["All", ...STATUS_OPTS]} />
                    <FilterChip label="Category" value={filterCategory} onChange={setFilterCategory} options={categories} />
                    <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
                      <Download className="h-4 w-4" /> Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-600">
                      <tr>
                        <th className="text-left p-3">Inventory</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Qty</th>
                        <th className="text-left p-3">Unit Cost</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Dates</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading &&
                        filtered.map((r) => (
                          <tr key={r._id} className="border-t hover:bg-neutral-50/60">
                            <td className="p-3">
                              <button className="text-left" onClick={() => openDrawer(r)} title="View / Edit">
                                <div className="font-medium text-neutral-800">{r.name || "—"}</div>
                                <div className="text-xs text-neutral-500">
                                  {(r.inventoryID || r._id) || "—"} · {r.category || "—"} · {r.location || "—"}
                                </div>
                              </button>
                            </td>
                            <td className="p-3">{r.type}</td>
                            <td className="p-3">{r.quantity}</td>
                            <td className="p-3">LKR {fmtNum(r.unitCost)}</td>
                            <td className="p-3">
                              <select
                                className="rounded-lg border px-2 py-1.5 text-sm"
                                value={r.status || "in_stock"}
                                onChange={(e) => changeStatusInline(r, e.target.value)}
                              >
                                {STATUS_OPTS.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3 text-xs">
                              <div>Purchased: {toISODateInput(r.purchaseDate) || "—"}</div>
                              <div>Expiry: {toISODateInput(r.expiryDate) || "—"}</div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openDrawer(r)}
                                  className="px-2 py-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => onDelete(r)}
                                  className="px-3 py-1.5 rounded-full border border-rose-200 text-rose-600 bg-white hover:bg-rose-50"
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
                          <td className="p-8 text-center text-neutral-500" colSpan={7}>
                            {rows.length === 0
                              ? "No inventory records. Ensure GET /api/inventory returns an array."
                              : "No results match your filters."}
                          </td>
                        </tr>
                      )}

                      {loading && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={7}>
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
        </main>
      </div>

      {/* Create Modal */}
      {openCreate && (
        <Modal title="Create Inventory Record" onClose={closeCreateModal}>
          <form onSubmit={submitCreate} className="space-y-5">
            <Section title="Item & Movement">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Item (ObjectId) *">
                  <Input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} required />
                </Field>
                <Field label="Type *">
                  <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TYPE_OPTS} />
                </Field>
                <Field label="Status *">
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUS_OPTS} />
                </Field>
              </div>
            </Section>

            <Section title="Details">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Name *">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </Field>
                <Field label="Category">
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </Field>
                <Field label="Location">
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </Field>
                <Field label="Quantity *">
                  <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                </Field>
                <Field label="Unit Cost (LKR)">
                  <Input type="number" min={0} step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3 sm:col-span-1">
                  <Field label="Purchase Date">
                    <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
                  </Field>
                  <Field label="Expiry Date">
                    <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                  </Field>
                </div>
                <Field label="Description" className="sm:col-span-3">
                  <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field>
              </div>
            </Section>

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setForm(EMPTY)} className="px-4 py-2 rounded-xl border border-neutral-200">
                Clear
              </button>
              <button type="submit" disabled={creating} className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} disabled:opacity-60`}>
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit/View Drawer */}
      {drawer && (
        <SlideOver title="Inventory Record" onClose={closeDrawer}>
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium mb-2">Identifiers</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Inventory ID">
                  <Input value={drawer.inventoryID || ""} disabled />
                </Field>
                <Field label="Record ID">
                  <Input value={drawer._id || ""} disabled />
                </Field>
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium mb-2">Core</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Item (ObjectId)">
                  <Input value={drawer.item || ""} onChange={(e) => setDrawer({ ...drawer, item: e.target.value })} />
                </Field>
                <Field label="Type">
                  <Select value={drawer.type} onChange={(e) => setDrawer({ ...drawer, type: e.target.value })} options={TYPE_OPTS} />
                </Field>
                <Field label="Status">
                  <Select value={drawer.status} onChange={(e) => setDrawer({ ...drawer, status: e.target.value })} options={STATUS_OPTS} />
                </Field>
                <Field label="Name">
                  <Input value={drawer.name || ""} onChange={(e) => setDrawer({ ...drawer, name: e.target.value })} />
                </Field>
                <Field label="Category">
                  <Input value={drawer.category || ""} onChange={(e) => setDrawer({ ...drawer, category: e.target.value })} />
                </Field>
                <Field label="Location">
                  <Input value={drawer.location || ""} onChange={(e) => setDrawer({ ...drawer, location: e.target.value })} />
                </Field>
                <Field label="Quantity">
                  <Input type="number" min={0} value={drawer.quantity ?? ""} onChange={(e) => setDrawer({ ...drawer, quantity: e.target.value })} />
                </Field>
                <Field label="Unit Cost (LKR)">
                  <Input type="number" min={0} step="0.01" value={drawer.unitCost ?? ""} onChange={(e) => setDrawer({ ...drawer, unitCost: e.target.value })} />
                </Field>
                <Field label="Purchase Date">
                  <Input
                    type="date"
                    value={toISODateInput(drawer.purchaseDate)}
                    onChange={(e) => setDrawer({ ...drawer, purchaseDate: e.target.value })}
                  />
                </Field>
                <Field label="Expiry Date">
                  <Input
                    type="date"
                    value={toISODateInput(drawer.expiryDate)}
                    onChange={(e) => setDrawer({ ...drawer, expiryDate: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-3">
                  <Field label="Description">
                    <Textarea rows={4} value={drawer.description || ""} onChange={(e) => setDrawer({ ...drawer, description: e.target.value })} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={closeDrawer} className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50">
                Cancel
              </button>
              <button type="button" onClick={saveDrawer} disabled={savingDrawer} className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} disabled:opacity-60`}>
                {savingDrawer ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </SlideOver>
      )}
    </div>
  );
}

/* ---------- small UI bits (same style as users page) ---------- */

function SideTab({ active, icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition border",
        active ? "bg-white shadow-sm border-transparent" : "bg-white hover:bg-neutral-50 border-neutral-200",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2 text-neutral-800">
        <span>{icon}</span>
        {children}
      </span>
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
      <span className="text-neutral-600 inline-flex items-center gap-1"><Filter className="h-4 w-4" /> {label}</span>
      <select className="rounded-lg border px-2 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
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
function Field({ label, children }) {
  return (
    <label className="block">
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
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
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
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
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
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
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

function StatusBars({ rows }) {
  const counts = STATUS_OPTS.reduce((acc, s) => ((acc[s] = 0), acc), {});
  rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const data = STATUS_OPTS.map((s) => ({ name: s, value: counts[s] || 0 }));
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2">
          <div className="w-28 text-xs text-neutral-600 capitalize">{d.name.replaceAll("_"," ")}</div>
          <div className="flex-1 h-3 bg-neutral-100 rounded">
            <div className="h-3 rounded" style={{ width: `${(d.value / max) * 100}%`, background: "linear-gradient(90deg,#DA22FF,#9733EE)" }} />
          </div>
          <div className="w-8 text-right text-xs text-neutral-700">{d.value}</div>
        </div>
      ))}
    </div>
  );
}
function TypeBars({ rows }) {
  const counts = TYPE_OPTS.reduce((acc, t) => ((acc[t] = 0), acc), {});
  rows.forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });
  const data = TYPE_OPTS.map((t) => ({ name: t, value: counts[t] || 0 }));
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2">
          <div className="w-28 text-xs text-neutral-600">{d.name}</div>
          <div className="flex-1 h-3 bg-neutral-100 rounded">
            <div className="h-3 rounded" style={{ width: `${(d.value / max) * 100}%`, background: "linear-gradient(90deg,#DA22FF,#9733EE)" }} />
          </div>
          <div className="w-8 text-right text-xs text-neutral-700">{d.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Modal & SlideOver ---------- */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Content */}
      <div
        className={`relative z-[1001] w-full max-w-3xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-white max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white">
            <div className="font-semibold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md hover:bg-neutral-100"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-neutral-700" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
function SlideOver({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button type="button" onClick={onClose} className="p-2 rounded hover:bg-neutral-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 overflow-auto">{children}</div>
      </aside>
    </div>
  );
}
