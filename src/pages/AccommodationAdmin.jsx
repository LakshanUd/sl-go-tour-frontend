// src/pages/AccommodationAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Search, FileDown } from "lucide-react";
import MediaUpload from "../utils/mediaUpload";
import { Link } from "react-router-dom";

/* ---- Theme tokens ---- */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ---- Dropdown options (mirror your model) ---- */
const TYPES = ["Hotel", "Villa", "Apartment", "Guest House", "Hostel", "Resort", "Homestay"];
const STATUSES = ["Available", "Fully Booked", "Temporarily Closed"];
const AMENITIES = ["WiFi", "Pool", "Parking", "AC", "Breakfast", "Spa"];

/* ---- Backend base ---- */
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

// Optional: 401/403 toast
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const s = err?.response?.status;
    if (s === 401 || s === 403) {
      toast.error(err?.response?.data?.message || "Please log in to continue.");
    }
    return Promise.reject(err);
  }
);

/* ---- API helpers ---- */
const AccomAPI = {
  list: () => api.get("/api/accommodations"),
  get: (id) => api.get(`/api/accommodations/${id}`),
  create: (body) => api.post("/api/accommodations", body),
  update: (id, body) => api.put(`/api/accommodations/${id}`, body),
  remove: (id) => api.delete(`/api/accommodations/${id}`),
};

const EMPTY = {
  name: "",
  type: TYPES[0],
  pricePerNight: "",
  capacity: "",
  amenities: [],
  description: "",
  imagesArr: [], // <-- array only; no CSV field in the UI
  status: STATUSES[0],
};

