// src/pages/BlogsAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { confirmToast } from "../components/ConfirmToast"; // custom confirm (OK/Cancel)

/* ================= Theme tokens (match Header/Footer) ================= */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

export default function BlogsAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // blog object or null
  const [form, setForm] = useState({
    title: "",
    author: "",
    content: "",
    image: "",
    tags: "",
    publishedDate: "",
  });

  // filters
  const [q, setQ] = useState("");

  const reload = async () => {
    try {
      setLoading(true);
      const data = await fetchBlogs();
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      author: "",
      content: "",
      image: "",
      tags: "",
      publishedDate: "",
    });
    setOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || "",
      author: b.author || "",
      content: b.content || "",
      image: b.image || "",
      tags: (b.tags || []).join(", "),
      publishedDate: b.publishedDate
        ? new Date(b.publishedDate).toISOString().slice(0, 10)
        : "",
    });
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  const submit = async () => {
    const payload = {
      ...form,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      publishedDate: form.publishedDate ? new Date(form.publishedDate) : undefined,
    };

    try {
      if (editing) {
        await updateBlog(editing._id, payload);
        toast.success("Blog updated");
      } else {
        await createBlog(payload);
        toast.success("Blog created");
      }
      await reload();
      closeModal();
    } catch (e) {
      toast.error(e?.message || "Save failed");
    }
  };

  // DELETE with custom confirmation box
  const onDelete = async (id, title) => {
    const ok = await confirmToast({
      title: "Delete blog?",
      message: `Delete “${title || "this blog"}”? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await deleteBlog(id);
      toast.success("Blog deleted");
      setRows((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    }
  };

  const prettyRows = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (!q) return true;
      const hay = `${r.title} ${r.author} ${(r.tags || []).join(", ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });

    return filtered.map((r) => ({
      ...r,
      date: r.publishedDate ? new Date(r.publishedDate).toLocaleDateString() : "-",
      tagsCSV: (r.tags || []).join(", "),
    }));
  }, [rows, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Manage <span className={gradText}>Blogs</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Create, edit, and delete blog posts.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search (gradient ring on focus) */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-64 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                type="text"
                placeholder="Search title, author, tag"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                aria-label="Search blogs"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* New Blog */}
          <button
            onClick={openCreate}
            className={`inline-flex items-center gap-2 rounded-full p-[2px] ${gradBG} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DA22FF]/50 focus-visible:ring-offset-2`}
          >
            <span className={`px-4 py-2 rounded-full text-white ${gradBG}`}>
              <Plus className="h-4 w-4 inline-block mr-1" />
              New Blog
            </span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-neutral-600">Loading…</div>
        ) : prettyRows.length === 0 ? (
          <div className="p-6 text-neutral-500">No blogs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50">
                <tr className="text-left text-neutral-600">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {prettyRows.map((r) => (
                  <tr key={r._id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-3 max-w-[420px]">
                      <div className="truncate font-medium text-neutral-800">{r.title}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{r.author}</td>
                    <td className="px-4 py-3">
                      <TagRow tagsCSV={r.tagsCSV} />
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{r.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-neutral-200 hover:bg-white shadow-sm text-neutral-700"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(r._id, r.title)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-200 hover:bg-white shadow-sm text-red-600"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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
      </div>

      {/* Create / Edit Modal */}
      <Modal open={open} onClose={closeModal}>
        <div className="w-full max-w-3xl">
          <div className={`rounded-2xl p-[1px] ${gradBG} shadow-xl`}>
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                <div className="font-semibold">{editing ? "Edit Blog" : "Create Blog"}</div>
                <button onClick={closeModal} className="p-2 rounded-md hover:bg-neutral-100" aria-label="Close">
                  <X className="h-5 w-5 text-neutral-700" />
                </button>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Enter blog title"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Author</Label>
                    <Input
                      value={form.author}
                      onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                      placeholder="Author name"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Label>Content (HTML or plain text)</Label>
                    <Textarea
                      rows={8}
                      value={form.content}
                      onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                      placeholder="<p>Rich text or plain text here…</p>"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Image URL</Label>
                    <Input
                      value={form.image}
                      onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Published Date</Label>
                    <Input
                      type="date"
                      value={form.publishedDate}
                      onChange={(e) => setForm((f) => ({ ...f, publishedDate: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Label>Tags (comma separated)</Label>
                    <Input
                      value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="travel, sri lanka, tips"
                    />
                    <TagPreview csv={form.tags} />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-5">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                  >
                    Cancel
                  </button>
                  <button onClick={submit} className={`px-4 py-2 rounded-xl text-white ${gradBG}`}>
                    {editing ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- Small UI bits ---------------- */

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

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "placeholder:text-neutral-400 text-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
      ].join(" ")}
    />
  );
}

function TagRow({ tagsCSV }) {
  const tags = (tagsCSV || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (tags.length === 0) return <span className="text-neutral-500">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function TagPreview({ csv }) {
  const arr = (csv || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (arr.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {arr.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/* ---------------- Minimal modal ---------------- */

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-2 sm:p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-[1001]" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ======================= Local API (works without backend) ======================= */
/* Replace with real HTTP calls when your backend is ready:
      - GET    /api/blogs
      - POST   /api/blogs
      - PUT    /api/blogs/:id
      - DELETE /api/blogs/:id
*/
const LS_KEY = "gotour_blogs";

function uid() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function fetchBlogs() {
  await delay(120);
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    const seed = [
      {
        _id: uid(),
        title: "Top 5 Beaches in Sri Lanka",
        author: "Admin",
        content:
          "<p>Discover pristine sands, turquoise waters, and hidden coves across the island.</p>",
        image: "",
        tags: ["beach", "sri lanka", "guide"],
        publishedDate: new Date().toISOString(),
      },
      {
        _id: uid(),
        title: "Ella in 48 Hours",
        author: "Sam",
        content: "<p>Tea trails, Nine Arch Bridge, and panoramic hikes.</p>",
        image: "",
        tags: ["ella", "mountains"],
        publishedDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ];
    localStorage.setItem(LS_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}

async function createBlog(doc) {
  await delay(100);
  const all = await fetchBlogs();
  const _id = uid();
  const payload = {
    _id,
    title: doc.title?.trim() || "Untitled",
    author: doc.author?.trim() || "Admin",
    content: doc.content || "",
    image: doc.image || "",
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    publishedDate: doc.publishedDate ? new Date(doc.publishedDate).toISOString() : new Date().toISOString(),
  };
  const next = [_assignDefaults(payload), ...all];
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  return { _id };
}

async function updateBlog(id, patch) {
  await delay(100);
  const all = await fetchBlogs();
  const idx = all.findIndex((x) => x._id === id);
  if (idx === -1) throw new Error("Blog not found");
  const merged = {
    ...all[idx],
    ...patch,
    tags: Array.isArray(patch.tags) ? patch.tags : all[idx].tags,
    publishedDate: patch.publishedDate
      ? new Date(patch.publishedDate).toISOString()
      : all[idx].publishedDate,
  };
  all[idx] = _assignDefaults(merged);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  return true;
}

async function deleteBlog(id) {
  await delay(80);
  const all = await fetchBlogs();
  const next = all.filter((x) => x._id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  return true;
}

function _assignDefaults(b) {
  return {
    _id: b._id,
    title: b.title || "Untitled",
    author: b.author || "Admin",
    content: b.content || "",
    image: b.image || "",
    tags: Array.isArray(b.tags) ? b.tags : [],
    publishedDate: b.publishedDate || new Date().toISOString(),
  };
}

function delay(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}
