// src/pages/CustomerFeedback.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus, Search, RefreshCcw, Star, Eye, Pencil, Trash2, X, Mail, User,
} from "lucide-react";

/* ---- Theme tokens ---- */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

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
  });

  function resetForm() {
    setForm({
      name: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      email: myEmail,
      message: "",
      rating: 5,
    });
  }

  async function load() {
    try {
      setLoading(true);
      const res = await FeedbackAPI.list();
      const arr = Array.isArray(res?.data) ? res.data : (res?.data?.feedbacks || []);
      setRows(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load feedback");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

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
    });
    setOpenEdit(true);
  }

  function isMine(doc) {
    return (doc?.email || "").toLowerCase() === myEmail.toLowerCase();
  }

  async function saveFeedback(e) {
    e.preventDefault();
    if (!String(form.message).trim()) return toast.error("Message is required");
    if (!form.rating || form.rating < 1 || form.rating > 5) return toast.error("Rating must be 1–5");

    try {
      if (editId) {
        // update existing (double-check ownership in UI)
        const doc = mine.find((f) => f._id === editId);
        if (!doc) return toast.error("Not allowed to edit this feedback");
        await FeedbackAPI.update(editId, {
          name: form.name || undefined,
          email: myEmail, // enforce my email on update
          message: form.message,
          rating: Number(form.rating),
        });
        toast.success("Feedback updated");
      } else {
        // create new — enforce my identity
        await FeedbackAPI.create({
          name: form.name || undefined,
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Toaster position="top-right" />
        <div className="rounded-xl border bg-white p-6 text-center">
          <h2 className="text-lg font-semibold mb-1">Sign in required</h2>
          <p className="text-sm text-neutral-600">
            Please sign in to manage your feedback.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight">
            <span className={gradText}>My</span> Feedback
          </h2>
          <p className="text-sm text-neutral-500">
            Create, update, and remove your feedback. Others’ feedback is hidden.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
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
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-90 active:opacity-80`}
          >
            <Plus size={16} />
            New
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat title="My feedback" value={mine.length} />
        <Stat title="My avg rating" value={mine.length ? `${avgRating} / 5` : "—"} />
        <Stat title="5★ share" value={`${share(mine, 5)}%`} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
        >
          <option value="">All ratings</option>
          {[5,4,3,2,1].map((n) => (
            <option key={n} value={n}>{n} star{n>1?"s":""}</option>
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
                  <tr key={f._id} className="border-t">
                    <td className="p-3">
                      <div className="line-clamp-2 max-w-[46ch] text-neutral-700">{f.message || "—"}</div>
                    </td>
                    <td className="p-3"><StarRow value={Number(f.rating) || 0} /></td>
                    <td className="p-3">{f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}</td>
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
                    {mine.length ? "No feedback matches your search/filters." : "You haven't posted any feedback yet."}
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
          <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
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
          <div className={`w-full max-w-xl rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <div className="font-semibold">{editId ? "Edit Feedback" : "New Feedback"}</div>
                <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpenEdit(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={saveFeedback} className="p-4 space-y-4">
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

                <div>
                  <Label>Message *</Label>
                  <Textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    required
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
                  <button type="submit" className={`px-4 py-2 rounded-xl text-white ${gradBG}`}>
                    {editId ? "Save changes" : "Create"}
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
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
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
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
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
function StarRow({ value = 0 }) {
  const n = Math.max(0, Math.min(5, Number(value)));
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={"h-4 w-4 " + (i < n ? "fill-current" : "")} />
      ))}
      <span className="ml-1 text-xs text-neutral-700">{n}/5</span>
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
      <span className="ml-2 text-sm text-neutral-700">{value}/5</span>
    </div>
  );
}
function Stat({ title, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-neutral-500">{title}</div>
      <div className={`mt-1 text-lg font-semibold ${gradText}`.replace("text-transparent ", "")}>
        <span className={gradText}>{value}</span>
      </div>
    </div>
  );
}

/* ---------- util ---------- */
function share(rows, stars) {
  const n = rows.length;
  if (!n) return 0;
  const count = rows.filter((r) => Number(r.rating) === Number(stars)).length;
  return Math.round((count / n) * 100);
}