export default function AccommodationAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  // file for upload (single, like Vehicle page)
  const [file, setFile] = useState(null);

  // filters
  const [q, setQ] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await AccomAPI.list();
      const list = Array.isArray(res?.data) ? res.data : [];
      setRows(list);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || e?.message || "Failed to load accommodations");
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
    return rows.filter((r) => {
      const hay = [
        r.name,
        r.type,
        r.status,
        ...(Array.isArray(r.amenities) ? r.amenities : []),
        String(r.pricePerNight),
        String(r.capacity),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(t);
    });
  }, [rows, q]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(EMPTY);
    setFile(null);
    setOpen(true);
  }

  async function openEdit(row) {
    try {
      const id = row?._id;
      if (!id) return;
      const res = await AccomAPI.get(id);
      const a = res?.data || row;

      const imgs =
        Array.isArray(a.images) ? a.images :
        typeof a.images === "string" && a.images
          ? a.images.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

      setForm({
        name: a.name || "",
        type: a.type || TYPES[0],
        pricePerNight: a.pricePerNight ?? "",
        capacity: a.capacity ?? "",
        amenities: Array.isArray(a.amenities) ? a.amenities : [],
        description: a.description || "",
        imagesArr: imgs,
        status: a.status || STATUSES[0],
      });
      setEditingId(id);
      setMode("edit");
      setFile(null);
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to load accommodation");
    }
  }

  async function onDelete(id, name) {
    if (!confirm(`Delete "${name || "this accommodation"}"? This cannot be undone.`)) return;
    try {
      await AccomAPI.remove(id);
      toast.success("Accommodation deleted");
      setRows((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Delete failed");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();

    // Basic validation
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.type) return toast.error("Type is required");
    if (String(form.pricePerNight).trim() === "") return toast.error("Price per night is required");
    if (String(form.capacity).trim() === "") return toast.error("Capacity is required");

    try {
      // start from existing images (array)
      let imageUrls = Array.isArray(form.imagesArr) ? [...form.imagesArr] : [];

      // upload first if file chosen
      if (file) {
        const url = await MediaUpload(file, { bucket: "images", prefix: "accommodations" });
        imageUrls = [url, ...imageUrls];
      }

      const payload = {
        name: form.name.trim(),
        type: form.type,
        pricePerNight: Number(form.pricePerNight),
        capacity: Number(form.capacity),
        amenities: Array.isArray(form.amenities) ? form.amenities : [],
        description: form.description || "",
        images: imageUrls, // send array to backend
        status: form.status,
      };

      if (mode === "create") {
        await AccomAPI.create(payload);
        toast.success("Accommodation created");
      } else {
        await AccomAPI.update(editingId, payload);
        toast.success("Accommodation updated");
      }
      setOpen(false);
      setFile(null);
      await load();
    } catch (e2) {
      console.error(e2);
      toast.error(e2?.response?.data?.error || e2?.message || "Save failed");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight">
            <span className={gradText}>Admin</span> · Accommodations
          </h2>
          <p className="text-sm text-neutral-500">Create, edit, and delete accommodations.</p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Backend: <span className="font-mono">{BASE}/api/accommodations</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-64 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                placeholder="Search name, type, amenity…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* New */}
          <button
            onClick={openCreate}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-90 active:opacity-80`}
          >
            <Plus size={16} />
            New Accommodation
          </button>

          {/* Report */}
          <Link
            to="/reports/accommodations"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Download report"
          >
            <FileDown className="h-4 w-4" />
            Report
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <span className="text-sm font-medium text-neutral-700">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} accommodations`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="text-left p-3">Accommodation</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Price/Night</th>
                <th className="text-left p-3">Capacity</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                filtered.map((a) => {
                  const firstImg =
                    Array.isArray(a.images) && a.images.length
                      ? a.images[0]
                      : typeof a.images === "string" && a.images
                      ? a.images
                      : "";

                  return (
                    <tr key={a._id} className="border-t hover:bg-neutral-50/60">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                            {firstImg ? (
                              <img
                                src={firstImg}
                                alt={a.name}
                                className="h-full w-full object-cover"
                                onError={(e) => (e.currentTarget.src = "https://placehold.co/64x48?text=-")}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                                No image
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-neutral-800">{a.name}</div>
                            <div className="text-neutral-500 line-clamp-1 max-w-[42ch]">
                              {(a.amenities || []).join(", ") || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{a.type}</td>
                      <td className="p-3">LKR {Number(a.pricePerNight).toFixed(2)}</td>
                      <td className="p-3">{a.capacity}</td>
                      <td className="p-3">
                        <StatusPill status={a.status} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                            onClick={() => openEdit(a)}
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="px-3 py-1.5 rounded-full border border-rose-200 text-rose-600 bg-white hover:bg-rose-50"
                            onClick={() => onDelete(a._id, a.name)}
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
                  <td className="p-8 text-center text-neutral-500" colSpan={6}>
                    No accommodations found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="p-8 text-center text-neutral-500" colSpan={6}>
                    Loading accommodations…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal (smaller & scrollable; with previews in edit) */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
            <div className="rounded-2xl bg-white max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white">
                <div className="font-semibold">{mode === "create" ? "Create Accommodation" : "Edit Accommodation"}</div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-md hover:bg-neutral-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-neutral-700" />
                </button>
              </div>

              <form onSubmit={onSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Sunny Beach Resort"
                      required
                    />
                  </div>
                  <div>
                    <Label>Type *</Label>
                    <Select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      options={TYPES}
                    />
                  </div>

                  <div>
                    <Label>Price / Night (LKR) *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.pricePerNight}
                      onChange={(e) => setForm((f) => ({ ...f, pricePerNight: e.target.value }))}
                      placeholder="20000"
                      required
                    />
                  </div>
                  <div>
                    <Label>Capacity *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                      placeholder="4"
                      required
                    />
                  </div>
                  <div>
                    <Label>Status *</Label>
                    <Select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      options={STATUSES}
                    />
                  </div>

                  {/* Upload (create + edit) */}
                  <div className="md:col-span-3">
                    <Label>Upload image (optional)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    {file && <p className="text-[11px] text-neutral-500 mt-1">Selected: {file.name}</p>}
                  </div>

                  {/* Current images preview in EDIT */}
                  {mode === "edit" && form.imagesArr?.length > 0 && (
                    <div className="md:col-span-3">
                      <Label>Current images</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {form.imagesArr.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={`accom-${i}`}
                            className="w-full h-24 object-cover rounded-lg border"
                            onError={(e) => (e.currentTarget.src = "https://placehold.co/160x96?text=-")}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <Label>Description</Label>
                    <Textarea
                      rows={5}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Short description…"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`px-4 py-2 rounded-xl text-white ${gradBG}`}>
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

/* ---- Tiny UI bits ---- */
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
function StatusPill({ status }) {
  let cls =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ";
  switch (status) {
    case "Available":
      cls += "bg-emerald-50 text-emerald-700 ring-emerald-200";
      break;
    case "Fully Booked":
      cls += "bg-amber-50 text-amber-700 ring-amber-200";
      break;
    case "Temporarily Closed":
    default:
      cls += "bg-rose-50 text-rose-700 ring-rose-200";
      break;
  }
  return <span className={cls}>{status || "—"}</span>;
}
