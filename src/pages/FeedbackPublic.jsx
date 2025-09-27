// src/pages/FeedbackPublic.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster } from "react-hot-toast";
import { Search, RefreshCcw, Star, Quote, User } from "lucide-react";

/* ---- Theme ---- */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ---- API base ---- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

export default function FeedbackPublic() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // search & filter
  const [q, setQ] = useState("");
  const [ratingFilter, setRatingFilter] = useState(""); // "", "1"..."5"
  const [sort, setSort] = useState("newest"); // newest|oldest|rating_desc|rating_asc

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/feedbacks");
      const arr = Array.isArray(res?.data) ? res.data : (res?.data?.feedbacks || []);
      setRows(arr);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows.filter((f) => {
      const matchText =
        !t ||
        [f.name, f.email, f.message].filter(Boolean).join(" ").toLowerCase().includes(t);
      const matchRating = !ratingFilter || String(f.rating) === String(ratingFilter);
      return matchText && matchRating;
    });

    out = out.sort((a, b) => {
      if (sort === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sort === "oldest") return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sort === "rating_desc") return (b.rating || 0) - (a.rating || 0);
      if (sort === "rating_asc") return (a.rating || 0) - (b.rating || 0);
      return 0;
    });

    return out;
  }, [rows, q, ratingFilter, sort]);

  const avg = useMemo(() => {
    if (!rows.length) return 0;
    const s = rows.reduce((n, r) => n + Number(r.rating || 0), 0);
    return (s / rows.length).toFixed(2);
  }, [rows]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Traveler <span className={gradText}>Feedback</span>
          </h1>
          <p className="text-sm text-neutral-600">
            Real reviews shared by our users. Read-only for everyone.
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Average rating: <span className="font-medium text-neutral-700">{rows.length ? `${avg} / 5` : "—"}</span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
              <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                placeholder="Search name / email / message…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Rating filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          >
            <option value="">All ratings</option>
            {[5,4,3,2,1].map((n) => (
              <option key={n} value={n}>{n} star{n>1?"s":""}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="rating_desc">Rating: High → Low</option>
            <option value="rating_asc">Rating: Low → High</option>
          </select>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <article key={`sk-${i}`} className="rounded-2xl border bg-white p-4">
              <div className="h-4 w-32 bg-neutral-100 animate-pulse rounded mb-3" />
              <div className="h-3 w-2/3 bg-neutral-100 animate-pulse rounded mb-2" />
              <div className="h-3 w-4/5 bg-neutral-100 animate-pulse rounded mb-2" />
              <div className="h-3 w-1/2 bg-neutral-100 animate-pulse rounded" />
            </article>
          ))}

        {!loading && filtered.map((f) => (
          <FeedbackCard key={f._id} fb={f} />
        ))}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border bg-white p-8 text-center text-neutral-500">
            No feedback to show.
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({ fb }) {
  const when = fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : "";
  return (
    <article className="rounded-2xl border bg-white p-4 hover:shadow-sm transition">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full grid place-items-center text-white ${gradBG}`}>
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">{fb.name || "Anonymous"}</div>
            <div className="text-xs text-neutral-500">{when}</div>
          </div>
        </div>
        <StarRow value={Number(fb.rating) || 0} />
      </div>

      <blockquote className="mt-3 text-sm text-neutral-700">
        <Quote className="inline h-4 w-4 mr-1 text-neutral-400" />
        <span className="align-middle">{fb.message || "—"}</span>
      </blockquote>
    </article>
  );
}

function StarRow({ value = 0 }) {
  const n = Math.max(0, Math.min(5, Number(value)));
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={"h-4 w-4 " + (i < n ? "fill-current" : "")} />
      ))}
      <span className="ml-1 text-xs text-neutral-700">{n}/5</span>
    </div>
  );
}
