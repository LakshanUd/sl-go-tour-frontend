//src/pages/TourPackageListAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Plus, RefreshCcw, Search, Hotel, Car, Utensils, Clock, Tag, Eye, Pencil, Trash2 } from "lucide-react";
import { confirmToast } from "../components/ConfirmToast";
import { FileDown } from "lucide-react";

/* ===== Theme tokens ===== */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ===== API base ===== */
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
  list: () => api.get("/api/tour-packages"),
  remove: (id) => api.delete(`/api/tour-packages/${encodeURIComponent(id)}`),
};

const TYPES = ["City Tour", "Village Tour", "Sea Tour", "Lagoon Tour"];

export default function TourPackageListAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const navigate = useNavigate();

  async function load() {
    try {
      setLoading(true);
      const res = await ToursAPI.list();
      setRows(Array.isArray(res?.data) ? res.data : res?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => (!type ? true : r.type === type))
      .filter((r) => {
        if (!t) return true;
        const hay = [
          r.tourPakage_ID,
          r.name,
          r.type,
          r.description,
          r.duration,
          String(r.price),
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(t);
      });
  }, [rows, q, type]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-15">
        <div>
          <h2 className="text-2xl font-bold leading-tight">
            <span className={gradText}>Admin</span> · Tour Packages
          </h2>
          <p className="text-sm text-neutral-500">Manage your tour packages. View, edit, or create new ones.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                placeholder="Search id, name, type, description…"
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

          <Link
            to="/admin/tour-packages/new"
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-95 active:opacity-90`}
          >
            <Plus size={16} /> New
          </Link>
          
          <Link
            to="/reports/tour-packages"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Download report"
          >
          <FileDown className="h-4 w-4" />
          Report
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          >
            <option value="">All</option>
            {TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <span className="text-xs text-neutral-500">
          {loading ? "Loading…" : `${filtered.length} of ${rows.length} shown`}
        </span>
      </div>

      {/* Grid (4 per row on xl, 3 on lg, 2 on md, 1 on sm) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {!loading && filtered.map((p) => (
          <article key={p._id || p.tourPakage_ID}
            className="group rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="relative h-40 bg-neutral-100">
              {Array.isArray(p.images) && p.images[0] ? (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/600x300?text=No+Image"; }}
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-neutral-400 text-sm">No Image</div>
              )}
              <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px]">
                <Tag className="h-3.5 w-3.5" /> {p.type}
              </div>
            </div>

            <div className="p-3">
              <h3 className="font-semibold text-neutral-900 line-clamp-1">{p.name}</h3>
              <p className="text-xs text-neutral-500 line-clamp-2 h-8 mt-1">{p.description || "—"}</p>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm font-medium text-neutral-800">LKR {Number(p.price ?? 0).toFixed(2)}</div>
                <div className="inline-flex items-center gap-1 text-xs text-neutral-600">
                  <Clock className="h-3.5 w-3.5" /> {p.duration || "—"}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-600">
                <span className="inline-flex items-center gap-1"><Hotel className="h-3.5 w-3.5" /> {p.accommodations?.length || 0} acc</span>
                <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {p.vehicles?.length || 0} veh</span>
                <span className="inline-flex items-center gap-1"><Utensils className="h-3.5 w-3.5" /> {p.meals?.length || 0} meals</span>
              </div>

              {/* Modern action row */}
              <div className="mt-4 flex items-center justify-between">
                <Link
                  to={`/tour-packages/${encodeURIComponent(p.tourPakage_ID)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border border-neutral-200 hover:bg-neutral-50"
                  title="View"
                >
                  <Eye className="h-4 w-4" /> View
                </Link>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/admin/tour-packages/${encodeURIComponent(p.tourPakage_ID)}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white bg-neutral-900 hover:bg-neutral-800"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                  <button
                    onClick={() => onDelete(p.tourPakage_ID, p.name)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white bg-rose-600 hover:bg-rose-700"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full text-center text-neutral-500 py-12">No tour packages found.</div>
        )}

        {loading && (
          <div className="col-span-full text-center text-neutral-500 py-12">Loading packages…</div>
        )}
      </div>
    </div>
  );
}
