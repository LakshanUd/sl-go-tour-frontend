import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Eye,
  Search,
  CalendarDays,
  Clock,
  MapPin,
  ShoppingCart,
  Tag,
  Users,
  X,
} from "lucide-react";

import { CartAPI } from "../api/cart";

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

// attach token if present (not required for public GET)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ===== helpers ===== */
function normalize(pkg = {}) {
  const images = Array.isArray(pkg.images)
    ? pkg.images
    : typeof pkg.images === "string" && pkg.images
    ? [pkg.images]
    : [];
  return {
    _id: pkg._id,
    tourPakage_ID: pkg.tourPakage_ID ?? pkg.tourPackage_ID ?? pkg.tourId ?? pkg.code,
    name: pkg.name || "",
    type: pkg.type || "",
    description: pkg.description || "",
    price: Number(pkg.price ?? 0),
    duration: pkg.duration || "",
    images,
  };
}

export default function TourPackageCustomer() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // quick preview modal
  const [openPreview, setOpenPreview] = useState(false);
  const [active, setActive] = useState(null);

  // booking modal (passengers)
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPkg, setBookingPkg] = useState(null);
  const [passengers, setPassengers] = useState(1);

  const navigate = useNavigate();

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/tour-packages");
      const raw = Array.isArray(res?.data)
        ? res.data
        : res?.data?.tourPackages || res?.data?.packages || [];
      setRows((raw || []).map(normalize));
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to load tour packages");
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
    return rows.filter((p) =>
      [
        p.tourPakage_ID,
        p.name,
        p.type,
        p.description,
        p.duration,
        String(p.price),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [rows, q]);

  function openPreviewModal(pkg) {
    setActive(pkg);
    setOpenPreview(true);
  }

  function openBooking(pkg) {
    setBookingPkg(pkg);
    setPassengers(1);
    setBookingOpen(true);
  }

  function closeBooking() {
    setBookingOpen(false);
    setBookingPkg(null);
    setPassengers(1);
  }

  async function confirmBooking() {
    if (!bookingPkg) return;
    const qty = Number(passengers);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("Please enter a valid number of passengers (at least 1)");
      return;
    }
    try {
      const image =
        Array.isArray(bookingPkg.images) && bookingPkg.images[0]
          ? bookingPkg.images[0]
          : "";
      await CartAPI.addItem({
        serviceType: "TourPackage",
        refId: bookingPkg._id,
        name: bookingPkg.name,
        image,
        code: bookingPkg.tourPakage_ID,
        unitPrice: Number(bookingPkg.price || 0),
        currency: "LKR",
        qty, // passengers count
      });
      window.dispatchEvent(new CustomEvent("cart:changed"));
      toast.success("Tour added to cart");
      closeBooking();
    } catch (e) {
      console.error("Failed to add to cart", e);
      // interceptor/toast on failure is handled elsewhere
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">
            Explore <span className={gradText}>Tour Packages</span>
          </h2>
          <p className="text-sm text-neutral-500">
            Hand-picked experiences across Sri Lanka.
          </p>
          <p className="text-[10px] text-neutral-400 mt-1">
            API: {BASE}/api/tour-packages
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
            <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
              placeholder="Search by name, type, duration…"
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
          filtered.map((pkg) => {
            const img = pkg.images?.[0] || "";
            return (
              <article
                key={pkg._id || pkg.tourPakage_ID}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-sm transition"
              >
                {/* Click image to open quick preview modal */}
                <button
                  className="w-full aspect-[4/3] bg-neutral-50 cursor-pointer"
                  onClick={() => openPreviewModal(pkg)}
                  title="Quick preview"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={pkg.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://via.placeholder.com/640x480?text=Tour+Package";
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
                      {pkg.name}
                    </h3>
                    <span className="font-semibold text-emerald-600 shrink-0">
                      LKR {Number(pkg.price || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <Tag size={12} /> ID: {pkg.tourPakage_ID || "—"}
                  </div>

                  <p className="text-sm text-neutral-600 line-clamp-2">
                    {pkg.description || "—"}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-700">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-neutral-200">
                      <MapPin size={14} /> {pkg.type || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-neutral-200">
                      <Clock size={14} /> {pkg.duration || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {/* View takes to blog-style single page */}
                    <button
                      className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900 cursor-pointer"
                      onClick={() =>
                        navigate(`/tour-packages/${encodeURIComponent(pkg.tourPakage_ID)}`)
                      }
                    >
                      <Eye size={16} />
                      View
                    </button>

                    <button
                      className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 cursor-pointer`}
                      onClick={() => openBooking(pkg)}
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
          No tour packages found.
        </div>
      )}

      {/* Preview Modal */}
      {openPreview && active && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenPreview(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-[1001] w-full max-w-2xl rounded-2xl overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {active.images?.[0] && (
              <img
                src={active.images[0]}
                alt={active.name}
                className="w-full h-64 object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/800x400?text=Tour+Package";
                }}
              />
            )}
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold">{active.name}</h3>
                <span className="font-semibold text-emerald-600">
                  LKR {Number(active.price || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 text-xs text-neutral-700">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-neutral-200">
                  <MapPin size={14} /> {active.type || "—"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-neutral-200">
                  <CalendarDays size={14} /> {active.duration || "—"}
                </span>
              </div>

              <p className="text-sm text-neutral-700">{active.description || "—"}</p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Link
                  to={`/tour-packages/${encodeURIComponent(active.tourPakage_ID)}`}
                  className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 inline-flex items-center gap-2 cursor-pointer"
                  onClick={() => setOpenPreview(false)}
                >
                  <Eye size={16} />
                  Open Page
                </Link>
                <button
                  className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 inline-flex items-center gap-2 cursor-pointer`}
                  onClick={() => {
                    setOpenPreview(false);
                    openBooking(active);
                  }}
                >
                  <ShoppingCart size={16} />
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal (Passengers) */}
      {bookingOpen && bookingPkg && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeBooking}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-[1001] w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
              <div className="rounded-2xl bg-white">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                  <div className="font-semibold">Book Tour</div>
                  <button
                    className="p-2 rounded-lg hover:bg-neutral-100 cursor-pointer"
                    onClick={closeBooking}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <div className="text-sm text-neutral-700">
                    <div className="font-medium">{bookingPkg.name}</div>
                    <div className="text-xs text-neutral-500">
                      {bookingPkg.tourPakage_ID} · {bookingPkg.type} · {bookingPkg.duration}
                    </div>
                    <div className="mt-1 font-semibold text-emerald-600">
                      LKR {Number(bookingPkg.price || 0).toFixed(2)} per person
                    </div>
                  </div>

                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Passengers *</span>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 bg-white">
                        <Users className="h-4 w-4 text-[#9733EE]" />
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={passengers}
                          onChange={(e) => setPassengers(e.target.value)}
                          className="w-24 bg-transparent outline-none text-sm text-neutral-700"
                        />
                      </div>
                      <span className="text-xs text-neutral-500">
                        Enter total number of travelers.
                      </span>
                    </div>
                  </label>

                  <div className="rounded-xl bg-neutral-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold">
                        LKR {((Number(bookingPkg.price || 0) || 0) * (Number(passengers) || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer"
                      onClick={closeBooking}
                    >
                      Cancel
                    </button>
                    <button
                      className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 cursor-pointer`}
                      onClick={confirmBooking}
                    >
                      Confirm & Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
