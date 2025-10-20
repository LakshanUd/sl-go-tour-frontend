// src/pages/AccommodationCustomer.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { CartAPI } from "../api/cart";
import {
  Eye,
  Search,
  Users2,
  BedDouble,
  Wallet,
  Tag,
  ShoppingCart,
} from "lucide-react";

/* ===== Theme tokens ===== */
const gradFrom = "from-[#09E65A]";
const gradTo = "to-[#16A34A]";
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

/* ===== helpers ===== */
function normalize(a = {}) {
  const images = Array.isArray(a.images)
    ? a.images
    : typeof a.images === "string" && a.images
    ? [a.images]
    : [];
  return {
    _id: a._id,
    name: a.name || "—",
    type: a.type || "—", // Hotel | Villa | Apartment | Guest House | Hostel | Resort | Homestay
    pricePerNight: Number(a.pricePerNight ?? 0),
    capacity: Number(a.capacity ?? 0),
    amenities: Array.isArray(a.amenities) ? a.amenities : [],
    description: a.description || "",
    status: a.status || "—", // Available | Fully Booked | Temporarily Closed
    images,
  };
}

function StatusPill({ status }) {
  let cls =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ";
  switch (status) {
    case "Available":
      cls += "bg-emerald-50 text-emerald-700 ring-emerald-200";
      break;
    case "Temporarily Closed":
      cls += "bg-amber-50 text-amber-700 ring-amber-200";
      break;
    case "Fully Booked":
    default:
      cls += "bg-rose-50 text-rose-700 ring-rose-200";
      break;
  }
  return <span className={cls}>{status || "—"}</span>;
}

