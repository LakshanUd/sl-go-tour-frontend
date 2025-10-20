// src/pages/CustomerFeedback.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  Search,
  RefreshCcw,
  Star,
  Eye,
  Pencil,
  Trash2,
  X,
  Mail,
  User,
  // Sidebar icons (match ManageProfileCustomer)
  LayoutDashboard,
  Settings,
  ChevronRight,
  ChevronUp,
  CalendarCheck2,
  History,
  MessageSquareText,
  MessagesSquare,
  PhoneCall,
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

/* ---- API ---- */
const FeedbackAPI = {
  list: () => api.get("/api/feedbacks"),
  get: (id) => api.get(`/api/feedbacks/${id}`),
  create: (payload) => api.post("/api/feedbacks", payload),
  update: (id, payload) => api.put(`/api/feedbacks/${id}`, payload),
  remove: (id) => api.delete(`/api/feedbacks/${id}`),
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

/* ---- Page ---- */
export default function CustomerFeedback() {
  // Sidebar accordions (persisted) — same keys as ManageProfileCustomer
  const [open, setOpen] = useState({
    overview: true,
    bookings: true,
    payments: true, // here: Feedbacks & Complaints
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

  // search & filter
  const [q, setQ] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  // view modal
  const [openView, setOpenView] = useState(false);
  const [active, setActive] = useState(null);

  // create / edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    email: myEmail,
    message: "",
    rating: 5,
    isAnonymous: false,
  });

  function resetForm() {
    setForm({
      name: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      email: myEmail,
      message: "",
      rating: 5,
      isAnonymous: false,
    });
  }

  async function load() {
    try {
      setLoading(true);
      const res = await FeedbackAPI.list();
      const arr = Array.isArray(res?.data) ? res.data : res?.data?.feedbacks || [];
      setRows(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load feedback");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // only my feedbacks (client-side)
  const mine = useMemo(
    () => rows.filter((f) => (f.email || "").toLowerCase() === myEmail.toLowerCase()),
    [rows, myEmail]
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return mine.filter((f) => {
      const textMatch = !t || [f.message].filter(Boolean).join(" ").toLowerCase().includes(t);
      const ratingMatch = !ratingFilter || String(f.rating) === String(ratingFilter);
      return textMatch && ratingMatch;
    });
  }, [mine, q, ratingFilter]);

  const avgRating = useMemo(() => {
    if (!mine.length) return 0;
    const sum = mine.reduce((s, r) => s + Number(r.rating || 0), 0);
    return (sum / mine.length).toFixed(2);
  }, [mine]);

  /* ---- View (read-only) ---- */
  function openViewModal(doc) {
    if (!isMine(doc)) return;
    setActive(doc);
    setOpenView(true);
  }

  /* ---- Create / Edit ---- */
  function openCreate() {
    resetForm();
    setEditId(null);
    setOpenEdit(true);
  }
  function openEditModal(doc) {
    if (!isMine(doc)) return;
    setEditId(doc._id);
    setForm({
      name: doc.name || [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      email: doc.email || myEmail,
      message: doc.message || "",
      rating: Number(doc.rating) || 5,
      isAnonymous: String(doc.name || "").trim().toLowerCase() === "anonymous",
    });
    setOpenEdit(true);
  }

  function isMine(doc) {
    return (doc?.email || "").toLowerCase() === myEmail.toLowerCase();
  }

  async function saveFeedback(e) {
    e.preventDefault();
    if (!form.rating || form.rating < 1 || form.rating > 5) return toast.error("Rating must be 1–5");

    try {
      if (editId) {
        const doc = mine.find((f) => f._id === editId);
        if (!doc) return toast.error("Not allowed to edit this feedback");
        await FeedbackAPI.update(editId, {
          name: form.isAnonymous ? "Anonymous" : (form.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ")) || undefined,
          email: myEmail, // enforce my email on update
          message: form.message,
          rating: Number(form.rating),
        });
        toast.success("Feedback updated");
      } else {
        await FeedbackAPI.create({
          name: form.isAnonymous ? "Anonymous" : (form.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ")) || undefined,
          email: myEmail,
          message: form.message,
          rating: Number(form.rating),
        });
        toast.success("Feedback posted");
      }
      setOpenEdit(false);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed");
    }
  }

  async function remove(doc) {
    if (!isMine(doc)) return toast.error("You can only delete your own feedback");
    if (!window.confirm("Delete this feedback?")) return;
    try {
      await FeedbackAPI.remove(doc._id);
      toast.success("Feedback deleted");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  if (!user?.email) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <Toaster position="top-right" />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="rounded-xl border bg-white p-6 text-center">
            <h2 className="text-lg font-semibold mb-1">Sign in required</h2>
            <p className="text-sm text-neutral-600">Please sign in to manage your feedback.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (same as ManageProfileCustomer) ===== */}
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

            {/* Feedbacks & Complaints (we're active on My Feedbacks) */}
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
                <span className={gradText}>My</span> Feedback
              </h2>
              <p className="text-sm text-neutral-500">
                Create, update, and remove your feedback. Others’ feedback is hidden.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search (green focus) */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search my messages…"
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
            <Stat title="My feedback" value={mine.length} />
            <Stat title="My avg rating" value={mine.length ? `${avgRating} / 5` : "—"} />
            <Stat title="5★ share" value={`${share(mine, 5)}%`} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
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
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">
                {loading ? "Loading…" : `${filtered.length} of ${mine.length} feedback`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="text-left p-3">Message</th>
                    <th className="text-left p-3">Rating</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    filtered.map((f) => (
                      <tr key={f._id} className="border-t hover:bg-neutral-50/60">
                        <td className="p-3">
                          <div className="line-clamp-2 max-w-[46ch] text-neutral-700">
                            {f.message || "—"}
                          </div>
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
                              className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                              onClick={() => openEditModal(f)}
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                              onClick={() => remove(f)}
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
                      <td className="p-8 text-center text-neutral-500" colSpan={4}>
                        {mine.length
                          ? "No feedback matches your search/filters."
                          : "You haven't posted any feedback yet."}
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

          {/* View modal (read-only) */}
          {openView && active && (
            <Modal onClose={() => setOpenView(false)}>
              <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
                <div className="rounded-2xl bg-white">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                    <div className="font-semibold">Feedback Details</div>
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

                    <div>
                      <label className="text-sm text-neutral-600">Message</label>
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

          {/* Create / Edit modal */}
          {openEdit && (
            <Modal onClose={() => setOpenEdit(false)}>
              <div className={`w-full max-w-xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
                <div className="rounded-2xl bg-white">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                    <div className="font-semibold">{editId ? "Edit Feedback" : "New Feedback"}</div>
                    <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpenEdit(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={saveFeedback} className="p-4 space-y-4">
                    {/* Anonymous toggle (hide name/email inputs) */}
                    <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 bg-neutral-50">
                      <div className="text-sm text-neutral-700">
                        Post as <span className="font-medium">Anonymous</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, isAnonymous: !f.isAnonymous }))}
                        aria-pressed={form.isAnonymous}
                        className={[
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          form.isAnonymous ? "bg-emerald-500" : "bg-neutral-300",
                        ].join(" ")}
                        title="Toggle Anonymous"
                      >
                        <span
                          className={[
                            "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                            form.isAnonymous ? "translate-x-5" : "translate-x-1",
                          ].join(" ")}
                        />
                      </button>
                    </div>

                    <div>
                      <Label>Message</Label>
                      <Textarea
                        rows={5}
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Rating *</Label>
                      <RatingPicker
                        value={Number(form.rating)}
                        onChange={(n) => setForm((f) => ({ ...f, rating: n }))}
                      />
                    </div>

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
function ratingLabel(n) {
  const x = Math.max(1, Math.min(5, Number(n)));
  switch (x) {
    case 1:
      return "Poor";
    case 2:
      return "Below Average";
    case 3:
      return "Average";
    case 4:
      return "Good";
    case 5:
    default:
      return "Excellent";
  }
}
function StarRow({ value = 0 }) {
  const n = Math.max(0, Math.min(5, Number(value)));
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={"h-4 w-4 " + (i < n ? "fill-current" : "")} />
      ))}
      {n > 0 && (
        <span className="ml-1 text-xs text-neutral-700">{ratingLabel(n)}</span>
      )}
    </div>
  );
}
function RatingPicker({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={[
            "p-1 rounded-md",
            n <= value ? "text-amber-500" : "text-neutral-400 hover:text-neutral-600",
          ].join(" ")}
        >
          <Star className={"h-5 w-5 " + (n <= value ? "fill-current" : "")} />
        </button>
      ))}
      {value ? (
        <span className="ml-2 text-sm text-neutral-700">{ratingLabel(value)}</span>
      ) : null}
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

/* ===== Sidebar bits (shared with ManageProfileCustomer) ===== */
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

/* ---------- util ---------- */
function share(rows, stars) {
  const n = rows.length;
  if (!n) return 0;
  const count = rows.filter((r) => Number(r.rating) === Number(stars)).length;
  return Math.round((count / n) * 100);
}
