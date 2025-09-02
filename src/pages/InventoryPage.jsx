import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import toast from "react-hot-toast";
import Modal from "../components/Modal";
import { confirmToast } from "../components/ConfirmToast";
import StatusPill from "../components/StatusPill";

// Default empty inventory object
const EMPTY = {
  inventoryID: "",
  name: "",
  type: "Supplies",
  quantity: 0,
  unitCost: 0,
  category: "",
  description: "",
  location: "",
  status: "available",
};

const TYPE_OPTS = ["Supplies", "Equipment", "Tickets", "Food & Beverage"];
const STATUS_OPTS = ["available", "out_of_stock", "reserved"];

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // editing item
  const [form, setForm] = useState(EMPTY);

  const [query, setQuery] = useState("");

  // Fetch inventory from backend
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/inventory");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Search filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.inventoryID?.toLowerCase().includes(q) ||
        i.name?.toLowerCase().includes(q) ||
        i.type?.toLowerCase().includes(q) ||
        i.status?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Form handlers
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setIsFormOpen(true);
  };

  const openEdit = (i) => {
    setEditing(i);
    setForm({
      inventoryID: i.inventoryID || "",
      name: i.name || "",
      type: i.type || "Supplies",
      quantity: i.quantity || 0,
      unitCost: i.unitCost || 0,
      category: i.category || "",
      description: i.description || "",
      location: i.location || "",
      status: i.status || "available",
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
    if (name === "quantity" || name === "unitCost") {
      setForm((f) => ({ ...f, [name]: Number(value) || 0 }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  // Save handler
  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/api/inventory/${editing._id}`, form);
        toast.success("Inventory updated");
      } else {
        if (!form.inventoryID || !form.name) {
          toast.error("Inventory ID and Name are required");
          return;
        }
        await api.post("/api/inventory", form);
        toast.success("Inventory created");
      }
      closeForm();
      fetchItems();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed");
    }
  };

  // Delete handler
  const remove = async (id, label) => {
    const ok = await confirmToast({
      title: "Delete item?",
      message: `Delete ${label}? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await api.delete(`/api/inventory/${id}`);
      toast.success("Inventory deleted");
      fetchItems();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, name, category..."
            className="border rounded px-3 py-2"
          />
          <button
            onClick={openCreate}
            className="bg-black text-white px-4 py-2 rounded"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <p className="text-gray-500">Loading inventory...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600">No inventory items found.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full bg-white border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border text-left">ID</th>
                <th className="p-3 border text-left">Name</th>
                <th className="p-3 border text-left">Type</th>
                <th className="p-3 border text-left">Qty</th>
                <th className="p-3 border text-left">Unit Cost</th>
                <th className="p-3 border text-left">Category</th>
                <th className="p-3 border text-left">Location</th>
                <th className="p-3 border text-left">Status</th>
                <th className="p-3 border text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i._id} className="hover:bg-gray-50">
                  <td className="p-3 border font-mono">{i.inventoryID}</td>
                  <td className="p-3 border">{i.name}</td>
                  <td className="p-3 border">{i.type}</td>
                  <td className="p-3 border">{i.quantity}</td>
                  <td className="p-3 border">${i.unitCost?.toFixed(2)}</td>
                  <td className="p-3 border">{i.category}</td>
                  <td className="p-3 border">{i.location}</td>
                  <td className="p-3 border">
                    <StatusPill value={i.status} />
                  </td>
                  <td className="p-3 border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(i)}
                        className="px-3 py-1 border rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(i._id, i.name)}
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
        title={editing ? "Edit Inventory" : "Create Inventory"}
        onClose={closeForm}
      >
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="mb-1">Inventory ID *</span>
            <input
              name="inventoryID"
              value={form.inventoryID}
              onChange={onChange}
              className="border rounded px-3 py-2"
              placeholder="INV-001"
              disabled={!!editing}
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Name *</span>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              className="border rounded px-3 py-2"
              placeholder="Item name"
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
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Quantity *</span>
            <input
              type="number"
              name="quantity"
              min={0}
              value={form.quantity}
              onChange={onChange}
              className="border rounded px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Unit Cost *</span>
            <input
              type="number"
              step="0.01"
              name="unitCost"
              value={form.unitCost}
              onChange={onChange}
              className="border rounded px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Category</span>
            <input
              name="category"
              value={form.category}
              onChange={onChange}
              className="border rounded px-3 py-2"
              placeholder="Category"
            />
          </label>

          <label className="flex flex-col md:col-span-2">
            <span className="mb-1">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              className="border rounded px-3 py-2"
              placeholder="Describe the item..."
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Location</span>
            <input
              name="location"
              value={form.location}
              onChange={onChange}
              className="border rounded px-3 py-2"
              placeholder="Warehouse / Branch"
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1">Status *</span>
            <select
              name="status"
              value={form.status}
              onChange={onChange}
              className="border rounded px-3 py-2 capitalize"
              required
            >
              {STATUS_OPTS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
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


// import { useEffect, useMemo, useState } from "react";
// import { api } from "../services/api";
// import toast from "react-hot-toast";
// import Modal from "../components/Modal";
// import { confirmToast } from "../components/ConfirmToast";

// const TYPE_OPTS = ["RECEIVE", "ISSUE", "ADJUSTMENT", "TRANSFER"];

// const EMPTY = {
//   // optional: your own public code (not used for API id)
//   inventoryID: "",

//   // model fields
//   item: "",                  // ObjectId string (or your code)
//   type: "RECEIVE",
//   quantity: 0,
//   unitCost: 0,

//   name: "",
//   category: "",
//   description: "",
//   location: "",
//   purchaseDate: "",          // yyyy-mm-dd
//   expiryDate: "",            // yyyy-mm-dd

//   image: ""                  // optional preview image url
// };

// export default function InventoryPage() {
//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [isFormOpen, setIsFormOpen] = useState(false);
//   const [editing, setEditing] = useState(null); // row or null
//   const [form, setForm] = useState(EMPTY);

//   const [query, setQuery] = useState("");

//   // ----- API -----
//   const fetchInventory = async () => {
//     try {
//       setLoading(true);
//       const res = await api.get("/api/inventory");
//       const data = Array.isArray(res.data) ? res.data : [];
//       setRows(data);
//     } catch (e) {
//       toast.error(e?.response?.data?.message || "Failed to fetch inventory");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchInventory();
//   }, []);

//   // ----- Filter -----
//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     if (!q) return rows;
//     return rows.filter((r) =>
//       [
//         r.inventoryID,
//         r.name,
//         r.category,
//         r.type,
//         r.location,
//         r.item
//       ]
//         .filter(Boolean)
//         .some((v) => String(v).toLowerCase().includes(q))
//     );
//   }, [rows, query]);

//   // ----- UI actions -----
//   const openCreate = () => {
//     setEditing(null);
//     setForm(EMPTY);
//     setIsFormOpen(true);
//   };

//   const toInputDate = (val) => {
//     if (!val) return "";
//     const d = new Date(val);
//     if (Number.isNaN(d.getTime())) return "";
//     const yyyy = d.getFullYear();
//     const mm = String(d.getMonth() + 1).padStart(2, "0");
//     const dd = String(d.getDate()).padStart(2, "0");
//     return `${yyyy}-${mm}-${dd}`;
//   };

//   const openEdit = (row) => {
//     setEditing(row);
//     setForm({
//       inventoryID: row.inventoryID || "",
//       item: row.item || "",
//       type: row.type || "RECEIVE",
//       quantity: Number(row.quantity ?? 0),
//       unitCost: Number(row.unitCost ?? 0),
//       name: row.name || "",
//       category: row.category || "",
//       description: row.description || "",
//       location: row.location || "",
//       purchaseDate: toInputDate(row.purchaseDate),
//       expiryDate: toInputDate(row.expiryDate),
//       image: row.image || ""
//     });
//     setIsFormOpen(true);
//   };

//   const closeForm = () => {
//     setIsFormOpen(false);
//     setEditing(null);
//     setForm(EMPTY);
//   };

//   const onChange = (e) => {
//     const { name, value } = e.target;
//     // numeric fields
//     if (name === "quantity" || name === "unitCost") {
//       setForm((f) => ({ ...f, [name]: value === "" ? "" : Number(value) }));
//     } else {
//       setForm((f) => ({ ...f, [name]: value }));
//     }
//   };

//   // ----- Save (Create/Update) -----
//   const save = async (e) => {
//     e.preventDefault();

//     // basic required checks
//     if (!form.item) {
//       toast.error("Item (ObjectId or code) is required");
//       return;
//     }
//     if (!form.name) {
//       toast.error("Name is required");
//       return;
//     }

//     const payload = {
//       item: form.item,
//       type: form.type,
//       quantity: Number(form.quantity) || 0,
//       unitCost: Number(form.unitCost) || 0,
//       name: form.name,
//       category: form.category || undefined,
//       description: form.description || undefined,
//       location: form.location || undefined,
//       purchaseDate: form.purchaseDate || undefined,
//       expiryDate: form.expiryDate || undefined,
//       image: form.image || undefined,
//       // optional: send inventoryID if your schema has it
//       inventoryID: form.inventoryID || undefined
//     };

//     try {
//       if (editing) {
//         // use Mongo _id from the selected row
//         await api.put(`/api/inventory/${editing._id}`, payload); /* id for update/delete */
//         toast.success("Inventory updated");
//       } else {
//         await api.post("/api/inventory", payload);
//         toast.success("Inventory created");
//       }
//       closeForm();
//       fetchInventory();
//     } catch (e) {
//       toast.error(e?.response?.data?.message || "Save failed");
//     }
//   };

//   // ----- Delete -----
//   const removeRow = async (row) => {
//     const ok = await confirmToast({
//       title: "Delete item?",
//       message: `Delete "${row.name}"? This cannot be undone.`,
//       confirmText: "Delete",
//       cancelText: "Cancel",
//     });
//     if (!ok) return;

//     try {
//       await api.delete(`/api/inventory/${row._id}`); /* id for update/delete */
//       toast.success("Deleted");
//       fetchInventory();
//     } catch (e) {
//       toast.error(e?.response?.data?.message || "Delete failed");
//     }
//   };

//   return (
//     <div className="container mx-auto p-6">
//       {/* Header row */}
//       <div className="flex items-center justify-between mb-6">
//         <h1 className="text-3xl font-bold">Inventory</h1>

//         <div className="flex gap-3">
//           <input
//             value={query}
//             onChange={(e) => setQuery(e.target.value)}
//             placeholder="Search by name, type, category…"
//             className="border rounded px-3 py-2"
//           />
//           <button onClick={openCreate} className="bg-black text-white px-4 py-2 rounded">
//             + Add Inventory
//           </button>
//         </div>
//       </div>

//       {/* List */}
//       {loading ? (
//         <p className="text-gray-500">Loading…</p>
//       ) : filtered.length === 0 ? (
//         <p className="text-gray-600">No inventory records.</p>
//       ) : (
//         <div className="overflow-auto">
//           <table className="min-w-full bg-white border rounded">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="text-left p-3 border">Name</th>
//                 <th className="text-left p-3 border">Type</th>
//                 <th className="text-left p-3 border">Qty</th>
//                 <th className="text-left p-3 border">Unit Cost</th>
//                 <th className="text-left p-3 border">Category</th>
//                 <th className="text-left p-3 border">Location</th>
//                 <th className="text-left p-3 border">Purchase</th>
//                 <th className="text-left p-3 border">Expiry</th>
//                 <th className="text-left p-3 border">Item</th>
//                 <th className="text-left p-3 border">Image</th>
//                 <th className="text-left p-3 border">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map((r) => (
//                 <tr key={r._id} className="hover:bg-gray-50">
//                   <td className="p-3 border">{r.name}</td>
//                   <td className="p-3 border">{r.type}</td>
//                   <td className="p-3 border">{r.quantity}</td>
//                   <td className="p-3 border">{Number(r.unitCost ?? 0).toFixed(2)}</td>
//                   <td className="p-3 border">{r.category || "-"}</td>
//                   <td className="p-3 border">{r.location || "-"}</td>
//                   <td className="p-3 border">
//                     {r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString() : "-"}
//                   </td>
//                   <td className="p-3 border">
//                     {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "-"}
//                   </td>
//                   <td className="p-3 border font-mono">{r.item || "-"}</td>
//                   <td className="p-3 border">
//                     <img
//                       src={r.image || "https://placehold.co/120x70/png?text=Item"}
//                       alt={r.name}
//                       className="w-24 h-14 object-cover rounded"
//                       onError={(e) => (e.currentTarget.src = "https://placehold.co/120x70/png?text=Item")}
//                     />
//                   </td>
//                   <td className="p-3 border">
//                     <div className="flex gap-2">
//                       <button onClick={() => openEdit(r)} className="px-3 py-1 border rounded">
//                         Edit
//                       </button>
//                       <button
//                         onClick={() => removeRow(r)}
//                         className="px-3 py-1 border rounded text-red-600"
//                       >
//                         Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal for Create/Edit */}
//       <Modal
//         open={isFormOpen}
//         title={editing ? "Edit Inventory" : "Create Inventory"}
//         onClose={closeForm}
//       >
//         <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <label className="flex flex-col">
//             <span className="mb-1">Item (ObjectId / code) *</span>
//             <input
//               name="item"
//               value={form.item}
//               onChange={onChange}
//               className="border rounded px-3 py-2 font-mono"
//               placeholder="6641fe2e0c2a9a9e2b1afc90"
//               required
//               autoFocus={!editing}
//             />
//           </label>

//           <label className="flex flex-col">
//             <span className="mb-1">Type *</span>
//             <select
//               name="type"
//               value={form.type}
//               onChange={onChange}
//               className="border rounded px-3 py-2"
//               required
//             >
//               {TYPE_OPTS.map((o) => (
//                 <option key={o} value={o}>
//                   {o}
//                 </option>
//               ))}
//             </select>
//           </label>

//           <label className="flex flex-col">
//             <span className="mb-1">Quantity *</span>
//             <input
//               type="number"
//               name="quantity"
//               min={0}
//               value={form.quantity}
//               onChange={onChange}
//               className="border rounded px-3 py-2"
//               required
//             />
//           </label>

//           <label className="flex flex-col">
//             <span className="mb-1">Unit Cost</span>
//             <input
//               type="number"
//               step="0.01"
//               min={0}
//               name="unitCost"
//               value={form.unitCost}
//               onChange={onChange}
//               className="border rounded px-3 py-2"
//             />
//           </label>

//           <label className="flex flex-col">
//             <span className="mb-1">Name *</span>
//             <input
//               name="name"
//               value={form.name}
//               onChange={onChange}
//               className="border rounded px-3 py-2"
//               placeholder="Wireless Mouse"
//               required
//             />
//           </label>

//           <label className="flex flex-col">
//             <span className="mb-1">Category</span>
//             <input
//               name="category"
//               value={form.category}
//               onChange={onChange}
//               className="border rounded px-3 py-2"
//               placeholder="Electronics"
//             />
//           </label>

//           <label className="flex flex-col md:col-span-2">
//             <span className="mb-1">Description</span>
//             <textarea
//               name="description"
//               value={form.description}
//               onChange={onChange}
//               rows={3}
//               className="border rounded px-3 py-2"
//               placeholder="Short description of the item"
//             />
//           </label>

//           <label className="flex flex-col">
//             <span className="mb-1">Location</span>
//             <input
//               name="location"
//               value={form.location}
//               onChange={onChange}
//               className="border rounded px-3 py-2"
//               placeholder="Warehouse A - Shelf 12"
//             />
//           </label>

//           <label className="flex flex-col">
//             <span className="mb-1">Purchase Date</span>
//             <input
//               type="date"
//               name="purchaseDate"
//               value={form.purchaseDate}
//               onChange={onChange}
//               className="border rounded px-3 py-2"
//             />
//           </label>

//           <label className="flex flex-col">
//             <span className="mb-1">Expiry Date</span>
//             <input
//               type="date"
//               name="expiryDate"
//               value={form.expiryDate}
//               onChange={onChange}
//               className="border rounded px-3 py-2"
//             />
//           </label>

//           <label className="flex flex-col md:col-span-2">
//             <span className="mb-1">Image URL (optional)</span>
//             <input
//               name="image"
//               value={form.image}
//               onChange={onChange}
//               className="border rounded px-3 py-2"
//               placeholder="https://placehold.co/800x500/png?text=Item+Image"
//             />
//           </label>

//           <div className="md:col-span-2 flex gap-3 mt-2">
//             <button type="submit" className="bg-black text-white px-4 py-2 rounded">
//               {editing ? "Update" : "Create"}
//             </button>
//             <button type="button" onClick={closeForm} className="px-4 py-2 border rounded">
//               Cancel
//             </button>
//           </div>
//         </form>
//       </Modal>
//     </div>
//   );
// }
