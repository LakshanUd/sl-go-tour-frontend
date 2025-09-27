// src/pages/VehicleCustomer.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { CartAPI } from "../api/cart";
import {
  Eye,
  Search,
  Users2,
  Fuel,
  Gauge,
  Car,
  ShoppingCart,
  Tag,
} from "lucide-react";

/* ===== Theme tokens ===== */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ===== Backend base ===== */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");

/* ===== axios client ===== */
const api = axios.create({ baseURL: BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ===== helpers (match new schema exactly) ===== */
function normalize(v = {}) {
  const images = Array.isArray(v.images)
    ? v.images
    : typeof v.images === "string" && v.images
    ? [v.images]
    : [];

  return {
    _id: v._id,
    vehicleID: v.vehicleID,
    regNo: v.regNo,
    brand: v.brand,
    type: v.type, // car | van | bus | suv | jeep | minibus
    seatingCapacity: v.seatingCapacity,
    fuelType: v.fuelType, // petrol | diesel | hybrid | electric
    status: v.status, // active | inactive | under_maintenance
    price: Number(v.price ?? 0), // LKR (per-day or base price)
    images,
  };
}

function StatusPill({ status }) {
  let cls =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ";
  switch (status) {
    case "active":
      cls += "bg-emerald-50 text-emerald-700 ring-emerald-200";
      break;
    case "under_maintenance":
      cls += "bg-amber-50 text-amber-700 ring-amber-200";
      break;
    case "inactive":
    default:
      cls += "bg-rose-50 text-rose-700 ring-rose-200";
      break;
  }
  return <span className={cls}>{status?.replace("_", " ") || "—"}</span>;
}

export default function VehicleCustomer() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // quick preview modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/vehicles");
      const raw = Array.isArray(res?.data)
        ? res.data
        : res?.data?.vehicles || res?.data?.items || res?.data?.data || [];
      const list = (raw || []).map(normalize).filter((v) => v.status === "active");
      setRows(list);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to load vehicles");
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
    return rows.filter((v) =>
      [
        v.vehicleID,
        v.regNo,
        v.brand,
        v.type,
        v.fuelType,
        String(v.seatingCapacity ?? ""),
        String(v.price ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [rows, q]);

  function openPreview(v) {
    setActive(v);
    setOpen(true);
  }

  async function addVehicleToCart(v) {
    const image = Array.isArray(v.images) && v.images[0] ? v.images[0] : "";
    try {
      await CartAPI.addItem({
        serviceType: "Vehicle",
        refId: v._id, // backend cart expects mongo _id
        name: v.brand ? `${v.brand} (${v.regNo || v.vehicleID || ""})` : v.regNo || v.vehicleID || "Vehicle",
        image,
        code: v.vehicleID || v.regNo || "",
        unitPrice: Number(v.price || 0), // from new schema
        currency: "LKR",
        qty: 1,
      });
      toast.success("Added to cart");
      window.dispatchEvent(new CustomEvent("cart:changed"));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to add to cart");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">
            Browse <span className={gradText}>Vehicles</span>
          </h2>
          <p className="text-sm text-neutral-500">
            Find the perfect ride for your journey.
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
            <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
              placeholder="Search reg no, brand, type, price…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid: 2 on md, 3 on lg, 4 on xl */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="h-[360px] rounded-2xl border border-neutral-200 bg-white overflow-hidden"
            >
              <div className="h-44 bg-neutral-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-48 bg-neutral-100 animate-pulse rounded" />
                <div className="h-3 w-full bg-neutral-100 animate-pulse rounded" />
                <div className="h-3 w-2/3 bg-neutral-100 animate-pulse rounded" />
                <div className="h-9 w-full bg-neutral-100 animate-pulse rounded" />
              </div>
            </div>
          ))}

        {!loading &&
          filtered.map((v) => {
            const img = v.images?.[0] || "";
            return (
              <article
                key={v._id || v.vehicleID}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-sm transition"
              >
                {/* Image / Preview */}
                <button
                  className="w-full aspect-[4/3] bg-neutral-50"
                  onClick={() => openPreview(v)}
                  title="Quick preview"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={v.brand || v.regNo || v.vehicleID}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://via.placeholder.com/640x480?text=Vehicle";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      No image
                    </div>
                  )}
                </button>

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-lg leading-snug line-clamp-2">
                      {v.brand || "Vehicle"}
                    </h3>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-neutral-500">Price</div>
                      <div className="font-semibold text-emerald-600">
                        LKR {Number(v.price || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <Tag size={12} /> ID: {v.vehicleID || "—"} · Reg: {v.regNo || "—"}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-neutral-700 pt-1">
                    <span className="inline-flex items-center gap-2">
                      <Car size={16} /> {v.type || "—"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Users2 size={16} /> {v.seatingCapacity ?? "—"} seats
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Fuel size={16} /> {v.fuelType || "—"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Gauge size={16} /> <StatusPill status={v.status} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
                      onClick={() => openPreview(v)}
                    >
                      <Eye size={16} />
                      View
                    </button>

                    <button
                      className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90`}
                      onClick={() => addVehicleToCart(v)}
                    >
                      <ShoppingCart size={16} />
                      Book Now
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center text-neutral-500 py-10">
          No vehicles found.
        </div>
      )}

      {/* Preview Modal */}
      {open && active && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-[1001] w-full max-w-2xl rounded-2xl overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {active.images?.[0] && (
              <img
                src={active.images[0]}
                alt={active.brand || active.regNo || active.vehicleID}
                className="w-full h-64 object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/800x400?text=Vehicle";
                }}
              />
            )}
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold">
                  {active.brand || "Vehicle"}
                </h3>
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Price</div>
                  <div className="font-semibold text-emerald-600">
                    LKR {Number(active.price || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-sm text-neutral-700 space-y-1">
                <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                  <Tag size={12} /> ID: {active.vehicleID || "—"} · Reg: {active.regNo || "—"}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Car size={16} /> {active.type || "—"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Users2 size={16} /> {active.seatingCapacity ?? "—"} seats
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Fuel size={16} /> {active.fuelType || "—"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Gauge size={16} /> <StatusPill status={active.status} />
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
                <button
                  className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 inline-flex items-center gap-2`}
                  onClick={() => addVehicleToCart(active)}
                >
                  <ShoppingCart size={16} />
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
