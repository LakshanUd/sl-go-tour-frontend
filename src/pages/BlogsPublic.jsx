// src/pages/BlogsPublic.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { Search, CalendarDays, User, Tag, Eye } from "lucide-react";

/* gradient tokens */
const gradFrom = "from-[#09E65A]";
const gradTo = "to-[#16A34A]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* backend base (env or localhost) */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, ""); // strip trailing slash
const api = axios.create({ baseURL: BASE });

function normalize(b = {}) {
  return {
    _id: b._id,
    title: b.title || "(Untitled)",
    content: b.content || "",
    author: b.author || "Unknown",
    tags: Array.isArray(b.tags) ? b.tags : [],
    image: b.image || "",
    publishedDate: b.publishedDate ? new Date(b.publishedDate) : null,
    createdAt: b.createdAt ? new Date(b.createdAt) : null,
  };
}

export default function BlogsPublic() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/blogs");
      const list = Array.isArray(res?.data?.blogs) ? res.data.blogs : [];
      setRows(list.map(normalize));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load blogs";
      toast.error(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const allTags = useMemo(() => {
    const s = new Set();
    rows.forEach((b) => (b.tags || []).forEach((t) => s.add(t)));
    return Array.from(s);
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((b) => {
      const hay = [b.title, b.content, b.author, ...(b.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchText = !t || hay.includes(t);
      const matchTag = !tag || (b.tags || []).includes(tag);
      return matchText && matchTag;
    });
  }, [rows, q, tag]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-28">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">
            Latest <span className={gradText}>Blogs</span>
          </h1>
          <p className="text-sm text-neutral-500">
            Stories, tips, and updates from our team.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* search */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                placeholder="Search title, author, content…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* tag filter */}
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="h-[360px] rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <div className="h-44 bg-neutral-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-40 bg-neutral-100 animate-pulse rounded" />
                <div className="h-3 w-full bg-neutral-100 animate-pulse rounded" />
                <div className="h-3 w-3/4 bg-neutral-100 animate-pulse rounded" />
                <div className="h-9 w-full bg-neutral-100 animate-pulse rounded" />
              </div>
            </div>
          ))}

        {!loading &&
          filtered.map((b) => (
            <article
              key={b._id}
              className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-sm transition"
            >
              <div className="aspect-[16/9] bg-neutral-50">
                {b.image ? (
                  <img
                    src={b.image}
                    alt={b.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/800x450?text=Blog";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    No image
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-lg leading-snug line-clamp-2">
                  {b.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-neutral-600">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {b.author}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {(b.publishedDate || b.createdAt)
                      ? new Date(b.publishedDate || b.createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>

                <p className="text-sm text-neutral-700 line-clamp-3">
                  {b.content?.replace(/\n+/g, " ") || "—"}
                </p>

                {!!(b.tags && b.tags.length) && (
                  <div className="flex flex-wrap gap-2">
                    {b.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-neutral-200"
                      >
                        <Tag className="h-3.5 w-3.5" />
                        {t}
                      </span>
                    ))}
                    {b.tags.length > 4 && (
                      <span className="text-xs text-neutral-500">
                        +{b.tags.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-1">
                  <Link
                    to={`/blogs/${b._id}`}
                    className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90`}
                  >
                    <Eye size={16} />
                    Read
                  </Link>
                </div>
              </div>
            </article>
          ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center text-neutral-500 py-10">No blogs found.</div>
      )}
    </div>
  );
}
