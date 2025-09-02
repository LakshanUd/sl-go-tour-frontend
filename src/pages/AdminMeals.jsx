import { useEffect, useMemo, useState } from "react";
import { MealsAPI } from "../lib/api";
import { toast } from "react-hot-toast";
import { Pencil, Trash2, Plus, X } from "lucide-react";

const EMPTY = {
  name: "",
  description: "",
  catogery: "",
  price: "",
  avalability: true,
  image: ""
};

export default function AdminMeals() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

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

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(m =>
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
        image: doc.image || ""
      });
      setEditingId(id);
      setMode("edit");
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load meal");
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this meal?")) return;
    try {
      await MealsAPI.remove(id);
      toast.success("Deleted");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.catogery.trim() || !String(form.price).trim()) {
      toast.error("Name, Category, Price are required");
      return;
    }
    try {
      if (mode === "create") {
        await MealsAPI.create({ ...form, price: Number(form.price), avalability: !!form.avalability });
        toast.success("Meal created");
      } else {
        await MealsAPI.update(editingId, { ...form, price: Number(form.price), avalability: !!form.avalability });
        toast.success("Meal updated");
      }
      setOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Admin · Meals</h2>
        <div className="flex items-center gap-2">
          <input
            className="px-3 py-2 rounded-xl border border-gray-200 w-64"
            placeholder="Search by name/category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={openCreate}
          >
            <Plus size={16} /> New Meal
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Meal</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Price (LKR)</th>
              <th className="text-left p-3">Avail.</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m._id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.image || "https://via.placeholder.com/64x48?text=—"}
                      alt={m.name}
                      className="w-16 h-12 rounded object-cover bg-gray-100"
                    />
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-gray-500">{m.description || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">{m.catogery}</td>
                <td className="p-3">{Number(m.price).toFixed(2)}</td>
                <td className="p-3">{m.avalability ? "Yes" : "No"}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <button className="px-2 py-1 rounded-lg border hover:bg-gray-50" onClick={() => openEdit(m._id)}>
                      <Pencil size={18} />
                    </button>
                    <button className="px-2 py-1 rounded-lg border hover:bg-gray-50 text-red-600" onClick={() => onDelete(m._id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="p-6 text-center text-gray-500" colSpan="5">No meals found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal (Create/Edit) */}
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl border shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">{mode === "create" ? "Create Meal" : "Edit Meal"}</h3>
              <button className="p-2 rounded-lg hover:bg-gray-50" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Name *</label>
                  <input
                    className="w-full mt-1 px-3 py-2 rounded-xl border"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Chicken Kottu"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Category *</label>
                  <input
                    className="w-full mt-1 px-3 py-2 rounded-xl border"
                    value={form.catogery}
                    onChange={(e) => setForm(f => ({ ...f, catogery: e.target.value }))}
                    placeholder="Sri Lankan / Fast Food / Drinks"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Price (LKR) *</label>
                  <input
                    type="number"
                    className="w-full mt-1 px-3 py-2 rounded-xl border"
                    value={form.price}
                    onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="1500"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Availability</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border"
                    value={form.avalability ? "true" : "false"}
                    onChange={(e) => setForm(f => ({ ...f, avalability: e.target.value === "true" }))}
                  >
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Image URL</label>
                  <input
                    className="w-full mt-1 px-3 py-2 rounded-xl border"
                    value={form.image}
                    onChange={(e) => setForm(f => ({ ...f, image: e.target.value }))}
                    placeholder="https://…"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Description</label>
                  <textarea
                    rows={4}
                    className="w-full mt-1 px-3 py-2 rounded-xl border"
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Short description…"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {mode === "create" ? "Create" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
