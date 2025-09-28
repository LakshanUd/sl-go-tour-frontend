// src/pages/Admin/ManageComplaintAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Search,
  RefreshCcw,
  Filter,
  Plus,
  Eye,
  Trash2,
  X,
  Mail,
  User,
  Tag,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  FileText as FileTextIcon,
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
const ComplaintsAPI = {
  list: () => api.get("/api/complaints"),
  get: (id) => api.get(`/api/complaints/${id}`),
  create: (payload) => api.post("/api/complaints", payload),
  update: (id, payload) => api.put(`/api/complaints/${id}`, payload),
  remove: (id) => api.delete(`/api/complaints/${id}`),
};

/* Optional status presets (your model allows any string; default "Open") */
const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

/* New complaint form defaults (for quick testing) */
const EMPTY = {
  name: "",
  email: "",
  service: "",
  category: "",
  description: "",
  status: "Open",
};

export default function ManageComplaintAdmin() {
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
  const [status, setStatus] = useState(""); // any | Open | In Progress | ...
  const [category, setCategory] = useState("");

  // view/update modal
  const [openView, setOpenView] = useState(false);
  const [active, setActive] = useState(null);
  const [activeStatus, setActiveStatus] = useState("Open");

  // create modal (optional)
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function load() {
    try {
      setLoading(true);
      const res = await ComplaintsAPI.list();
      const arr = Array.isArray(res?.data) ? res.data : res?.data?.complaints || [];
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

  const categories = useMemo(() => {
    const s = new Set();
    rows.forEach((c) => c?.category && s.add(c.category));
    return Array.from(s);
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((c) => {
      const matchText =
        !t ||
        [c.name, c.email, c.service, c.category, c.description, c.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(t);
      const matchStatus = !status || c.status === status;
      const matchCat = !category || c.category === category;
      return matchText && matchStatus && matchCat;
    });
  }, [rows, q, status, category]);

  function openViewModal(doc) {
    setActive(doc);
    setActiveStatus(doc?.status || "Open");
    setOpenView(true);
  }

  async function saveStatus() {
    if (!active?._id) return;
    try {
      await ComplaintsAPI.update(active._id, { status: activeStatus });
      toast.success("Status updated");
      setOpenView(false);
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  // UPDATED: confirm deletion with confirmToast
  async function remove(id) {
    const ok = await confirmToast({
      title: "Delete this complaint?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      position: "top-right",
    });
    if (!ok) return;

    try {
      await ComplaintsAPI.remove(id);
      toast.success("Complaint deleted");
      await load();
    } catch {
      /* handled by interceptor */
    }
  }

  async function createComplaint(e) {
    e.preventDefault();
    if (!form.service.trim() || !form.category.trim() || !form.description.trim()) {
      toast.error("Service, Category, and Description are required");
      return;
    }
    try {
      await ComplaintsAPI.create({
        name: form.name || undefined,
        email: form.email || undefined,
        service: form.service,
        category: form.category,
        description: form.description,
        status: form.status || "Open",
      });
      toast.success("Complaint created");
      setOpenCreate(false);
      setForm(EMPTY);
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
                <RailLink to="/admin/manage-blogs" icon={<FileTextIcon className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Blogs</span>
                </RailLink>
                <RailLink to="/admin/manage-meals" icon={<FileTextIcon className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Meals</span>
                </RailLink>
                <RailLink to="/admin/manage-accommodations" icon={<FileTextIcon className={`h-4 w-4 ${ICON_COLOR}`} />}>
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
                <RailLink to="/admin/manage-complaints" icon={<FileTextIcon className={`h-4 w-4 ${ICON_COLOR}`} />}>
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
                <RailLink to="/admin/reports" icon={<FileTextIcon className={`h-4 w-4 ${ICON_COLOR}`} />}>
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
                <span className={gradText}>Content</span> · Complaints
              </h2>
              <p className="text-sm text-neutral-500">Review, triage, and resolve user complaints.</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search name/email/service/desc…"
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

              {/* Create (for quick testing) */}
              <button
                onClick={() => setOpenCreate(true)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
              >
                <Plus size={16} />
                New
              </button>
            </div>
          </div>

          {/* Filters + info */}
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-neutral-600 text-sm">
              <Filter className="h-4 w-4" />
              Filters:
            </span>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <span className="text-xs text-neutral-500">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} complaints`}
            </span>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">
                {loading ? "Loading…" : `${filtered.length} of ${rows.length} complaints`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Service</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    filtered.map((c) => (
                      <tr key={c._id} className="border-t">
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-neutral-800">{c.name || "—"}</span>
                            <span className="text-xs text-neutral-500">{c.email || "—"}</span>
                          </div>
                        </td>
                        <td className="p-3">{c.service || "—"}</td>
                        <td className="p-3">{c.category || "—"}</td>
                        <td className="p-3">
                          <StatusPill value={c.status} />
                        </td>
                        <td className="p-3">
                          {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                              onClick={() => openViewModal(c)}
                              title="View / Update"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                              onClick={() => remove(c._id)}
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
                      <td className="p-8 text-center text-neutral-500" colSpan={6}>
                        No complaints found.
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td className="p-8 text-center text-neutral-500" colSpan={6}>
                        Loading complaints…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* View / Update Modal */}
      {openView && active && (
        <Modal onClose={() => setOpenView(false)}>
          <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <div className="font-semibold">Complaint Details</div>
                <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpenView(false)}>
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
                <Row label="Service" icon={<Tag className="h-4 w-4" />}>
                  {active.service || "—"}
                </Row>
                <Row label="Category" icon={<Tag className="h-4 w-4" />}>
                  {active.category || "—"}
                </Row>
                <Row label="Description" icon={<FileText className="h-4 w-4" />}>
                  <div className="text-neutral-800 whitespace-pre-wrap">{active.description || "—"}</div>
                </Row>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-neutral-600">Status</label>
                    <select
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                      value={activeStatus}
                      onChange={(e) => setActiveStatus(e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-neutral-600">Created At</label>
                    <input
                      readOnly
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50"
                      value={active.createdAt ? new Date(active.createdAt).toLocaleString() : "—"}
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
                  <button
                    onClick={saveStatus}
                    className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
                  >
                    Save Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal (optional for testing) */}
      {openCreate && (
        <Modal onClose={() => setOpenCreate(false)}>
          <div className={`w-full max-w-xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <div className="font-semibold">New Complaint (test)</div>
                <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpenCreate(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={createComplaint} className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={onChange("name")} placeholder="Jane Doe" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={onChange("email")} placeholder="jane@example.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Service *</Label>
                    <Input value={form.service} onChange={onChange("service")} placeholder="e.g., Tour Booking" required />
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Input value={form.category} onChange={onChange("category")} placeholder="e.g., Payment" required />
                  </div>
                </div>

                <div>
                  <Label>Description *</Label>
                  <Textarea rows={5} value={form.description} onChange={onChange("description")} required />
                </div>

                <div>
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={onChange("status")}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                    onClick={() => setOpenCreate(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`px-4 py-2 rounded-xl text-white ${GRAD_BG}`}>
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ===== Sidebar bits ===== */
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

/* ---------- Small UI helpers (green focus) ---------- */
function Label({ children }) {
  return <label className="block text-sm text-neutral-700 mb-1">{children}</label>;
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
function Modal({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-[1001] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
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
function StatusPill({ value }) {
  const v = String(value || "Open");
  const tone =
    v === "Resolved" || v === "Closed"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : v === "In Progress"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-rose-50 text-rose-700 ring-rose-200";
  const Icon =
    v === "Resolved" || v === "Closed" ? CheckCircle2 : AlertTriangle;
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone,
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" />
      {v}
    </span>
  );
}
