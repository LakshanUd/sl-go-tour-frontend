// src/pages/CustomerMeals.jsx
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ShoppingCart, Eye, Search } from "lucide-react";

/* Gradient tokens to match your Header/Footer */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

export default function CustomerMeals() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // simple preview modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await MealsAPI.list();
      setRows(res?.data?.meals || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load meals");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((m) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      (m.name || "").toLowerCase().includes(t) ||
      (m.catogery || "").toLowerCase().includes(t) ||
      String(m.price).includes(t)
    );
  });

  const openPreview = (meal) => {
    setActive(meal);
    setOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">
            <span className={gradText}>Meals</span> for you
          </h2>
          <p className="text-sm text-neutral-500">Freshly prepared options you’ll love.</p>
        </div>

        {/* Search with gradient focus ring like Header.jsx */}
        <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-64 border border-neutral-200 transition-colors group-focus-within:border-transparent">
            <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
              placeholder="Search meals…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
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
          filtered.map((meal) => (
            <article
              key={meal._id}
              className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-sm transition"
            >
              <div className="aspect-[4/3] bg-neutral-50">
                {meal.image ? (
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/640x480?text=No+Image";
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
                  <h3 className="font-semibold text-lg leading-snug">{meal.name}</h3>
                  <span className="font-semibold text-emerald-600">
                    LKR {Number(meal.price).toFixed(2)}
                  </span>
                </div>

                <p className="text-sm text-neutral-600 line-clamp-2">
                  {meal.description || "—"}
                </p>

                <div className="flex items-center justify-between">
                  <span className="inline-block text-xs px-2 py-1 rounded-full border border-neutral-200">
                    {meal.catogery || "—"}
                  </span>
                  <span
                    className={[
                      "text-xs font-medium",
                      meal.avalability ? "text-emerald-600" : "text-rose-600",
                    ].join(" ")}
                  >
                    {meal.avalability ? "Available" : "Unavailable"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
                    onClick={() => openPreview(meal)}
                  >
                    <Eye size={16} />
                    View
                  </button>

                  <button
                    className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 disabled:opacity-50`}
                    disabled={!meal.avalability}
                    onClick={() => toast.success("Added to cart (demo)")}
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
        <div className="text-center text-neutral-500 py-10">No meals found.</div>
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
                  e.currentTarget.src = "https://via.placeholder.com/800x400?text=No+Image";
                }}
              />
            )}
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold">{active?.name}</h3>
                <span className="font-semibold text-emerald-600">
                  LKR {Number(active?.price || 0).toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-neutral-700">
                {active?.description || "—"}
              </p>
              <div className="flex items-center justify-between">
                <span className="inline-block text-xs px-2 py-1 rounded-full border border-neutral-200">
                  {active?.catogery || "—"}
                </span>
                <span
                  className={[
                    "text-xs font-medium",
                    active?.avalability ? "text-emerald-600" : "text-rose-600",
                  ].join(" ")}
                >
                  {active?.avalability ? "Available" : "Unavailable"}
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
                  onClick={() => toast.success("Added to cart (demo)")}
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

/* =======================
   Local "API" (in-memory/localStorage) so this page works immediately.
   Replace with real HTTP calls when backend is ready:
     - GET /api/meals
======================= */
const LS_KEY = "gotour_meals";

function sleep(ms = 200) {
  return new Promise((r) => setTimeout(r, ms));
}

const MealsAPI = {
  async list() {
    await sleep(120);
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // Seed initial data if none exists (keeps CustomerMeals working out-of-the-box)
      const seed = [
        {
          _id: "m1",
          name: "Chicken Kottu",
          description: "Sri Lankan classic with spicy chicken and veggies.",
          catogery: "Sri Lankan",
          price: 1500,
          avalability: true,
          image: "",
        },
        {
          _id: "m2",
          name: "Vegetable Fried Rice",
          description: "Light, fragrant, and loaded with fresh veggies.",
          catogery: "Asian",
          price: 1200,
          avalability: true,
          image: "",
        },
        {
          _id: "m3",
          name: "Iced Coffee",
          description: "Sweet & creamy. Perfect for hot days.",
          catogery: "Beverage",
          price: 750,
          avalability: false,
          image: "",
        },
      ];
      localStorage.setItem(LS_KEY, JSON.stringify(seed));
      return { data: { meals: seed } };
    }
    return { data: { meals: JSON.parse(raw) } };
  },
};
