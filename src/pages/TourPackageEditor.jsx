// src/pages/TourPackageEditor.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, Save, Hotel, Car, Utensils, Search } from "lucide-react";
import MediaUpload from "../utils/mediaUpload";

/* ===== Theme ===== */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ===== API ===== */
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

const ToursAPI = {
  get: (id) => api.get(`/api/tour-packages/${encodeURIComponent(id)}`),
  create: (payload) => api.post("/api/tour-packages", payload),
  update: (id, payload) => api.put(`/api/tour-packages/${encodeURIComponent(id)}`, payload),
};

const DataAPI = {
  accommodations: () => api.get("/api/accommodations"),
  vehicles:       () => api.get("/api/vehicles"),
  meals:          () => api.get("/api/meals"),
};

const TYPES = ["City Tour", "Village Tour", "Sea Tour", "Lagoon Tour"];
const EMPTY = {
  tourPakage_ID: "",
  name: "",
  type: "Village Tour",
  description: "",
  price: "",
  duration: "",
  imagesCSV: "",
  accommodations: [],
  vehicles: [],
  meals: [],
};

export default function TourPackageEditor({ mode = "create" }) {
  const isCreate = mode === "create";
  const { tourPakage_ID } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const [accList, setAccList] = useState([]);
  const [vehList, setVehList] = useState([]);
  const [mealList, setMealList] = useState([]);
  const [accQ, setAccQ] = useState("");
  const [vehQ, setVehQ] = useState("");
  const [mealQ, setMealQ] = useState("");

  // NEW: local image file (single, same as VehiclePage)
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (isCreate) {
      setForm((f) => ({ ...f, tourPakage_ID: genId() }));
    } else {
      (async () => {
        try {
          const res = await ToursAPI.get(tourPakage_ID);
          const doc = res?.data || {};
          setForm({
            tourPakage_ID: doc.tourPakage_ID || "",
            name: doc.name || "",
            type: TYPES.includes(doc.type) ? doc.type : "Village Tour",
            description: doc.description || "",
            price: doc.price ?? "",
            duration: doc.duration || "",
            imagesCSV: Array.isArray(doc.images) ? doc.images.join(", ") : "",
            accommodations: (doc.accommodations || []).map((d) => d._id || d),
            vehicles: (doc.vehicles || []).map((d) => d._id || d),
            meals: (doc.meals || []).map((d) => d._id || d),
          });
        } catch {}
      })();
    }
    (async () => {
      try {
        const [acc, veh, meals] = await Promise.all([
          DataAPI.accommodations().then(r => Array.isArray(r?.data) ? r.data : r?.data || []),
          DataAPI.vehicles().then(r => Array.isArray(r?.data) ? r.data : r?.data || []),
          DataAPI.meals().then(r => Array.isArray(r?.data?.meals) ? r.data.meals : Array.isArray(r?.data) ? r.data : r?.data || []),
        ]);
        setAccList(acc);
        setVehList(veh);
        setMealList(meals);
      } catch {}
    })();
  }, [isCreate, tourPakage_ID]);

  function onChange(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }
  function toggleId(listKey, id) {
    setForm((f) => {
      const arr = new Set(f[listKey]);
      if (arr.has(id)) arr.delete(id);
      else arr.add(id);
      return { ...f, [listKey]: Array.from(arr) };
    });
  }
  function validate() {
    if (!form.tourPakage_ID.trim()) return "Business ID is required";
    if (!form.name.trim()) return "Name is required";
    if (!TYPES.includes(form.type)) return "Invalid type";
    if (form.price === "" || isNaN(Number(form.price))) return "Valid price is required";
    if (!form.duration.trim()) return "Duration is required";
    return "";
  }

  async function onSave(e) {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    try {
      setSaving(true);

      // 1) Build images array from CSV
      let imageUrls = (form.imagesCSV || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // 2) If a new file selected, upload FIRST (same flow as VehiclePage)
      if (file) {
        const url = await MediaUpload(file); // returns public URL
        imageUrls = [url, ...imageUrls];     // newest first
      }

      // 3) Build payload
      const payload = {
        tourPakage_ID: form.tourPakage_ID.trim(),
        name: form.name.trim(),
        type: form.type,
        description: form.description || "",
        price: Number(form.price),
        duration: form.duration.trim(),
        images: imageUrls,
        accommodations: form.accommodations,
        vehicles: form.vehicles,
        meals: form.meals,
      };

      // 4) Save
      if (isCreate) {
        await ToursAPI.create(payload);
        toast.success("Tour package created");
      } else {
        await ToursAPI.update(tourPakage_ID, payload);
        toast.success("Tour package updated");
      }

      // 5) Reset file + go back
      setFile(null);
      navigate("/admin/tour-packages");
    } catch (e2) {
      // toast is already handled in interceptor; keep a fallback
      if (e2?.message) toast.error(e2.message);
    } finally {
      setSaving(false);
    }
  }

  const accFiltered = useMemo(() => {
    const t = accQ.trim().toLowerCase();
    return accList.filter((a) =>
      [a.name, a.type, String(a.pricePerNight)].filter(Boolean).join(" ").toLowerCase().includes(t)
    );
  }, [accList, accQ]);
  const vehFiltered = useMemo(() => {
    const t = vehQ.trim().toLowerCase();
    return vehList.filter((v) =>
      [v.vehicleID, v.brand, v.type, String(v.seatingCapacity)].filter(Boolean).join(" ").toLowerCase().includes(t)
    );
  }, [vehList, vehQ]);
  const mealFiltered = useMemo(() => {
    const t = mealQ.trim().toLowerCase();
    return mealList.filter((m) =>
      [m.name, m.catogery, String(m.price)].filter(Boolean).join(" ").toLowerCase().includes(t)
    );
  }, [mealList, mealQ]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pt-25">
      <Toaster position="top-right" />

      <div className="mb-4 flex items-center justify-between">
        <Link to="/admin/tour-packages" className="text-sm text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </Link>
        <button
          onClick={onSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white ${gradBG} disabled:opacity-60`}
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : isCreate ? "Create" : "Save changes"}
        </button>
      </div>

      {/* Word-doc layout: left editor, right sidebar */}
      <form onSubmit={onSave} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* LEFT: writing/document area */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Business ID *</label>
              <input
                value={form.tourPakage_ID}
                onChange={onChange("tourPakage_ID")}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                placeholder="TP-20240901-ABCD"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Title *</label>
              <input
                value={form.name}
                onChange={onChange("name")}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                placeholder="Galle Day Tour"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Hero & gallery (comma-separated URLs)</label>
              <input
                value={form.imagesCSV}
                onChange={onChange("imagesCSV")}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                placeholder="https://… , https://…"
              />
              <p className="text-[11px] text-neutral-500 mt-1">First image is used as cover on the view page.</p>
            </div>

            {/* NEW: single file upload (same as VehiclePage) */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Upload image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                If selected, the uploaded image URL will be added to the gallery automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                rows={16}
                value={form.description}
                onChange={onChange("description")}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 leading-7 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                placeholder="Write like a blog article…"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: sticky meta + selectors */}
        <aside className="lg:sticky lg:top-6 space-y-6 h-fit">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="grid gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Type *</label>
                <select
                  value={form.type}
                  onChange={onChange("type")}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                >
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Price (LKR) *</label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={onChange("price")}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                  placeholder="25000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Duration *</label>
                <input
                  value={form.duration}
                  onChange={onChange("duration")}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                  placeholder="1 Day / 3 Days / 7 Days…"
                  required
                />
              </div>
            </div>
          </div>

          {/* Selectors */}
          <SelectorCard
            icon={<Hotel className="h-4 w-4" />} title="Accommodations (optional)"
            q={accQ} setQ={setAccQ}
            options={accFiltered.map((a) => ({
              id: a._id,
              title: a.name,
              sub: `${a.type || ""}${a.pricePerNight != null ? ` • ${a.pricePerNight}/night` : ""}`,
            }))}
            selected={new Set(form.accommodations)}
            toggle={(id) => toggleId("accommodations", id)}
          />

          <SelectorCard
            icon={<Car className="h-4 w-4" />} title="Vehicles (optional)"
            q={vehQ} setQ={setVehQ}
            options={vehFiltered.map((v) => ({
              id: v._id,
              title: `${v.brand} (${v.vehicleID})`,
              sub: `${v.type || ""}${v.seatingCapacity ? ` • ${v.seatingCapacity} seats` : ""}`,
            }))}
            selected={new Set(form.vehicles)}
            toggle={(id) => toggleId("vehicles", id)}
          />

          <SelectorCard
            icon={<Utensils className="h-4 w-4" />} title="Meals (optional)"
            q={mealQ} setQ={setMealQ}
            options={mealFiltered.map((m) => ({
              id: m._id,
              title: m.name,
              sub: `${m.catogery || ""}${m.price != null ? ` • ${m.price}` : ""}`,
            }))}
            selected={new Set(form.meals)}
            toggle={(id) => toggleId("meals", id)}
          />
        </aside>
      </form>
    </div>
  );
}

/* ===== Components ===== */
function SelectorCard({ icon, title, q, setQ, options, selected, toggle }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-medium text-neutral-800 inline-flex items-center gap-2 mb-2">
        {icon} {title}
      </div>

      <div className="mb-2 flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-full border border-neutral-200 transition-colors group-focus-within:border-transparent">
          <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="max-h-48 overflow-auto divide-y">
        {options.length === 0 && <div className="p-3 text-xs text-neutral-500">No matches.</div>}
        {options.map((op) => {
          const isSel = selected.has(op.id);
          return (
            <label key={op.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-neutral-50">
              <input type="checkbox" className="accent-[#9733EE]" checked={isSel} onChange={() => toggle(op.id)} />
              <div className="flex-1">
                <div className="text-sm text-neutral-800">{op.title}</div>
                {op.sub && <div className="text-xs text-neutral-500">{op.sub}</div>}
              </div>
            </label>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="text-xs text-neutral-600 mt-2">Selected: {selected.size}</div>
      )}
    </div>
  );
}

/* ===== Helpers ===== */
function genId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TP-${y}${m}${day}-${rand}`;
}
