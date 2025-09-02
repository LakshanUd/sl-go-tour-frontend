// src/pages/AdminMeals.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Pencil, Trash2, Plus, X, RefreshCcw, Search } from "lucide-react";
import { confirmToast } from "../components/ConfirmToast"; // re-use your existing confirm toast

const EMPTY = {
  name: "",
  description: "",
  catogery: "",
  price: "",
  avalability: true,
  image: "",
};

export default function AdminMeals() {
  // ===== gradient tokens (match Header.jsx)
  const gradFrom = "from-[#DA22FF]";
  const gradTo = "to-[#9733EE]";
  const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
  const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

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

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(t) ||
        (m.catogery || "").toLowerCase().includes(t) ||
        String(m.price).includes(t)
    );
  }, [rows, q]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  async function openEdit(id) {
    try {
      const res = await MealsAPI.get(id);
      const doc = res?.data?.meals || {};
      setForm({
        name: doc.name || "",
        description: doc.description || "",
        catogery: doc.catogery || "",
        price: doc.price ?? "",
        avalability: !!doc.avalability,
        image: doc.image || "",
      });
      setEditingId(id);
      setMode("edit");
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load meal");
    }
  }

  // delete with custom hot-toast confirmation
  async function onDelete(id, name) {
    const ok = await confirmToast({
      title: "Delete meal?",
      message: `Delete "${name || id}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await MealsAPI.remove(id);
      toast.success("Meal deleted");
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.catogery.trim() || !String(form.price).trim()) {
      toast.error("Name, Category, Price are required");
      return;
    }
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        avalability: !!form.avalability,
      };

      if (mode === "create") {
        await MealsAPI.create(payload);
        toast.success("Meal created");
      } else {
        await MealsAPI.update(editingId, payload);
        toast.success("Meal updated");
      }
      setOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Save failed");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Title row with gradient accent + search like Header.jsx */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight">
            <span className={gradText}>Admin</span> · Meals
          </h2>
          <p className="text-sm text-neutral-500">Create, edit, and delete meals</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search with gradient focus ring (mirrors Header.jsx desktop search) */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-56 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                placeholder="Search name/category…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>

          {/* New button with gradient background like Header admin avatar active */}
          <button
            onClick={openCreate}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-90 active:opacity-80`}
          >
            <Plus size={16} />
            New Meal
          </button>
        </div>
      </div>

      {/* Table card with subtle gradient border frame */}
      <div className={`rounded-2xl p-[1px] ${gradBG}`}>
        <div className="rounded-[14px] bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <span className="text-sm font-medium text-neutral-700">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} meals`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="text-left p-3">Meal</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Price (LKR)</th>
                  <th className="text-left p-3">Available</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  filtered.map((m) => (
                    <tr key={m._id} className="border-t">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                            <img
                              src={m.image || "https://via.placeholder.com/64x48?text=%E2%80%94"}
                              alt={m.name}
                              className="h-full w-full object-cover"
                              onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/64x48?text=%E2%80%94")}
                            />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-800">{m.name}</div>
                            <div className="text-neutral-500 line-clamp-2 max-w-[38ch]">
                              {m.description || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{m.catogery || "—"}</td>
                      <td className="p-3">{Number(m.price).toFixed(2)}</td>
                      <td className="p-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            m.avalability
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                              : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
                          ].join(" ")}
                        >
                          {m.avalability ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                            onClick={() => openEdit(m._id)}
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            className="px-2 py-1 rounded-lg border border-neutral-200 text-rose-600 bg-white hover:bg-neutral-50"
                            onClick={() => onDelete(m._id, m.name)}
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-neutral-500" colSpan={5}>
                      No meals found.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td className="p-8 text-center text-neutral-500" colSpan={5}>
                      Loading meals…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal (Create/Edit) — gradient frame */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-xl rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <h3 className="font-semibold">{mode === "create" ? "Create Meal" : "Edit Meal"}</h3>
                <button className="p-2 rounded-lg hover:bg-neutral-100" onClick={() => setOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={onSubmit} className="p-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-neutral-600">Name *</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Chicken Kottu"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm text-neutral-600">Category *</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.catogery}
                      onChange={(e) => setForm((f) => ({ ...f, catogery: e.target.value }))}
                      placeholder="Sri Lankan / Fast Food / Drinks"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm text-neutral-600">Price (LKR) *</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="1500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm text-neutral-600">Availability</label>
                    <select
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.avalability ? "true" : "false"}
                      onChange={(e) => setForm((f) => ({ ...f, avalability: e.target.value === "true" }))}
                    >
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm text-neutral-600">Image URL</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.image}
                      onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                      placeholder="https://…"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm text-neutral-600">Description</label>
                    <textarea
                      rows={4}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Short description…"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-90 active:opacity-80`}>
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

/* =======================
   Local "API" (in-memory/localStorage) so this page works immediately.
   Replace with real HTTP calls when backend is ready:
     - GET    /api/meals
     - GET    /api/meals/:id
     - POST   /api/meals
     - PUT    /api/meals/:id
     - DELETE /api/meals/:id
======================= */

const LS_KEY = "gotour_meals";

function sleep(ms = 250) {
  return new Promise((r) => setTimeout(r, ms));
}

const MealsAPI = {
  async list() {
    await sleep(200);
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
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

  async get(id) {
    await sleep(120);
    const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    const found = list.find((x) => x._id === id);
    if (!found) throw new Error("Meal not found");
    return { data: { meals: found } };
  },

  async create(body) {
    await sleep(150);
    const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    const _id = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const item = {
      _id,
      name: body.name,
      description: body.description || "",
      catogery: body.catogery || "",
      price: Number(body.price) || 0,
      avalability: !!body.avalability,
      image: body.image || "",
    };
    list.unshift(item);
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    return { data: { meal: item } };
  },

  async update(id, body) {
    await sleep(150);
    const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    const idx = list.findIndex((x) => x._id === id);
    if (idx === -1) throw new Error("Meal not found");
    list[idx] = {
      ...list[idx],
      name: body.name ?? list[idx].name,
      description: body.description ?? list[idx].description,
      catogery: body.catogery ?? list[idx].catogery,
      price: typeof body.price === "number" ? body.price : Number(body.price ?? list[idx].price),
      avalability: typeof body.avalability === "boolean" ? body.avalability : !!list[idx].avalability,
      image: body.image ?? list[idx].image,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    return { data: { meal: list[idx] } };
  },

  async remove(id) {
    await sleep(120);
    const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    const next = list.filter((x) => x._id !== id);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    return { ok: true };
  },
};
