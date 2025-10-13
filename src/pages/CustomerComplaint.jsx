// src/pages/CustomerComplaint.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  // page actions
  Plus,
  Search,
  RefreshCcw,
  Eye,
  Pencil,
  Trash2,
  X,
  Mail,
  User,
  Tag,
  // sidebar icons (match ManageProfileCustomer)
  LayoutDashboard,
  Settings,
  ChevronRight,
  ChevronUp,
  CalendarCheck2,
  History,
  MessagesSquare,
  PhoneCall,
  MessageSquareText,
  AlertCircle,
} from "lucide-react";
import { NavLink } from "react-router-dom";

/* ---- Theme tokens (green, same as ManageProfileCustomer) ---- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ---- Persisted sidebar state key (same as ManageProfileCustomer) ---- */
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

/* ---- API ---- */
const ComplaintAPI = {
  list: () => api.get("/api/complaints"),
  get: (id) => api.get(`/api/complaints/${id}`),
  create: (payload) => api.post("/api/complaints", payload),
  update: (id, payload) => api.put(`/api/complaints/${id}`, payload),
  remove: (id) => api.delete(`/api/complaints/${id}`),
};

/* ---- Helpers ---- */
const SERVICES = ["Tour Package", "Vehicle", "Accommodation", "Meal", "Other"];
const CATEGORIES = ["Service Quality", "Delay", "Billing", "Safety", "Other"];
const EDIT_WINDOW_MIN = 60;

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
function minutesSince(dateStr) {
  if (!dateStr) return Infinity;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 60000;
}

