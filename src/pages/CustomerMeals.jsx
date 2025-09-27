// src/pages/CustomerMeals.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ShoppingCart, Eye, Search, BadgeCheck } from "lucide-react";
import { CartAPI } from "../api/cart";

/* theme tokens */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* backend base */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* normalize meal doc coming from API */
function normalize(m = {}) {
  return {
    _id: m._id,
    name: m.name,
    description: m.description || "",
    catogery: m.catogery, // (spelled like your model)
    price: Number(m.price ?? 0),
    avalability: !!m.avalability,
    image: m.image || "",
  };
}

export default function CustomerMeals() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  async function fetchMeals() {
    // First try /api/meals, then /meals (some codebases mount differently)
    const tryEndpoints = ["/api/meals", "/meals"];
    for (const ep of tryEndpoints) {
      try {
        const res = await api.get(ep);
        const list = Array.isArray(res?.data?.meals) ? res.data.meals : [];
        return list.map(normalize);
      } catch {
        // try next
      }
    }
    throw new Error("Unable to fetch meals from API");
  }

  async function load() {
    try {
      setLoading(true);
      const data = await fetchMeals();
      setRows(data);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to load meals");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.catogery).filter(Boolean));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((m) => {
      const text = [m.name, m.description, m.catogery, String(m.price)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchText = !t || text.includes(t);
      const matchCat = !category || m.catogery === category;
      const matchAvail = !onlyAvailable || m.avalability === true;
      return matchText && matchCat && matchAvail;
    });
  }, [rows, q, category, onlyAvailable]);

  const openPreview = (meal) => {
    setActive(meal);
    setOpen(true);
  };

  async function addMealToCart(meal) {
    if (!meal?.avalability) {
      toast.error("This item is unavailable");
      return;
    }
    try {
      await CartAPI.addItem({
        serviceType: "Meal",
        refId: meal._id,                     // mongo _id ref
        name: meal.name || "Meal",
        image: meal.image || "",
        code: meal.catogery || "",           // optional code / descriptor
        unitPrice: Number(meal.price || 0),
        currency: "LKR",
        qty: 1,
        meta: {
          category: meal.catogery,
          description: meal.description,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">
            <span className={gradText}>Meals</span> for you
          </h2>
          <p className="text-sm text-neutral-500">Freshly prepared options you’ll love.</p>
          <p className="text-[10px] text-neutral-400 mt-1">API: {BASE}/api/meals</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                placeholder="Search meals…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Availability */}
          <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              className="rounded border-neutral-300"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            Only available
          </label>
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="h-[320px] rounded-2xl border border-neutral-200 bg-white overflow-hidden"
            >
              <div className="h-40 bg-neutral-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-40 bg-neutral-100 animate-pulse rounded" />
                <div className="h-3 w-full bg-neutral-100 animate-pulse rounded" />
                <div className="h-3 w-3/4 bg-neutral-100 animate-pulse rounded" />
                <div className="h-9 w-full bg-neutral-100 animate-pulse rounded" />
              </div>
            </div>
          ))}

        {!loading &&
          filtered.map((m) => (
            <article
              key={m._id}
              className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-sm transition"
            >
              <div className="aspect-[4/3] bg-neutral-50">
                {m.image ? (
                  <img
                    src={m.image}
                    alt={m.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/640x480?text=Meal";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    No image
                  </div>
                )}
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-lg leading-snug">{m.name}</h3>
                  <span
                    className={[
                      "text-xs inline-flex items-center gap-1",
                      m.avalability ? "text-emerald-600" : "text-rose-600",
                    ].join(" ")}
                    title={m.avalability ? "Available" : "Unavailable"}
                  >
                    <BadgeCheck size={14} />
                    {m.avalability ? "Available" : "Unavailable"}
                  </span>
                </div>

                <p className="text-sm text-neutral-600 line-clamp-2">
                  {m.description || "—"}
                </p>

                <div className="flex items-center justify-between">
                  <span className="inline-block text-xs px-2 py-1 rounded-full border border-neutral-200">
                    {m.catogery || "—"}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    LKR {m.price.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
                    onClick={() => openPreview(m)}
                  >
                    <Eye size={16} />
                    View
                  </button>

                  <button
                    className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 disabled:opacity-50`}
                    disabled={!m.avalability}
                    onClick={() => addMealToCart(m)}
                  >
                    <ShoppingCart size={16} />
                    Add to Cart
                  </button>
                </div>
              </div>
            </article>
          ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center text-neutral-500 py-10">
          No meals found.
        </div>
      )}

      {/* Preview Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-[1001] w-full max-w-xl rounded-2xl overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {active?.image && (
              <img
                src={active.image}
                alt={active.name}
                className="w-full h-56 object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/800x400?text=Meal";
                }}
              />
            )}
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold">{active?.name}</h3>
                <span
                  className={[
                    "text-xs inline-flex items-center gap-1",
                    active?.avalability ? "text-emerald-600" : "text-rose-600",
                  ].join(" ")}
                >
                  <BadgeCheck size={14} />
                  {active?.avalability ? "Available" : "Unavailable"}
                </span>
              </div>

              <p className="text-sm text-neutral-700">
                {active?.description || "—"}
              </p>

              <div className="flex items-center justify-between">
                <span className="inline-block text-xs px-2 py-1 rounded-full border border-neutral-200">
                  {active?.catogery || "—"}
                </span>
                <span className="font-semibold text-emerald-600">
                  LKR {Number(active?.price || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
                <button
                  className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90`}
                  disabled={!active?.avalability}
                  onClick={() => addMealToCart(active)}
                >
                  <ShoppingCart size={16} />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