export default function AccommodationCustomer() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // quick preview modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  // booking modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingAccommodation, setBookingAccommodation] = useState(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNights, setBookingNights] = useState(1);
  const bookingDateRef = useRef();

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/accommodations");
      const raw = Array.isArray(res?.data)
        ? res.data
        : res?.data?.accommodations || res?.data?.items || res?.data?.data || [];
      // mirror VehicleCustomer: only show "active" equivalents -> Available
      const list = (raw || []).map(normalize).filter((a) => a.status === "Available");
      setRows(list);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to load accommodations");
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
    return rows.filter((a) =>
      [
        a.name,
        a.type,
        a.status,
        a.description,
        ...(a.amenities || []),
        String(a.capacity ?? ""),
        String(a.pricePerNight ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [rows, q]);

  function openPreview(a) {
    setActive(a);
    setOpen(true);
  }

  function openBookingModal(a) {
    setBookingAccommodation(a);
    setBookingDate("");
    setBookingNights(1);
    setShowBookingModal(true);
    setTimeout(() => bookingDateRef.current?.focus(), 100);
  }

  async function addAccommodationToCart(a) {
    const image = Array.isArray(a.images) && a.images[0] ? a.images[0] : "";
    try {
      await CartAPI.addItem({
        serviceType: "Accommodation",
        refId: a._id, // backend expects mongo _id as reference
        name: a.name || a.type || "Accommodation",
        image,
        code: a.name || a.type || "", // handy for listing in cart/order
        unitPrice: Number(a.pricePerNight || 0),
        currency: "LKR",
        qty: 1,
        meta: {
          type: a.type,
          capacity: a.capacity,
          amenities: a.amenities,
        },
      });
      toast.success("Added to cart");
      window.dispatchEvent(new CustomEvent("cart:changed"));
    } catch (e) {
      const s = e?.response?.status;
      if (s === 401 || s === 403) {
        toast.error("Please log in to add items to cart.");
      } else {
        toast.error(e?.response?.data?.message || "Failed to add to cart");
      }
    }
  }

  async function handleBookNow() {
    if (!bookingDate || !bookingNights || bookingNights < 1) {
      toast.error("Please select a valid booking date and number of nights.");
      return;
    }
    const a = bookingAccommodation;
    const image = Array.isArray(a.images) && a.images[0] ? a.images[0] : "";
    try {
      await CartAPI.addItem({
        serviceType: "Accommodation",
        refId: a._id,
        name: a.name || a.type || "Accommodation",
        image,
        code: a.name || a.type || "",
        unitPrice: Number(a.pricePerNight || 0),
        currency: "LKR",
        qty: bookingNights,
        bookingDate,
        bookingNights,
        meta: {
          type: a.type,
          capacity: a.capacity,
          amenities: a.amenities,
        },
      });
      toast.success("Added to cart");
      setShowBookingModal(false);
      setBookingAccommodation(null);
      window.dispatchEvent(new CustomEvent("cart:changed"));
    } catch (e) {
      const s = e?.response?.status;
      if (s === 401 || s === 403) {
        toast.error("Please log in to add items to cart.");
      } else {
        toast.error(e?.response?.data?.message || "Failed to add to cart");
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-28">
      {/* Header row — same vibe as VehicleCustomer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">
            Browse <span className={gradText}>Accommodations</span>
          </h2>
          <p className="text-sm text-neutral-500">
            Find the perfect stay with the amenities you need.
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
            <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
              placeholder="Search name, type, amenity, price…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid: 2 on md, 3 on lg, 4 on xl — like vehicles */}
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
          filtered.map((a) => {
            const img = a.images?.[0] || "";
            return (
              <article
                key={a._id}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-sm transition"
              >
                {/* Image / Preview */}
                <button
                  className="w-full aspect-[4/3] bg-neutral-50 cursor-pointer"
                  onClick={() => openPreview(a)}
                  title="Quick preview"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={a.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://via.placeholder.com/640x480?text=Accommodation";
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
                      {a.name}
                    </h3>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-neutral-500">Price</div>
                      <div className="font-semibold text-emerald-600">
                        LKR {Number(a.pricePerNight || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <Tag size={12} /> {a.type || "—"}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-neutral-700 pt-1">
                    <span className="inline-flex items-center gap-2">
                      <BedDouble size={16} /> {a.type || "—"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Users2 size={16} /> {a.capacity ?? "—"} guests
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Wallet size={16} /> LKR {Number(a.pricePerNight || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/night
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <StatusPill status={a.status} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900 cursor-pointer"
                      onClick={() => openPreview(a)}
                    >
                      <Eye size={16} />
                      View
                    </button>

                    <button
                      className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 cursor-pointer`}
                      onClick={() => openBookingModal(a)}
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
        <div className="text-center text-neutral-500 py-10">No accommodations found.</div>
      )}

      {/* Booking Modal */}
      {showBookingModal && bookingAccommodation && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowBookingModal(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-[1001] w-full max-w-md rounded-2xl overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Book Accommodation</h3>
              <div className="mb-4 text-sm text-neutral-700">
                <div>
                  <span className="font-medium">{bookingAccommodation.name}</span> ({bookingAccommodation.type || "Accommodation"})
                </div>
                <div className="text-xs text-neutral-500">
                  Price: LKR {Number(bookingAccommodation.pricePerNight || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per night
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Booking Date</label>
                  <input
                    ref={bookingDateRef}
                    type="date"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">No. of Nights</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2"
                    value={bookingNights}
                    onChange={(e) => setBookingNights(Math.max(1, Number(e.target.value)))}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                  onClick={() => setShowBookingModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-xl text-white ${gradBG}`}
                  onClick={handleBookNow}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
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
                alt={active.name}
                className="w-full h-64 object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/800x400?text=Accommodation";
                }}
              />
            )}

            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold">{active.name}</h3>
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Price</div>
                  <div className="font-semibold text-emerald-600">
                    LKR {Number(active.pricePerNight || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="text-sm text-neutral-700 space-y-1">
                <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                  <Tag size={12} /> {active.type || "—"}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="inline-flex items-center gap-2">
                    <BedDouble size={16} /> {active.type || "—"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Users2 size={16} /> {active.capacity ?? "—"} guests
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Wallet size={16} /> LKR {Number(active.pricePerNight || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/night
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <StatusPill status={active.status} />
                  </span>
                </div>
              </div>

              <p className="text-sm text-neutral-700">
                {active.description || "—"}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
                <button
                  className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 inline-flex items-center gap-2 cursor-pointer`}
                  onClick={() => addAccommodationToCart(active)}
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
