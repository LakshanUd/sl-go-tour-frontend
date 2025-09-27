// src/pages/reports/BlogsReportPage.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { ArrowLeft, RefreshCcw, Download, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* Theme */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* API base */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

/* Normalizer */
function norm(b = {}) {
  return {
    id: b._id,
    title: b.title || "—",
    author: b.author || "—",
    tags: Array.isArray(b.tags) ? b.tags : [],
    date: b.publishedDate ? new Date(b.publishedDate) : null,
    content: b.content || "",
    image: b.image || "",
  };
}

/* ----- Helpers: logo & tiny utils ----- */
async function loadSvgAsPngDataUrl(url, outW = 320, outH = 90) {
  const res = await fetch(url, { cache: "no-cache" });
  const svgText = await res.text();
  const svg64 = btoa(unescape(encodeURIComponent(svgText)));
  const svgUrl = "data:image/svg+xml;base64," + svg64;

  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, outW, outH);
  const ratio = Math.min(outW / img.width, outH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (outW - w) / 2;
  const y = (outH - h) / 2;
  ctx.drawImage(img, x, y, w, h);
  return canvas.toDataURL("image/png");
}

function fmtDate(d) {
  try {
    return d ? d.toLocaleDateString() : "—";
  } catch {
    return "—";
  }
}

function monthKey(d) {
  if (!d) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-");
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString(undefined, { month: "short", year: "numeric" });
}

