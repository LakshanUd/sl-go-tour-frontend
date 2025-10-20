//src/pages/TourPackageView.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, Tag, Clock, Hotel, Car, Utensils, Pencil, Trash2 } from "lucide-react";
import { confirmToast } from "../components/ConfirmToast";

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
    toast.error(err?.response?.data?.message || err?.message || "Request failed");
    return Promise.reject(err);
  }
);

const ToursAPI = {
  get: (id) => api.get(`/api/tour-packages/${encodeURIComponent(id)}`),
  remove: (id) => api.delete(`/api/tour-packages/${encodeURIComponent(id)}`),
};

export default function TourPackageView() {
  const { tourPakage_ID } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await ToursAPI.get(tourPakage_ID);
      setDoc(res?.data || null);
    } catch {
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [tourPakage_ID]);

 async function onDelete(id, name) {
   const ok = await confirmToast({
     title: "Delete Tour Package",
     message: `Are you sure you want to delete "${name || id}"? This cannot be undone.`,
     confirmText: "Delete",
     cancelText: "Cancel",
   });
   if (!ok) return;

   try {
     await ToursAPI.remove(id);
     toast.success("Tour package deleted");
     await load();
   } catch {
     /* handled by interceptor */
   }
 }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-neutral-500">Loading…</div>;
  }
  if (!doc) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-neutral-500">Not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-0 py-6 pt-28">
      <Toaster position="top-right" />

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}   // <-- go back in history
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {/* Hero / cover */}
      <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-white">
        <div className="relative h-64 bg-neutral-100">
          {Array.isArray(doc.images) && doc.images[0] ? (
            <img
              src={doc.images[0]}
              alt={doc.name}
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/1200x600?text=No+Image"; }}
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-neutral-400 text-sm">No Image</div>
          )}
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px]">
            <Tag className="h-3.5 w-3.5" /> {doc.type}
          </div>
        </div>

        <div className="px-5 py-6">
          <h1 className="text-2xl font-bold text-neutral-900">{doc.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-neutral-700">
            <div className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> {doc.duration}</div>
            <div className="font-semibold">LKR {Number(doc.price ?? 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

          <div className="mt-6 prose max-w-none">
            <p className="whitespace-pre-wrap text-neutral-800 leading-relaxed">{doc.description || "—"}</p>
          </div>

          {/* Includes */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard
              icon={<Hotel className="h-4 w-4" />}
              title={`Accommodations (${doc.accommodations?.length || 0})`}
              items={(doc.accommodations || []).map(a => `${a.name} · ${a.type}${a.pricePerNight != null ? ` · ${a.pricePerNight}/night` : ""}`)}
            />
            <InfoCard
              icon={<Car className="h-4 w-4" />}
              title={`Vehicles (${doc.vehicles?.length || 0})`}
              items={(doc.vehicles || []).map(v => `${v.brand} (${v.vehicleID}) · ${v.type}${v.seatingCapacity ? ` · ${v.seatingCapacity} seats` : ""}`)}
            />
            <InfoCard
              icon={<Utensils className="h-4 w-4" />}
              title={`Meals (${doc.meals?.length || 0})`}
              items={(doc.meals || []).map(m => `${m.name} · ${m.catogery}${m.price != null ? ` · ${m.price}` : ""}`)}
            />
          </div>

          {/* Gallery */}
          {Array.isArray(doc.images) && doc.images.length > 1 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-3">Gallery</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {doc.images.slice(1).map((src, i) => (
                  <img key={i} src={src} className="h-32 w-full object-cover rounded-xl border"
                       onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/400x200?text=No+Image"; }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, items }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-medium text-neutral-800 inline-flex items-center gap-2 mb-2">{icon} {title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-neutral-500">None</div>
      ) : (
        <ul className="text-sm text-neutral-700 list-disc pl-5 space-y-1">
          {items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
    </div>
  );
}
