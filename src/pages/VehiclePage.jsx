import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import toast from "react-hot-toast";
import Modal from "../components/Modal";
import { confirmToast } from "../components/ConfirmToast";
import StatusPill from "../components/StatusPill";


const EMPTY = {
  vehicleID: "",
  regNo: "",
  brand: "",
  type: "car",
  seatingCapacity: 1,
  fuelType: "petrol",
  status: "active",
  images: [""],
};

const TYPE_OPTS = ["car", "van", "bus", "suv", "jeep", "minibus"];
const FUEL_OPTS = ["petrol", "diesel", "hybrid", "electric"];
const STATUS_OPTS = ["active", "inactive", "under_maintenance"];

export default function VehiclePage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // vehicle or null
  const [form, setForm] = useState(EMPTY);

  const [query, setQuery] = useState("");

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/vehicles");
      setVehicles(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.vehicleID?.toLowerCase().includes(q) ||
        v.regNo?.toLowerCase().includes(q) ||
        v.brand?.toLowerCase().includes(q) ||
        v.type?.toLowerCase().includes(q) ||
        v.fuelType?.toLowerCase().includes(q) ||
        v.status?.toLowerCase().includes(q)
    );
  }, [vehicles, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setIsFormOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({
      vehicleID: v.vehicleID || "",
      regNo: v.regNo || "",
      brand: v.brand || "",
      type: v.type || "car",
      seatingCapacity: v.seatingCapacity || 1,
      fuelType: v.fuelType || "petrol",
      status: v.status || "active",
      images: Array.isArray(v.images) && v.images.length ? v.images : [""],
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "seatingCapacity") {
      setForm((f) => ({ ...f, [name]: Number(value) || 0 }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        images:
          Array.isArray(form.images) && form.images[0]
            ? form.images
            : ["https://placehold.co/800x500/png?text=Vehicle+Image"],
      };

      if (editing) {
        await api.put(`/api/vehicles/${editing.vehicleID}`, payload);
        toast.success("Vehicle updated");
      } else {
        if (!payload.vehicleID || !payload.regNo) {
          toast.error("vehicleID and regNo are required");
          return;
        }
        await api.post("/api/vehicles", payload);
        toast.success("Vehicle created");
      }

      closeForm();
      fetchVehicles();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed");
    }
  };

  const remove = async (vehicleID) => {
  const ok = await confirmToast({
    title: "Delete vehicle?",
    message: `Delete vehicle ${vehicleID}? This cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });
  if (!ok) return;

  try {
    await api.delete(`/api/vehicles/${vehicleID}`);
    toast.success("Vehicle deleted");
    fetchVehicles();
  } catch (e) {
    toast.error(e?.response?.data?.message || "Delete failed");
  }
};

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Vehicles</h1>

        <div className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, reg, brand..."
            className="border rounded px-3 py-2"
          />
          <button
            onClick={openCreate}
            className="bg-black text-white px-4 py-2 rounded"
          >
            + Add Vehicle
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading vehicles...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600">No vehicles found.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full bg-white border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3 border">Vehicle ID</th>
                <th className="text-left p-3 border">Reg No</th>
                <th className="text-left p-3 border">Brand</th>
                <th className="text-left p-3 border">Type</th>
                <th className="text-left p-3 border">Seats</th>
                <th className="text-left p-3 border">Fuel</th>
                <th className="text-left p-3 border">Status</th>
                <th className="text-left p-3 border">Image</th>
                <th className="text-left p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="p-3 border font-mono">{v.vehicleID}</td>
                  <td className="p-3 border">{v.regNo}</td>
                  <td className="p-3 border">{v.brand}</td>
                  <td className="p-3 border">{v.type}</td>
                  <td className="p-3 border">{v.seatingCapacity}</td>
                  <td className="p-3 border">{v.fuelType}</td>
                  <td className="p-3 border capitalize"><StatusPill value={v.status} /></td>
                  <td className="p-3 border">
                    <img
                      src={(v.images && v.images[0]) || "https://placehold.co/120x70/png"}
                      alt={v.vehicleID}
                      className="w-24 h-14 object-cover rounded"
                      onError={(e) => (e.currentTarget.src = "https://placehold.co/120x70/png")}
                    />
                  </td>
                  <td className="p-3 border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(v)}
                        className="px-3 py-1 border rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(v.vehicleID)}
                        className="px-3 py-1 border rounded text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Create/Edit */}
      <Modal
        open={isFormOpen}
        title={editing ? "Edit Vehicle" : "Create Vehicle"}
        onClose={closeForm}
      >
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="mb-1">Vehicle ID *</span>
            <input
              name="vehicleID"
              value={form.vehicleID}
              onChange={onChange}
              className="border rounded px-3 py-2"
              placeholder="V-001"
              disabled={!!editing}
              required
              autoFocus
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Reg No *</span>
            <input
              name="regNo"
              value={form.regNo}
              onChange={onChange}
              className="border rounded px-3 py-2 uppercase"
              placeholder="WP-ABC-1234"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Brand *</span>
            <input
              name="brand"
              value={form.brand}
              onChange={onChange}
              className="border rounded px-3 py-2"
              placeholder="Toyota"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Type *</span>
            <select
              name="type"
              value={form.type}
              onChange={onChange}
              className="border rounded px-3 py-2"
              required
            >
              {TYPE_OPTS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Seating Capacity *</span>
            <input
              type="number"
              min={1}
              name="seatingCapacity"
              value={form.seatingCapacity}
              onChange={onChange}
              className="border rounded px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Fuel Type *</span>
            <select
              name="fuelType"
              value={form.fuelType}
              onChange={onChange}
              className="border rounded px-3 py-2"
              required
            >
              {FUEL_OPTS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Status *</span>
            <select
              name="status"
              value={form.status}
              onChange={onChange}
              className="border rounded px-3 py-2"
              required
            >
              {STATUS_OPTS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col md:col-span-2">
            <span className="mb-1">Image URL (first image used)</span>
            <input
              name="images_0"
              value={form.images?.[0] || ""}
              onChange={(e) =>
                setForm((f) => {
                  const arr = Array.isArray(f.images) ? [...f.images] : [""];
                  arr[0] = e.target.value;
                  return { ...f, images: arr };
                })
              }
              className="border rounded px-3 py-2"
              placeholder="https://placehold.co/800x500/png?text=Vehicle+Image"
            />
          </label>

          <div className="md:col-span-2 flex gap-3 mt-2">
            <button type="submit" className="bg-black text-white px-4 py-2 rounded">
              {editing ? "Update" : "Create"}
            </button>
            <button type="button" onClick={closeForm} className="px-4 py-2 border rounded">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
