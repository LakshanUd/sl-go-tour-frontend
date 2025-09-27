// src/pages/VehiclePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Search, RefreshCcw, ArrowLeft } from "lucide-react";
import { confirmToast } from "../components/ConfirmToast";
import MediaUpload from "../utils/mediaUpload";

/* ---------- gradient tokens ---------- */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ---------- API helper (uses .env) ---------- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";

const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

// Attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401/403 handler
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      toast.error(error?.response?.data?.message || "Please log in to continue.");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

const VehicleAPI = {
  list: () => api.get("/api/vehicles"), // returns array
  getByVehicleID: (vehicleID) => api.get(`/api/vehicles/${encodeURIComponent(vehicleID)}`),
  create: (data) => api.post("/api/vehicles", data), // requires Admin
  updateByVehicleID: (vehicleID, data) =>
    api.put(`/api/vehicles/${encodeURIComponent(vehicleID)}`, data), // requires Admin
  removeByVehicleID: (vehicleID) =>
    api.delete(`/api/vehicles/${encodeURIComponent(vehicleID)}`), // requires Admin
};

/* Use vehicleID for URL ops; _id only for display if needed */
const getVehicleID = (v) => v?.vehicleID || v?.productID || v?._id;

/* ---------- empty form ---------- */
const EMPTY = {
  vehicleID: "",
  regNo: "",
  brand: "",
  type: "car",
  seatingCapacity: "",
  fuelType: "petrol",
  status: "active",
  price: "",        // ✅ NEW
  images: "",       // CSV in the form; array when sending
};