export default function BlogsReportPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [author, setAuthor] = useState("");
  const [tag, setTag] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/blogs");
      const list = Array.isArray(res?.data?.blogs) ? res.data.blogs : [];
      setRows(list.map(norm));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load blogs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    const authorQ = author.trim().toLowerCase();
    const tagQ = tag.trim().toLowerCase();

    return rows
      .filter((r) => (!authorQ ? true : r.author.toLowerCase().includes(authorQ)))
      .filter((r) => (!tagQ ? true : r.tags.some((t) => t.toLowerCase().includes(tagQ))))
      .filter((r) => {
        if (!text) return true;
        return [
          r.title,
          r.author,
          r.tags.join(", "),
          r.content?.slice(0, 400)
        ].join(" ").toLowerCase().includes(text);
      });
  }, [rows, q, author, tag]);

  // ---- Rich stats for the report ----
  const stats = useMemo(() => {
    const n = filtered.length;

    // By author
    const byAuthor = {};
    filtered.forEach((b) => {
      const key = b.author || "—";
      byAuthor[key] = (byAuthor[key] || 0) + 1;
    });
    const authorsArr = Object.entries(byAuthor)
      .sort((a,b)=>b[1]-a[1])
      .map(([name, count]) => ({ name, count, pct: n ? Math.round((count/n)*100) : 0 }));

    // By tag
    const byTag = {};
    filtered.forEach((b) => {
      (b.tags || []).forEach((t) => {
        byTag[t] = (byTag[t] || 0) + 1;
      });
    });
    const tagsArr = Object.entries(byTag)
      .sort((a,b)=>b[1]-a[1])
      .map(([name, count]) => ({ name, count }));

    // Post length stats
    const lengths = filtered.map((b) => (b.content || "").length).sort((a,b)=>a-b);
    const totalLen = lengths.reduce((s,x)=>s+x,0);
    const avgLen = n ? Math.round(totalLen/n) : 0;
    const medLen = n ? (lengths[Math.floor((n-1)/2)] + lengths[Math.ceil((n-1)/2)]) / 2 : 0;

    // Date range
    const dates = filtered.map((b) => b.date).filter(Boolean).sort((a,b)=>a-b);
    const firstDate = dates[0] || null;
    const lastDate  = dates[dates.length-1] || null;

    // Last 6 months histogram
    const now = new Date();
    const monthsKeys = Array.from({length: 6}).map((_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return monthKey(d);
    });
    const byMonth = {};
    monthsKeys.forEach(k => byMonth[k] = 0);
    filtered.forEach((b) => {
      const k = monthKey(b.date);
      if (k in byMonth) byMonth[k] += 1;
    });
    const monthsArr = monthsKeys.map(k => ({ key: k, label: monthLabel(k), count: byMonth[k] }));

    const topAuthors = authorsArr.slice(0,5).map(a=>`${a.name} (${a.count})`);
    const topTags = tagsArr.slice(0,8).map(t=>`${t.name} (${t.count})`);

    return {
      n,
      authorsArr,
      tagsArr,
      monthsArr,
      topAuthors,
      topTags,
      firstDate,
      lastDate,
      avgLen,
      medLen,
      totalLen
    };
  }, [filtered]);

  /* ---------------- Stylish PDF generator (with richer summaries) ---------------- */
  async function generatePDF() {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" }); // 595 x 842
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Load & place logo (from /public)
      let logoDataUrl = null;
      try {
        logoDataUrl = await loadSvgAsPngDataUrl("/mainlogo.svg", 280, 80);
      } catch {
        /* ignore if not found */
      }

      /* ---- HEADER ---- */
      doc.setFillColor(151, 51, 238); // #9733EE
      doc.rect(0, 0, pageW, 70, "F");
      doc.setFillColor(218, 34, 255); // #DA22FF
      doc.rect(0, 70, pageW, 6, "F");

      if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 36, 18, 140, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("Blogs Report", pageW - 36, 38, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 36, 56, { align: "right" });

      /* ---- FILTER CHIPS ---- */
      const chips = [
        q ? `Search: "${q}"` : null,
        author ? `Author: ${author}` : null,
        tag ? `Tag: ${tag}` : null,
      ].filter(Boolean);

      let chipY = 100;
      if (chips.length) {
        doc.setFontSize(11);
        doc.setTextColor(40);
        doc.text("Filters", 36, chipY);
        chipY += 8;
        let x = 36;
        const padX = 8;
        chips.forEach((txt) => {
          const w = doc.getTextWidth(txt) + padX * 2;
          doc.setFillColor(245, 242, 255);
          doc.setDrawColor(220);
          doc.roundedRect(x, chipY, w, 20, 6, 6, "FD");
          doc.setTextColor(90);
          doc.text(txt, x + padX, chipY + 13);
          x += w + 8;
          if (x > pageW - 200) { x = 36; chipY += 26; }
        });
        chipY += 30;
      }

      /* ---- SUMMARY CARDS ---- */
      const cardTop = chips.length ? chipY : 100;
      const cardW = (pageW - 36 - 36 - 16) / 2; // 2 columns
      const cardH = 80;

      function card(x, y, title, value, subtitle) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(230);
        doc.roundedRect(x, y, cardW, cardH, 12, 12, "S");
        doc.setFontSize(11);
        doc.setTextColor(120);
        doc.text(title, x + 14, y + 20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(35);
        doc.setFontSize(18);
        doc.text(String(value), x + 14, y + 44);
        if (subtitle) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(110);
          doc.text(subtitle, x + 14, y + 62);
        }
      }

      card(36, cardTop, "Total Posts", stats.n, "After filters");
      const topAuthorLine = stats.topAuthors[0] ? `Top Author: ${stats.topAuthors[0]}` : "Top Author: —";
      card(36 + cardW + 16, cardTop, "Authors", stats.authorsArr.length, topAuthorLine);

      // Second row of cards: dates & content lengths
      const row2Y = cardTop + cardH + 16;
      const rangeSubtitle =
        stats.firstDate && stats.lastDate
          ? `${fmtDate(stats.firstDate)} – ${fmtDate(stats.lastDate)}`
          : "—";
      card(36, row2Y, "Date Range", stats.firstDate ? "" : "—", rangeSubtitle);

      const lengthSubtitle = `avg ${stats.avgLen} chars • median ${Math.round(stats.medLen)} chars`;
      card(36 + cardW + 16, row2Y, "Content Length", `${stats.totalLen} chars`, lengthSubtitle);

      // Section divider
      let y = row2Y + cardH + 22;
      doc.setDrawColor(230);
      doc.line(36, y, pageW - 36, y);
      y += 22;

      /* ---- SIDE-BY-SIDE SUMMARY TABLES ---- */
      const colGap = 16;
      const colWidth = (pageW - 36 - 36 - colGap) / 2;

      // Left: Posts by Author
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Posts by Author", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: pageW - 36 - colWidth },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Author", "Count", "%"]],
        body: stats.authorsArr.map(a => [a.name, a.count, `${a.pct}%`]),
        theme: "striped",
      });

      // Figure out current Y position to align right table top
      let rightTopY = (doc.lastAutoTable?.finalY || y) - (stats.authorsArr.length ? 0 : 0);

      // Right: Top Tags
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Top Tags", 36 + colWidth + colGap, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36 + colWidth + colGap, right: 36 },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Tag", "Count"]],
        body: stats.tagsArr.map(t => [t.name, t.count]),
        theme: "striped",
      });

      // Next section Y
      y = Math.max(doc.lastAutoTable?.finalY || rightTopY, rightTopY) + 18;

      /* ---- POSTS BY MONTH (last 6 months) ---- */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Posts by Month (Last 6 Months)", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: 36 },
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Month", "Count"]],
        body: stats.monthsArr.map(m => [m.label, m.count]),
        theme: "striped",
        didDrawPage: ({ pageNumber }) => {
          doc.setFontSize(9);
          doc.setTextColor(120);
          const ts = new Date().toLocaleString();
          doc.text(`Generated ${ts}`, 36, pageH - 18);
          doc.text(`Page ${pageNumber}`, pageW - 36, pageH - 18, { align: "right" });
        },
      });

      // After the summaries, add the main summary table of posts
      doc.addPage();

      /* ---- SUMMARY TABLE (Posts list) ---- */
      const topBandH = 56;
      doc.setFillColor(246, 243, 255);
      doc.rect(0, 0, pageW, topBandH, "F");
      if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 36, 14, 110, 30);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(60);
      doc.text("Summary Table", pageW - 36, 36, { align: "right" });

      const summaryBody = filtered.map((b) => [
        b.title,
        b.author,
        fmtDate(b.date),
        b.tags.join(", "),
      ]);

      autoTable(doc, {
        startY: topBandH + 16,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: 240 }, // title
          1: { cellWidth: 110 }, // author
          2: { cellWidth: 70 },  // date
          3: { cellWidth: 110 }, // tags
        },
        head: [["Title", "Author", "Published", "Tags"]],
        body: summaryBody,
        theme: "striped",
        margin: { left: 36, right: 36 },
        didDrawPage: ({ pageNumber }) => {
          doc.setFontSize(9);
          doc.setTextColor(120);
          const ts = new Date().toLocaleString();
          doc.text(`Generated ${ts}`, 36, pageH - 18);
          doc.text(`Page ${pageNumber}`, pageW - 36, pageH - 18, { align: "right" });
        },
      });

      doc.save(`blogs-report-${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate report");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Top */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => nav(-1)}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold">
            Download <span className={gradText}>Blogs</span> Report
          </h1>
          <p className="text-sm text-neutral-500">Filter, preview and export a modern PDF.</p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Backend: <span className="font-mono">{BASE}/api/blogs</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Reload"
          >
            <RefreshCcw className="h-4 w-4" /> Reload
          </button>
          <button
            onClick={generatePDF}
            disabled={loading || !filtered.length}
            className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-95 active:opacity-90`}
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Filters / mini stats */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Search</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="Search title, tags, content…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Author</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="e.g., John"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Tag</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="e.g., travel"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Overview</div>
          <div className="text-sm">
            Shown: <b>{stats.n}</b>
            {stats.topAuthors.length ? (
              <span className="ml-3">Top authors: <b>{stats.topAuthors.join(", ")}</b></span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Preview list */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} blogs`}
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <FileText className="h-4 w-4" />
            Preview of tables to be exported
          </div>
        </div>

        <div className="divide-y">
          {loading && <div className="p-6 text-neutral-500">Loading…</div>}
          {!loading && !filtered.length && <div className="p-6 text-neutral-500">No data</div>}
          {!loading && filtered.slice(0, 12).map((b) => (
            <div key={b.id} className="px-4 py-3 text-sm">
              <div className="font-medium">{b.title}</div>
              <div className="text-xs text-neutral-500">
                {b.author} · {fmtDate(b.date)} · {b.tags.join(", ") || "—"}
              </div>
              <div className="mt-1 text-neutral-700 line-clamp-2">{b.content || "—"}</div>
            </div>
          ))}
          {!loading && filtered.length > 12 && (
            <div className="px-4 py-3 text-xs text-neutral-500">+ {filtered.length - 12} more…</div>
          )}
        </div>
      </div>
    </div>
  );
}
