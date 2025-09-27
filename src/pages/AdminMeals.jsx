// src/pages/AdminMeals.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Pencil, Trash2, Plus, X, RefreshCcw, Search, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { confirmToast } from "../components/ConfirmToast";
import MediaUpload from "../utils/mediaUpload";

/* ---- gradient tokens (match your theme) ---- */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ---- axios instance -> points to your backend ---- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

// Attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401/403 handler (optional redirect similar to VehiclePage)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      toast.error(error?.response?.data?.message || "Please log in to continue.");
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

const MealsAPI = {
  list: () => api.get("/api/meals"),                       // -> { meals: [...] }
  get: (id) => api.get(`/api/meals/${id}`),                // -> { meals: {...} }
  create: (body) => api.post("/api/meals", body),          // -> { meals: {...} }
  update: (id, body) => api.put(`/api/meals/${id}`, body), // -> { meals: {...} }
  remove: (id) => api.delete(`/api/meals/${id}`),          // -> { meals: {...} }
};

const EMPTY = {
  name: "",
  description: "",
  catogery: "",
  price: "",
  avalability: true,
  image: "", // stored URL (set after upload)
};

export default function AdminMeals() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  // file input (upload like VehiclePage)
  const [file, setFile] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await MealsAPI.list();
      setRows(Array.isArray(res?.data?.meals) ? res.data.meals : []);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || "Failed to load meals";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(t) ||
        (m.catogery || "").toLowerCase().includes(t) ||
        String(m.price).includes(t)
    );
  }, [rows, q]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(EMPTY);
    setFile(null);
    setOpen(true);
  }

  async function openEdit(id) {
    try {
      const res = await MealsAPI.get(id);
      const doc = res?.data?.meals || {};
      setForm({
        name: doc.name || "",
        description: doc.description || "",
        catogery: doc.catogery || "",
        price: doc.price ?? "",
        avalability: !!doc.avalability,
        image: doc.image || "",
      });
      setEditingId(id);
      setMode("edit");
      setFile(null);
      setOpen(true);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || "Failed to load meal";
      toast.error(msg);
    }
  }

  async function onDelete(id, name) {
    const ok = await confirmToast({
      title: "Delete meal?",
      message: `Delete "${name || id}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await MealsAPI.remove(id);
      toast.success("Meal deleted");
      await load();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || "Delete failed";
      toast.error(msg);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.catogery.trim() || !String(form.price).trim()) {
      toast.error("Name, Category, Price are required");
      return;
    }

    try {
      let imageUrl = form.image?.trim() || "";

      // If user selected a file, upload to Supabase first (like VehiclePage)
      if (file) {
        const uploaded = await MediaUpload(file, { bucket: "images", prefix: "meals" });
        imageUrl = uploaded; // overwrite with uploaded URL
      }

      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || "",
        catogery: form.catogery.trim(),
        price: Number(form.price),
        avalability: !!form.avalability,
        image: imageUrl,
      };

      if (mode === "create") {
        await MealsAPI.create(payload);
        toast.success("Meal created");
      } else {
        await MealsAPI.update(editingId, payload);
        toast.success("Meal updated");
      }

      setOpen(false);
      setFile(null);
      await load();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || "Save failed";
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Back button ABOVE the title (like VehiclePage) */}
      <div className="mb-2">
        <button
          onClick={() => nav(-1)}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Header row */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
            Manage <span className={gradText}>Meals</span>
          </h2>
          <p className="text-sm text-neutral-500">Create, edit, and delete meals.</p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Backend: <span className="font-mono">{BASE}/api/meals</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="group">
            <div
              className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-56
                         border border-neutral-200 transition-colors
                         focus-within:border-[#9733EE] focus-within:ring-2 focus-within:ring-[#9733EE]/20"
            >
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                placeholder="Search name/category…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Reload */}
          <button
            onClick={load}
            className="cursor-pointer group inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Reload"
          >
            <RefreshCcw className={["h-4 w-4", loading ? "animate-spin" : "group-hover:rotate-180"].join(" ")} />
            Reload
          </button>

          {/* New */}
          <button
            onClick={openCreate}
            className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-90 active:opacity-80`}
          >
            <Plus size={16} />
            New Meal
          </button>

          <Link
            to="/reports/meals"
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Download report"
          >
            Report
          </Link>
        </div>
      </div>

      {/* Gradient card like VehiclePage */}
      <div className={`rounded-2xl p-[1px] ${gradBG}`}>
        <div className="rounded-[14px] bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <span className="text-sm font-medium text-neutral-700">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} meals`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="text-left p-3">Meal</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Price (LKR)</th>
                  <th className="text-left p-3">Available</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  filtered.map((m) => {
                    const img = m.image || "";
                    return (
                      <tr key={m._id} className="border-t hover:bg-neutral-50/60">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                              <img
                                src={img || "https://placehold.co/64x48?text=-"}
                                alt={m.name}
                                className="h-full w-full object-cover"
                                onError={(e) => (e.currentTarget.src = "https://placehold.co/64x48?text=-")}
                              />
                            </div>
                            <div>
                              <div className="font-medium text-neutral-800">{m.name}</div>
                              <div className="text-neutral-500 line-clamp-2 max-w-[38ch]">
                                {m.description || "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">{m.catogery || "—"}</td>
                        <td className="p-3">{Number(m.price).toFixed(2)}</td>
                        <td className="p-3">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                              m.avalability
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-rose-50 text-rose-700 ring-rose-200",
                            ].join(" ")}
                          >
                            {m.avalability ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                              onClick={() => openEdit(m._id)}
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-full border border-rose-200 text-rose-600 bg-white hover:bg-rose-50"
                              onClick={() => onDelete(m._id, m.name)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-neutral-500" colSpan={5}>
                      No meals found.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td className="p-8 text-center text-neutral-500" colSpan={5}>
                      Loading meals…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal (Create/Edit) — smaller & scrollable, file input like VehiclePage, preview in edit */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-xl rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
            <div className="rounded-2xl bg-white max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white">
                <h3 className="font-semibold">{mode === "create" ? "Create Meal" : "Edit Meal"}</h3>
                <button className="p-2 rounded-md hover:bg-neutral-100" onClick={() => setOpen(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={onSubmit} className="p-5 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Name *</label>
                    <input
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Chicken Kottu"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Category *</label>
                    <input
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.catogery}
                      onChange={(e) => setForm((f) => ({ ...f, catogery: e.target.value }))}
                      placeholder="Sri Lankan / Fast Food / Drinks"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Price (LKR) *</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="1500"
                      required
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Availability</label>
                    <select
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.avalability ? "true" : "false"}
                      onChange={(e) => setForm((f) => ({ ...f, avalability: e.target.value === "true" }))}
                    >
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>

                  {/* Upload image (file input only, like VehiclePage) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Upload image (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    {file && <p className="text-[11px] text-neutral-500 mt-1">Selected: {file.name}</p>}
                  </div>

                  {/* Preview current image in EDIT */}
                  {mode === "edit" && form.image && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1.5">Current image</label>
                      <img
                        src={form.image}
                        alt="current"
                        className="w-full h-40 object-cover rounded-lg border"
                        onError={(e) => (e.currentTarget.src = "https://placehold.co/640x240?text=-")}
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Description</label>
                    <textarea
                      rows={4}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Short description…"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-90 active:opacity-80`}
                  >
                    {mode === "create" ? "Create" : "Update"}
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