/* ---- Page ---- */
export default function CustomerComplaint() {
  // Sidebar accordions (persisted) — same keys as ManageProfileCustomer
  const [open, setOpen] = useState({
    overview: true,
    bookings: true,
    payments: true, // used for "Feedbacks & Complaints"
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

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // search & filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  // modals
  const [openView, setOpenView] = useState(false);
  const [active, setActive] = useState(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  // form: create/edit (status not user-editable here)
  const [form, setForm] = useState({
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    email: myEmail,
    service: SERVICES[0],
    category: CATEGORIES[0],
    description: "",
  });

  function resetForm() {
    setForm({
      name: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      email: myEmail,
      service: SERVICES[0],
      category: CATEGORIES[0],
      description: "",
    });
  }

  async function load() {
    try {
      setLoading(true);
      const res = await ComplaintAPI.list();
      const arr = Array.isArray(res?.data?.complaints) ? res.data.complaints : [];
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

  // mine only
  const mine = useMemo(
    () => rows.filter((c) => (c.email || "").toLowerCase() === myEmail.toLowerCase()),
    [rows, myEmail]
  );

  // distinct statuses from my data (for filter dropdown)
  const myStatuses = useMemo(() => {
    const s = new Set(mine.map((c) => c.status || "Open"));
    return ["", ...Array.from(s)];
  }, [mine]);

  // filtered view
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return mine
      .filter((c) => (!statusFilter ? true : (c.status || "Open") === statusFilter))
      .filter((c) => (!serviceFilter ? true : (c.service || "") === serviceFilter))
      .filter((c) => {
        if (!t) return true;
        const hay = [c.service, c.category, c.description, c.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(t);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [mine, q, statusFilter, serviceFilter]);

  const stats = useMemo(() => {
    const openCount = mine.filter((c) => (c.status || "Open").toLowerCase() === "open").length;
    const editableNow = mine.filter((c) => minutesSince(c.createdAt) <= EDIT_WINDOW_MIN).length;
    return { total: mine.length, openCount, editableNow };
  }, [mine]);

  function isMine(doc) {
    return (doc?.email || "").toLowerCase() === myEmail.toLowerCase();
  }
  function canEdit(doc) {
    return isMine(doc) && minutesSince(doc?.createdAt) <= EDIT_WINDOW_MIN;
  }

  /* ---- open modals ---- */
  function openViewModal(doc) {
    if (!isMine(doc)) return;
    setActive(doc);
    setOpenView(true);
  }
  function openCreate() {
    resetForm();
    setEditId(null);
    setOpenEdit(true);
  }
  function openEditModal(doc) {
    if (!isMine(doc)) return;
    if (!canEdit(doc)) {
      const mins = Math.max(0, Math.floor(minutesSince(doc.createdAt)));
      return toast.error(
        `Editing closed (${mins} min since creation). You can edit for ${EDIT_WINDOW_MIN} minutes after creating.`
      );
    }
    setEditId(doc._id);
    setForm({
      name: doc.name || [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      email: myEmail,
      service: doc.service || SERVICES[0],
      category: doc.category || CATEGORIES[0],
      description: doc.description || "",
    });
    setOpenEdit(true);
  }

  /* ---- save & delete ---- */
  async function saveComplaint(e) {
    e.preventDefault();
    if (!String(form.service).trim()) return toast.error("Service is required");
    if (!String(form.category).trim()) return toast.error("Category is required");
    if (!String(form.description).trim()) return toast.error("Description is required");

    try {
      if (editId) {
        // make sure still within window (in case they waited with modal open)
        const latest = mine.find((c) => c._id === editId);
        if (!latest || !canEdit(latest)) {
          setOpenEdit(false);
          return toast.error("Edit window ended. Changes were not saved.");
        }
        await ComplaintAPI.update(editId, {
          name: form.name || undefined,
          email: myEmail,
          service: form.service,
          category: form.category,
          description: form.description,
          // status is not user-editable here
        });
        toast.success("Complaint updated");
      } else {
        await ComplaintAPI.create({
          name: form.name || undefined,
          email: myEmail,
          service: form.service,
          category: form.category,
          description: form.description,
          status: "Open", // default
        });
        toast.success("Complaint submitted");
      }
      setOpenEdit(false);
      await load();
    } catch {
      // interceptor shows error
    }
  }

  async function removeComplaint(doc) {
    if (!isMine(doc)) return toast.error("You can only delete your own complaint");
    if (!window.confirm("Delete this complaint?")) return;
    try {
      await ComplaintAPI.remove(doc._id);
      toast.success("Complaint deleted");
      await load();
    } catch {
      // interceptor shows error
    }
  }

  if (!user?.email) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <Toaster position="top-right" />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="rounded-xl border bg-white p-6 text-center">
            <h2 className="text-lg font-semibold mb-1">Sign in required</h2>
            <p className="text-sm text-neutral-600">Please sign in to manage your complaints.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (same style as ManageProfileCustomer) ===== */}
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
                <span className={gradText}>My</span> Complaints
              </h2>
              <p className="text-sm text-neutral-500">
                You can edit a complaint only within {EDIT_WINDOW_MIN} minutes after creating it.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search (green focus) */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search my complaints…"
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
                onClick={openCreate}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-90 active:opacity-80`}
              >
                <Plus size={16} />
                New
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat title="My complaints" value={stats.total} />
            <Stat title="Open complaints" value={stats.openCount} />
            <Stat title="Editable now" value={stats.editableNow} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
            >
              <option value="">All services</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
            >
              {myStatuses.map((s) => (
                <option key={s || "all"} value={s}>
                  {s ? s : "All status"}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">
                {loading ? "Loading…" : `${filtered.length} of ${mine.length} complaints`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="text-left p-3">Service</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    filtered.map((c) => {
                      const editable = canEdit(c);
                      const minsAgo = Math.floor(minutesSince(c.createdAt));
                      return (
                        <tr key={c._id} className="border-t hover:bg-neutral-50/60">
                          <td className="p-3">{c.service || "—"}</td>
                          <td className="p-3">{c.category || "—"}</td>
                          <td className="p-3 max-w-[42ch] truncate" title={c.description || ""}>
                            {c.description || "—"}
                          </td>
                          <td className="p-3">
                            <StatusPill value={c.status || "Open"} />
                          </td>
                          <td className="p-3">
                            {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                                onClick={() => openViewModal(c)}
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                className={`px-2 py-1 rounded-lg border border-neutral-200 bg-white ${
                                  editable ? "hover:bg-neutral-50" : "opacity-50 cursor-not-allowed"
                                }`}
                                onClick={() => editable && openEditModal(c)}
                                title={
                                  editable
                                    ? "Edit"
                                    : `Editing closed (${minsAgo} min since creation; window is ${EDIT_WINDOW_MIN} min).`
                                }
                                disabled={!editable}
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                                onClick={() => removeComplaint(c)}
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
                      <td className="p-8 text-center text-neutral-500" colSpan={6}>
                        {mine.length
                          ? "No complaints match your search/filters."
                          : "You haven't submitted any complaints yet."}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Row label="Service" icon={<Tag className="h-4 w-4" />}>
                        {active.service || "—"}
                      </Row>
                      <Row label="Category" icon={<Tag className="h-4 w-4" />}>
                        {active.category || "—"}
                      </Row>
                    </div>

                    <div>
                      <label className="text-sm text-neutral-600">Description</label>
                      <Textarea rows={5} value={active.description || ""} readOnly disabled />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-neutral-600">Status</label>
                        <div className="mt-1">
                          <StatusPill value={active.status || "Open"} />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-neutral-600">Editable until</label>
                        <input
                          readOnly
                          className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50"
                          value={
                            active.createdAt
                              ? new Date(new Date(active.createdAt).getTime() + EDIT_WINDOW_MIN * 60000).toLocaleString()
                              : "—"
                          }
                        />
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

          {/* Create / Edit modal */}
          {openEdit && (
            <Modal onClose={() => setOpenEdit(false)}>
              <div className={`w-full max-w-xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
                <div className="rounded-2xl bg-white">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                    <div className="font-semibold">{editId ? "Edit Complaint" : "New Complaint"}</div>
                    <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpenEdit(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={saveComplaint} className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input value={myEmail} readOnly disabled />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Service *</Label>
                        <Select
                          value={form.service}
                          onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                          options={SERVICES}
                        />
                      </div>
                      <div>
                        <Label>Category *</Label>
                        <Select
                          value={form.category}
                          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                          options={CATEGORIES}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Description *</Label>
                      <Textarea
                        rows={5}
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Describe the issue…"
                        required
                      />
                    </div>

                    {editId ? (
                      <div className="text-xs text-neutral-500">
                        You can edit a complaint only within {EDIT_WINDOW_MIN} minutes of creation.
                      </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                        onClick={() => setOpenEdit(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className={`px-4 py-2 rounded-xl text-white ${GRAD_BG}`}>
                        {editId ? "Save changes" : "Create"}
                      </button>
                    </div>
                  </form>
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
        props.disabled ? "bg-neutral-50 text-neutral-600" : "",
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
        props.disabled ? "bg-neutral-50 text-neutral-600" : "",
      ].join(" ")}
    />
  );
}
function Select({ value, onChange, options = [] }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-xl border border-neutral-200 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
    >
      {options.map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
    </select>
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
  const v = (value || "Open").toLowerCase();
  let cls =
    "bg-neutral-100 text-neutral-700 ring-neutral-200"; // default
  if (v === "open") cls = "bg-amber-50 text-amber-700 ring-amber-200";
  else if (v.includes("progress")) cls = "bg-blue-50 text-blue-700 ring-blue-200";
  else if (v === "resolved") cls = "bg-emerald-50 text-emerald-700 ring-emerald-200";
  else if (v === "closed") cls = "bg-neutral-100 text-neutral-700 ring-neutral-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {value || "Open"}
    </span>
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
