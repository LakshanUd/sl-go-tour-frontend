
// src/pages/AccommodationPage.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import toast from "react-hot-toast";
import Modal from "../components/Modal";
import { confirmToast } from "../components/ConfirmToast";
import { BedDouble, MapPin, IndianRupee, Images, Tags, CheckCircle2, XCircle } from "lucide-react";

/* ---------- constants ---------- */
const API = "/api/accommodations"; // change to "/api/accommodation" if your backend uses singular

const EMPTY = {
  name: "",
  type: "Hotel",
  pricePerNight: 0,
  capacity: 1,
  facilities: [],
  description: "",
  images: [""],
  availabilityStatus: "Available",
};

const TYPE_OPTS = ["Hotel", "Villa", "Apartment", "Guest House", "Hostel", "Resort", "Homestay"];
const FACILITY_OPTS = ["WiFi", "Pool", "Parking", "AC", "Breakfast", "Spa", "Gym", "Restaurant"];
const STATUS_OPTS = ["Available", "Fully Booked", "Temporarily Closed"];

/* ---------- chips ---------- */
function StatusPill({ value }) {
  const map = {
    "Available": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Fully Booked": "bg-rose-50 text-rose-700 border-rose-200",
    "Temporarily Closed": "bg-amber-50 text-amber-700 border-amber-200",
  };
  const Icon = value === "Available" ? CheckCircle2 : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-full ${map[value] || "bg-neutral-100 text-neutral-700 border-neutral-200"}`}>
      <Icon className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}

/* ---------- page ---------- */
export default function AccommodationPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // doc or null
  const [form, setForm] = useState(EMPTY);

  const [query, setQuery] = useState("");

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await api.get(API);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to fetch accommodations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  /* ---------- search ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.name || "").toLowerCase().includes(q) ||
      (r.type || "").toLowerCase().includes(q) ||
      String(r.pricePerNight || "").toLowerCase().includes(q) ||
      (r.availabilityStatus || "").toLowerCase().includes(q) ||
      (Array.isArray(r.facilities) ? r.facilities.join(" ").toLowerCase() : "").includes(q)
    );
  }, [rows, query]);

  /* ---------- modal helpers ---------- */
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setIsFormOpen(true);
  };

  const openEdit = (doc) => {
    setEditing(doc);
    setForm({
      name: doc.name || "",
      type: doc.type || "Hotel",
      pricePerNight: doc.pricePerNight ?? 0,
      capacity: doc.capacity ?? 1,
      facilities: Array.isArray(doc.facilities) ? doc.facilities : [],
      description: doc.description || "",
      images: (Array.isArray(doc.images) && doc.images.length ? doc.images : [""]),
      availabilityStatus: doc.availabilityStatus || "Available",
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
    if (name === "capacity" || name === "pricePerNight") {
      setForm((f) => ({ ...f, [name]: Number(value) || 0 }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const toggleFacility = (fac) => {
    setForm((f) => {
      const set = new Set(f.facilities || []);
      if (set.has(fac)) set.delete(fac);
      else set.add(fac);
      return { ...f, facilities: Array.from(set) };
    });
  };

  /* ---------- save & delete ---------- */
  const save = async (e) => {
    e.preventDefault();
    try {
      // fallback image if nothing provided
      const payload = {
        ...form,
        images:
          Array.isArray(form.images) && form.images[0]
            ? form.images
            : ["https://placehold.co/1200x700/jpg?text=Accommodation"],
      };

      if (!payload.name || !payload.type) {
        toast.error("Name and Type are required");
        return;
      }

      if (editing?._id) {
        await api.put(`${API}/${editing._id}`, payload);
        toast.success("Accommodation updated");
      } else {
        await api.post(API, payload);
        toast.success("Accommodation created");
      }

      closeForm();
      fetchRows();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed");
    }
  };

  const remove = async (id, label = "") => {
    const ok = await confirmToast({
      title: "Delete accommodation?",
      message: `Delete “${label || id}”? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await api.delete(`${API}/${id}`);
      toast.success("Accommodation deleted");
      fetchRows();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="container mx-auto p-6">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BedDouble className="h-6 w-6 text-[#9733EE]" />
          <h1 className="text-3xl font-bold">Accommodation</h1>
        </div>
        <div className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, type, status…"
            className="border rounded px-3 py-2 w-64"
          />
          <button onClick={openCreate} className="bg-black text-white px-4 py-2 rounded">
            + Add Accommodation
          </button>
        </div>
      </div>

      {/* content */}
      {loading ? (
        <p className="text-gray-500">Loading accommodations…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-neutral-600 mb-2">No accommodations found.</p>
          <button onClick={openCreate} className="bg-black text-white px-4 py-2 rounded">
            Create your first accommodation
          </button>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full bg-white border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3 border">Name</th>
                <th className="text-left p-3 border">Type</th>
                <th className="text-left p-3 border">Price / Night</th>
                <th className="text-left p-3 border">Capacity</th>
                <th className="text-left p-3 border">Facilities</th>
                <th className="text-left p-3 border">Status</th>
                <th className="text-left p-3 border">Image</th>
                <th className="text-left p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="p-3 border font-medium">{r.name}</td>
                  <td className="p-3 border">{r.type}</td>
                  <td className="p-3 border">LKR {Number(r.pricePerNight || 0).toLocaleString()}</td>
                  <td className="p-3 border">{r.capacity}</td>
                  <td className="p-3 border">
                    <div className="flex flex-wrap gap-1">
                      {(r.facilities || []).slice(0, 4).map((f) => (
                        <span key={f} className="text-xs px-2 py-0.5 rounded-full border bg-neutral-50">
                          {f}
                        </span>
                      ))}
                      {(r.facilities || []).length > 4 && (
                        <span className="text-xs text-neutral-500">
                          +{r.facilities.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 border">
                    <StatusPill value={r.availabilityStatus} />
                  </td>
                  <td className="p-3 border">
                    <img
                      src={(r.images && r.images[0]) || "https://placehold.co/120x70/jpg"}
                      alt={r.name}
                      className="w-24 h-14 object-cover rounded"
                      onError={(e) => (e.currentTarget.src = "https://placehold.co/120x70/jpg")}
                    />
                  </td>
                  <td className="p-3 border">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(r)} className="px-3 py-1 border rounded">
                        Edit
                      </button>
                      <button
                        onClick={() => remove(r._id, r.name)}
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

      {/* modal */}
      <Modal open={isFormOpen} title={editing ? "Edit Accommodation" : "Create Accommodation"} onClose={closeForm}>
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* name */}
          <label className="flex flex-col">
            <span className="mb-1">Name *</span>
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-[#9733EE]" />
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Ocean View Hotel"
                required
                autoFocus
              />
            </div>
          </label>

          {/* type */}
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
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          {/* price */}
          <label className="flex flex-col">
            <span className="mb-1">Price per Night (LKR) *</span>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-[#9733EE]" />
              <input
                type="number"
                min={0}
                name="pricePerNight"
                value={form.pricePerNight}
                onChange={onChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="12000"
                required
              />
            </div>
          </label>

          {/* capacity */}
          <label className="flex flex-col">
            <span className="mb-1">Room Capacity (people/rooms) *</span>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#9733EE]" />
              <input
                type="number"
                min={1}
                name="capacity"
                value={form.capacity}
                onChange={onChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="4"
                required
              />
            </div>
          </label>

          {/* facilities */}
          <div className="md:col-span-2">
            <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
              <Tags className="h-4 w-4 text-[#9733EE]" /> Facilities / Amenities
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              {FACILITY_OPTS.map((f) => {
                const checked = form.facilities?.includes(f);
                return (
                  <label key={f} className="flex items-center gap-2 text-sm border rounded px-3 py-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!checked}
                      onChange={() => toggleFacility(f)}
                    />
                    {f}
                  </label>
                );
              })}
            </div>
          </div>

          {/* description */}
          <label className="flex flex-col md:col-span-2">
            <span className="mb-1">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              className="border rounded px-3 py-2"
              placeholder="Luxury beachfront hotel with modern amenities…"
            />
          </label>

          {/* status */}
          <label className="flex flex-col">
            <span className="mb-1">Availability Status *</span>
            <select
              name="availabilityStatus"
              value={form.availabilityStatus}
              onChange={onChange}
              className="border rounded px-3 py-2"
              required
            >
              {STATUS_OPTS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          {/* image url (first) */}
          <label className="flex flex-col md:col-span-2">
            <span className="mb-1 inline-flex items-center gap-2">
              <Images className="h-4 w-4 text-[#9733EE]" />
              Image URL (first image used)
            </span>
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
              placeholder="https://example.com/images/room.jpg"
            />
            <small className="text-neutral-500 mt-1">
              You can support multiple images in your schema; UI displays the first one.
            </small>
          </label>

          {/* actions */}
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
