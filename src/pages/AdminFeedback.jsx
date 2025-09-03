import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FeedbacksAPI, ComplaintsAPI } from "../lib/api.js";
import { Navigate } from "react-router-dom";
import { Search, RefreshCcw, Plus, Pencil, Trash2, X } from "lucide-react";
import { confirmToast } from "../components/ConfirmToast";

const gradBG = "bg-gradient-to-r from-[#DA22FF] to-[#9733EE]";
const ringFocus = "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30";

// client-side gate; replace with real auth/route guard
const isAdmin = () => localStorage.getItem("role") === "admin";

export default function FeedbackAdmin() {
  if (!isAdmin()) return <Navigate to="/" replace />;

  const [tab, setTab] = useState("feedbacks"); // 'feedbacks' | 'complaints'
  const [feedbacks, setFeedbacks] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // modal states (shared shape, per tab)
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);

  // feedback form
  const [fbForm, setFbForm] = useState({ name: "", email: "", message: "", rating: 0, date: "" });
  // complaint form
  const [cpForm, setCpForm] = useState({ name: "", email: "", service: "", category: "", description: "", status: "Open" });

  async function load() {
    try {
      setLoading(true);
      const [fbRes, compRes] = await Promise.all([FeedbacksAPI.list(), ComplaintsAPI.list()]);
      setFeedbacks(fbRes?.data?.feedbacks || []);
      setComplaints(compRes?.data?.complaints || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load entries");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const current = tab === "feedbacks" ? feedbacks : complaints;
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return current;
    return current.filter((x) => JSON.stringify(x).toLowerCase().includes(t));
  }, [q, current]);

  /* ----------------- CRUD: open create/edit ----------------- */
  function openCreate() {
    setMode("create");
    setEditingId(null);
    if (tab === "feedbacks") {
      setFbForm({ name: "", email: "", message: "", rating: 0, date: "" });
    } else {
      setCpForm({ name: "", email: "", service: "", category: "", description: "", status: "Open" });
    }
    setOpen(true);
  }

  async function openEdit(id) {
    try {
      setMode("edit");
      setEditingId(id);
      if (tab === "feedbacks") {
        const res = await FeedbacksAPI.get(id);
        const doc = res?.data?.feedbacks || {};
        setFbForm({
          name: doc.name || "",
          email: doc.email || "",
          message: doc.message || "",
          rating: doc.rating ?? 0,
          date: doc.date ? new Date(doc.date).toISOString().slice(0, 16) : "",
        });
      } else {
        const res = await ComplaintsAPI.get(id);
        const doc = res?.data?.complaints || {};
        setCpForm({
          name: doc.name || "",
          email: doc.email || "",
          service: doc.service || "",
          category: doc.category || "",
          description: doc.description || "",
          status: doc.status || "Open",
        });
      }
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load entry");
    }
  }

  /* ----------------- CRUD: delete ----------------- */
  async function onDelete(id, label) {
    const ok = await confirmToast({
      title: `Delete ${tab === "feedbacks" ? "feedback" : "complaint"}?`,
      message: `Delete "${label || id}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      if (tab === "feedbacks") {
        await FeedbacksAPI.remove(id);
        setFeedbacks((arr) => arr.filter((x) => x._id !== id));
      } else {
        await ComplaintsAPI.remove(id);
        setComplaints((arr) => arr.filter((x) => x._id !== id));
      }
      toast.success("Deleted");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  /* ----------------- CRUD: submit (create/update) ----------------- */
  async function onSubmit(e) {
    e.preventDefault();
    try {
      if (tab === "feedbacks") {
        const payload = {
          name: fbForm.name,
          email: fbForm.email,
          message: fbForm.message,
          rating: Number(fbForm.rating) || 0,
          ...(fbForm.date ? { date: new Date(fbForm.date).toISOString() } : {}),
        };
        if (!payload.message || !payload.rating) {
          toast.error("Message and rating are required");
          return;
        }
        if (mode === "create") {
          const res = await FeedbacksAPI.create(payload);
          setFeedbacks((arr) => [res.data.feedbacks, ...arr]);
          toast.success("Feedback created");
        } else {
          const res = await FeedbacksAPI.update(editingId, payload);
          setFeedbacks((arr) => arr.map((x) => (x._id === editingId ? res.data.feedbacks : x)));
          toast.success("Feedback updated");
        }
      } else {
        const payload = {
          name: cpForm.name,
          email: cpForm.email,
          service: cpForm.service,
          category: cpForm.category,
          description: cpForm.description,
          status: cpForm.status || "Open",
        };
        if (!payload.service || !payload.category || !payload.description) {
          toast.error("Service, category and description are required");
          return;
        }
        if (mode === "create") {
          const res = await ComplaintsAPI.create(payload);
          setComplaints((arr) => [res.data.complaints, ...arr]);
          toast.success("Complaint created");
        } else {
          const res = await ComplaintsAPI.update(editingId, payload);
          setComplaints((arr) => arr.map((x) => (x._id === editingId ? res.data.complaints : x)));
          toast.success("Complaint updated");
        }
      }
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Save failed");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & actions */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DA22FF] to-[#9733EE]">
              Admin
            </span>{" "}
            · Feedback & Complaints
          </h1>
          <p className="text-sm text-neutral-600">Full CRUD management.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search with gradient focus ring */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-56 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>

          <button
            onClick={openCreate}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-90`}
          >
            <Plus size={16} />
            New {tab === "feedbacks" ? "Feedback" : "Complaint"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-2xl p-[1px] bg-gradient-to-r from-[#DA22FF] to-[#9733EE]">
        <div className="bg-white rounded-2xl p-1 flex">
          <button
            onClick={() => setTab("feedbacks")}
            className={`px-4 py-2 rounded-xl text-sm ${tab === "feedbacks" ? `${gradBG} text-white` : "text-neutral-700 hover:bg-neutral-50"}`}
          >
            Feedbacks
          </button>
          <button
            onClick={() => setTab("complaints")}
            className={`px-4 py-2 rounded-xl text-sm ${tab === "complaints" ? `${gradBG} text-white` : "text-neutral-700 hover:bg-neutral-50"}`}
          >
            Complaints
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              {tab === "feedbacks" ? (
                <>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Message</th>
                  <th className="text-left p-3">Rating</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-right p-3">Actions</th>
                </>
              ) : (
                <>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Service</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Updated</th>
                  <th className="text-right p-3">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {!loading &&
              filtered.map((x) =>
                tab === "feedbacks" ? (
                  <tr key={x._id} className="border-t">
                    <td className="p-3">{x.name || "—"}</td>
                    <td className="p-3">{x.email || "—"}</td>
                    <td className="p-3 max-w-[40ch]">{x.message}</td>
                    <td className="p-3">{x.rating}</td>
                    <td className="p-3">{new Date(x.createdAt || x.date).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                          onClick={() => openEdit(x._id)}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                          onClick={() => onDelete(x._id, x.message?.slice(0, 24))}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={x._id} className="border-t">
                    <td className="p-3">{x.name || "—"}</td>
                    <td className="p-3">{x.email || "—"}</td>
                    <td className="p-3">{x.service}</td>
                    <td className="p-3">{x.category}</td>
                    <td className="p-3 max-w-[40ch]">{x.description}</td>
                    <td className="p-3">
                      <span className="inline-flex rounded-full bg-neutral-100 ring-1 ring-inset ring-neutral-200 px-2 py-0.5 text-xs">
                        {x.status || "Open"}
                      </span>
                    </td>
                    <td className="p-3">{new Date(x.updatedAt || x.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                          onClick={() => openEdit(x._id)}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                          onClick={() => onDelete(x._id, x.description?.slice(0, 24))}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-neutral-500">No entries.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={8} className="p-8 text-center text-neutral-500">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal (Create/Edit) */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-xl rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <h3 className="font-semibold">{mode === "create" ? "Create" : "Edit"} {tab === "feedbacks" ? "Feedback" : "Complaint"}</h3>
                <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={onSubmit} className="p-4 space-y-4">
                {tab === "feedbacks" ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-neutral-600">Name</label>
                      <input className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={fbForm.name} onChange={(e) => setFbForm((s) => ({ ...s, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-600">Email</label>
                      <input type="email" className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={fbForm.email} onChange={(e) => setFbForm((s) => ({ ...s, email: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm text-neutral-600">Message *</label>
                      <textarea rows={4} className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={fbForm.message} onChange={(e) => setFbForm((s) => ({ ...s, message: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-600">Rating *</label>
                      <input type="number" min={1} max={5} className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={fbForm.rating} onChange={(e) => setFbForm((s) => ({ ...s, rating: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-600">Date</label>
                      <input type="datetime-local" className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={fbForm.date} onChange={(e) => setFbForm((s) => ({ ...s, date: e.target.value }))} />
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-neutral-600">Name</label>
                      <input className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={cpForm.name} onChange={(e) => setCpForm((s) => ({ ...s, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-600">Email</label>
                      <input type="email" className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={cpForm.email} onChange={(e) => setCpForm((s) => ({ ...s, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-600">Service *</label>
                      <input className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={cpForm.service} onChange={(e) => setCpForm((s) => ({ ...s, service: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-600">Category *</label>
                      <input className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={cpForm.category} onChange={(e) => setCpForm((s) => ({ ...s, category: e.target.value }))} required />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm text-neutral-600">Description *</label>
                      <textarea rows={4} className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={cpForm.description} onChange={(e) => setCpForm((s) => ({ ...s, description: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-600">Status</label>
                      <select className={`mt-1 w-full rounded-xl border px-3 py-2 ${ringFocus}`}
                        value={cpForm.status} onChange={(e) => setCpForm((s) => ({ ...s, status: e.target.value }))}>
                        <option>Open</option>
                        <option>In-Progress</option>
                        <option>Resolved</option>
                        <option>Closed</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-90`}>
                    {mode === "create" ? "Create" : "Update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-neutral-500">
        Ensure backend enforces admin authorization for reading & deleting complaints/feedbacks.
      </p>
    </div>
  );
}
