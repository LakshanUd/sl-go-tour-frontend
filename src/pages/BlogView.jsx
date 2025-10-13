// src/pages/BlogView.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ArrowLeft, CalendarDays, User, Tag, Clock, Share2 } from "lucide-react";

/* gradient tokens */
const gradFrom = "from-[#09E65A]";
const gradTo = "to-[#16A34A]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* backend base */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
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

export default function BlogView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchOne() {
    // try /api/blogs/:id first; fall back to /blogs/:id if needed
    const endpoints = [`/api/blogs/${id}`, `/blogs/${id}`];
    for (const ep of endpoints) {
      try {
        const res = await api.get(ep);
        // accept either {blog} or raw doc
        const doc = res?.data?.blog || res?.data;
        if (doc && (doc._id || doc.id)) return normalize(doc);
      } catch {
        /* try next */
      }
    }
    throw new Error("Blog not found");
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const b = await fetchOne();
        if (alive) setBlog(b);
      } catch (e) {
        toast.error(e?.response?.data?.message || e?.message || "Failed to load blog");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const readingMins = useMemo(() => {
    const words = String(blog?.content || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }, [blog]);

  return (
    <div className="min-h-screen pt-24">
      {/* Content container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <div className="rounded-2xl bg-white shadow-sm border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="p-6 md:p-8 space-y-4">
              <div className="h-7 w-2/3 bg-neutral-100 animate-pulse rounded" />
              <div className="h-4 w-1/2 bg-neutral-100 animate-pulse rounded" />
              <div className="h-4 w-1/3 bg-neutral-100 animate-pulse rounded" />
              <div className="h-32 bg-neutral-100 animate-pulse rounded" />
            </div>
          ) : !blog ? (
            <div className="p-6 text-neutral-600">Blog not found.</div>
          ) : (
            <>
              {/* Horizontal image box (not hero) */}
              {blog.image && (
                <div className="w-full aspect-[16/9] bg-neutral-100 border-b border-neutral-100">
                  <img
                    src={blog.image}
                    alt={blog.title}
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/1200x675?text=Blog"; }}
                  />
                </div>
              )}

              {/* Title block */}
              <div className="p-6 md:p-8 border-b border-neutral-100">
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                  <span className={gradText}>{blog.title}</span>
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {blog.author}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {(blog.publishedDate || blog.createdAt)
                      ? new Date(blog.publishedDate || blog.createdAt).toLocaleString()
                      : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {readingMins} min read
                  </span>
                </div>

                {!!(blog.tags && blog.tags.length) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {blog.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-neutral-200"
                      >
                        <Tag className="h-3.5 w-3.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Article content */}
              <article className="p-6 md:p-8 prose prose-neutral max-w-none">
                {String(blog.content || "")
                  .split(/\n{2,}/)
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
              </article>

              {/* Footer actions */}
              <div className="px-6 md:px-8 pb-8 flex items-center justify-between">
                <button
                  onClick={() => nav(-1)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard?.writeText(url).then(
                      () => toast.success("Link copied!"),
                      () => toast.error("Failed to copy link")
                    );
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 cursor-pointer`}
                >
                  <Share2 size={16} /> Share
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