export default function VehiclePage() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [editingVehicleID, setEditingVehicleID] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const [file, setFile] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await VehicleAPI.list();
      const body = res?.data ?? [];
      const items = Array.isArray(body) ? body : body.vehicles || body.items || body.data || [];
      setRows(items);
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
        v.productID,
        v._id,
        v.regNo,
        v.brand,
        v.type,
        v.fuelType,
        v.status,
        String(v.seatingCapacity),
        String(v.price), // ✅ search by price
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [rows, q]);

  function openCreate() {
    setMode("create");
    setEditingVehicleID(null);
    setForm(EMPTY);
    setFile(null);
    setOpen(true);
  }

  async function openEdit(row) {
    try {
      const id = getVehicleID(row);
      let doc = row;

      if (row?.vehicleID) {
        try {
          const res = await VehicleAPI.getByVehicleID(row.vehicleID);
          doc = res.data || row;
        } catch {
          // ignore
        }
      }

      setForm({
        vehicleID: doc.vehicleID || "",
        regNo: doc.regNo || "",
        brand: doc.brand || "",
        type: doc.type || "car",
        seatingCapacity: doc.seatingCapacity ?? "",
        fuelType: doc.fuelType || "petrol",
        status: doc.status || "active",
        price: doc.price ?? "", // ✅ NEW
        images: Array.isArray(doc.images) ? doc.images.join(", ") : doc.images || "",
      });
      setEditingVehicleID(doc.vehicleID || id);
      setMode("edit");
      setFile(null);
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load vehicle");
    }
  }

  async function onDelete(row) {
    const vehicleID = row?.vehicleID || getVehicleID(row);
    const ok = await confirmToast({
      title: "Delete vehicle?",
      message: `Delete ${row.regNo || vehicleID || "this vehicle"}? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await VehicleAPI.removeByVehicleID(vehicleID);
      toast.success("Vehicle deleted");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  function isNumber(n) {
    return Number.isFinite(Number(n));
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (!form.vehicleID.trim() || !form.regNo.trim() || !form.brand.trim()) {
      toast.error("vehicleID, regNo, brand are required");
      return;
    }
    if (!form.seatingCapacity || Number(form.seatingCapacity) < 1) {
      toast.error("seatingCapacity must be at least 1");
      return;
    }
    // ✅ validate price
    if (form.price === "" || !isNumber(form.price) || Number(form.price) < 0) {
      toast.error("Price must be a number ≥ 0");
      return;
    }

    try {
      // Upload first (if any)
      let imageUrls = (form.images || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (file) {
        const url = await MediaUpload(file, { bucket: "images", prefix: "vehicles" });
        imageUrls = [url, ...imageUrls];
      }

      const payload = {
        vehicleID: form.vehicleID.trim(),
        regNo: form.regNo.trim().toUpperCase(),
        brand: form.brand.trim(),
        type: form.type,
        seatingCapacity: Number(form.seatingCapacity),
        fuelType: form.fuelType,
        status: form.status,
        price: Number(form.price),      // ✅ send price to backend
        images: imageUrls,
      };

      if (mode === "create") {
        await VehicleAPI.create(payload);
        toast.success("Vehicle created");
      } else {
        await VehicleAPI.updateByVehicleID(editingVehicleID, payload);
        toast.success("Vehicle updated");
      }
      setOpen(false);
      setFile(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || "Save failed");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Back button ABOVE the title */}
      <div className="mb-2">
        <button
          onClick={() => nav(-1)}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Manage <span className={gradText}>Vehicle</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Create, edit, and delete vehicles.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="group">
            <div
              className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-64
                            border border-neutral-200 transition-colors
                            focus-within:border-[#9733EE] focus-within:ring-2 focus-within:ring-[#9733EE]/20"
            >
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                type="text"
                placeholder="Search reg no, brand, type, price…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                aria-label="Search vehicles"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Reload */}
          <button
            onClick={load}
            className="cursor-pointer group inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Reload"
          >
            <RefreshCcw
              className={["h-4 w-4 transition-transform", loading ? "animate-spin" : "group-hover:rotate-180"].join(" ")}
            />
            Reload
          </button>

          {/* New Vehicle */}
          <button
            onClick={openCreate}
            className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-90 active:opacity-80`}
          >
            <Plus size={16} />
            New Vehicle
          </button>

          {/* Report */}
          <Link
            to="/admin/vehicles/report"
            className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-90 active:opacity-80`}
            title="Download PDF report"
          >
            Download Report
          </Link>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <span className="text-sm font-medium text-neutral-700">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} vehicles`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-neutral-600">
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Reg No</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Seats</th>
                <th className="px-4 py-3 font-medium">Fuel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Price (LKR)</th> {/* ✅ NEW */}
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {!loading &&
                filtered.map((v) => {
                  const vehId = v.vehicleID || v.productID || v._id;
                  const img =
                    Array.isArray(v.images) && v.images.length
                      ? v.images[0]
                      : typeof v.images === "string" && v.images
                      ? v.images
                      : "";
                  return (
                    <tr key={vehId} className="hover:bg-neutral-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                            {img ? (
                              <img
                                src={img}
                                alt={v.brand || v.regNo || vehId}
                                className="h-full w-full object-cover"
                                onError={(e) => (e.currentTarget.src = "https://placehold.co/64x48?text=-")}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                                No image
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-neutral-800">{v.brand || "—"}</div>
                            <div className="text-neutral-500 text-xs">ID: {v.vehicleID || vehId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-800">{v.regNo || "—"}</td>
                      <td className="px-4 py-3 text-neutral-800 capitalize">{v.type || "—"}</td>
                      <td className="px-4 py-3 text-neutral-800">{v.seatingCapacity ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-800 capitalize">{v.fuelType || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={v.status} />
                      </td>
                      <td className="px-4 py-3 text-neutral-800">
                        {typeof v.price === "number" ? `LKR ${v.price.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(v)}
                            className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                                      border border-neutral-200 bg-white text-neutral-700
                                      hover:bg-neutral-400 hover:text-white active:bg-neutral-900
                                      transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                            aria-label="Edit"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            onClick={() => onDelete(v)}
                            className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                                      border border-rose-200 bg-white text-rose-600
                                      hover:bg-rose-600 hover:text-white active:bg-rose-700
                                      transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                            aria-label="Delete"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="p-8 text-center text-neutral-500" colSpan={8}>
                    No vehicles found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td className="p-8 text-center text-neutral-500" colSpan={8}>
                    Loading vehicles…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal (smaller & scrollable) */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl rounded-2xl p-[1px] ${gradBG} shadow-2xl`}>
            <div className="rounded-2xl bg-white max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white">
                <div className="font-semibold">{mode === "create" ? "Create Vehicle" : "Edit Vehicle"}</div>
                <button
                  onClick={() => setOpen(false)}
                  className="cursor-pointer p-2 rounded-md hover:bg-neutral-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-neutral-700" />
                </button>
              </div>

              <form onSubmit={onSubmit} className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Vehicle ID *</Label>
                    <Input
                      value={form.vehicleID}
                      onChange={(e) => setForm((f) => ({ ...f, vehicleID: e.target.value }))}
                      placeholder="V-001"
                      required
                    />
                  </div>
                  <div>
                    <Label>Reg No *</Label>
                    <Input
                      value={form.regNo}
                      onChange={(e) => setForm((f) => ({ ...f, regNo: e.target.value.toUpperCase() }))}
                      placeholder="ABC-1234"
                      required
                    />
                  </div>
                  <div>
                    <Label>Brand *</Label>
                    <Input
                      value={form.brand}
                      onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                      placeholder="Toyota"
                      required
                    />
                  </div>

                  <div>
                    <Label>Type *</Label>
                    <Select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      options={["car", "van", "bus", "suv", "jeep", "minibus"]}
                    />
                  </div>
                  <div>
                    <Label>Seats *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.seatingCapacity}
                      onChange={(e) => setForm((f) => ({ ...f, seatingCapacity: e.target.value }))}
                      placeholder="4"
                      required
                    />
                  </div>
                  <div>
                    <Label>Fuel Type *</Label>
                    <Select
                      value={form.fuelType}
                      onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
                      options={["petrol", "diesel", "hybrid", "electric"]}
                    />
                  </div>

                  <div>
                    <Label>Status *</Label>
                    <Select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      options={["active", "inactive", "under_maintenance"]}
                    />
                  </div>

                  {/* ✅ Price (LKR) */}
                  <div>
                    <Label>Price (LKR) *</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="12000"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Upload image (optional)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    {file && <p className="text-xs text-neutral-500 mt-1">Selected: {file.name}</p>}
                  </div>

                  {/* Current images preview in EDIT */}
                  {mode === "edit" && (
                    <div className="md:col-span-3">
                      <Label>Current images</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(form.images || "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt={`vehicle-${i}`}
                              className="w-full h-24 object-cover rounded-lg border"
                              onError={(e) => (e.currentTarget.src = "https://placehold.co/160x96?text=-")}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="cursor-pointer px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`cursor-pointer px-4 py-2 rounded-xl text-white ${gradBG}`}>
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

/* ---------- tiny UI bits ---------- */
function Label({ children }) {
  return <label className="block text-sm font-medium mb-1.5">{children}</label>;
}
function Input(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "placeholder:text-neutral-400 text-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
      ].join(" ")}
    />
  );
}
function Select({ value, onChange, options = [] }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "text-neutral-800 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
      ].join(" ")}
    >
      {options.map((op) => (
        <option key={op} value={op} className="capitalize">
          {op}
        </option>
      ))}
    </select>
  );
}
function StatusPill({ status }) {
  let cls = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ";
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
