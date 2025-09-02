import { useEffect, useState } from "react";
import { MealsAPI } from "../lib/api";
import { toast } from "react-hot-toast";
import { ShoppingCart, Eye } from "lucide-react";

export default function CustomerMeals() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  async function load() {
    try {
      const res = await MealsAPI.list();
      setRows(res?.data?.meals || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load meals");
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(m => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      (m.name || "").toLowerCase().includes(t) ||
      (m.catogery || "").toLowerCase().includes(t) ||
      String(m.price).includes(t)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Meals</h2>
        <input
          className="px-3 py-2 rounded-xl border border-gray-200 w-64"
          placeholder="Search meals…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(meal => (
          <div key={meal._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div className="aspect-[4/3] bg-gray-50">
              {meal.image ? (
                <img src={meal.image} alt={meal.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-lg leading-snug">{meal.name}</h3>
                <span className="text-green-600 font-semibold">LKR {Number(meal.price).toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">
                {meal.description || "—"}
              </p>
              <div className="flex items-center justify-between">
                <span className="inline-block text-xs px-2 py-1 rounded-full border border-gray-200">
                  {meal.catogery}
                </span>
                <span className={`text-xs ${meal.avalability ? "text-green-600" : "text-red-500"}`}>
                  {meal.avalability ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm"
                  onClick={() => toast("Preview coming soon")}
                >
                  <Eye size={16} /> View
                </button>
                <button
                  className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={!meal.avalability}
                  onClick={() => toast.success("Added to cart (demo)")}
                >
                  <ShoppingCart size={16} /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-gray-500 py-10">No meals found.</div>
      )}
    </div>
  );
}
